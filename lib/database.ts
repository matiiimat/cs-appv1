import { Pool, PoolClient, PoolConfig } from 'pg';
import { z } from 'zod';

// Database configuration schema
const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional(),
  max: z.number().int().min(1).max(100).default(20),
  idleTimeoutMillis: z.number().int().min(1000).default(30000),
  connectionTimeoutMillis: z.number().int().min(1000).default(10000),
});

type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    const config = this.parseConfig();
    this.pool = new Pool(config);
    this.setupEventHandlers();
  }

  /**
   * Get singleton instance of database connection
   */
  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Parse and validate database configuration from environment
   */
  private parseConfig(): PoolConfig {
    const rawConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : undefined,
      idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT) : undefined,
      connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT ? parseInt(process.env.DB_CONNECTION_TIMEOUT) : undefined,
    };

    // Parse and validate with zod
    const parsed = DatabaseConfigSchema.parse(rawConfig);

    return {
      ...parsed,
      ssl: rawConfig.ssl,
    };
  }

  /**
   * Setup database event handlers
   */
  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      console.log('🔗 New database client connected');
      this.isConnected = true;
    });

    this.pool.on('error', (err) => {
      console.error('💥 Unexpected database pool error:', err);
      this.isConnected = false;
    });

    this.pool.on('remove', () => {
      console.log('🗑️  Database client removed from pool');
    });

    // Handle process termination
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
  }

  /**
   * Get database pool
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      console.error('Failed to get database client:', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a query with automatic client handling
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute queries within a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const start = Date.now();
      const result = await this.query('SELECT 1 as health_check, NOW() as timestamp');
      const latency = Date.now() - start;

      return {
        healthy: true,
        details: {
          connected: this.isConnected,
          latency: `${latency}ms`,
          timestamp: result.rows[0]?.timestamp,
          poolSize: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingClients: this.pool.waitingCount
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connected: this.isConnected
        }
      };
    }
  }

  /**
   * Gracefully shutdown database connections
   */
  async gracefulShutdown(): Promise<void> {
    console.log('🔄 Shutting down database connections...');
    try {
      await this.pool.end();
      console.log('✅ Database connections closed successfully');
    } catch (error) {
      console.error('❌ Error during database shutdown:', error);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected
    };
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Export types
export type { PoolClient };

// Utility functions for common database operations
export class DatabaseUtils {
  /**
   * Build WHERE clause with tenant isolation
   */
  static buildTenantWhereClause(organizationId: string, additionalConditions?: string): { clause: string; params: any[] } {
    const params = [organizationId];
    let clause = 'organization_id = $1';

    if (additionalConditions) {
      clause += ` AND (${additionalConditions})`;
    }

    return { clause, params };
  }

  /**
   * Add tenant filter to any query
   */
  static addTenantFilter(query: string, organizationId: string): { query: string; params: any[] } {
    const tenantParam = '$' + (query.match(/\$\d+/g)?.length + 1 || 1);

    // Find WHERE clause or add one
    const whereIndex = query.toLowerCase().indexOf('where');
    if (whereIndex !== -1) {
      // Add to existing WHERE clause
      const beforeWhere = query.substring(0, whereIndex + 5);
      const afterWhere = query.substring(whereIndex + 5);
      const modifiedQuery = `${beforeWhere} organization_id = ${tenantParam} AND (${afterWhere})`;
      return { query: modifiedQuery, params: [organizationId] };
    } else {
      // Add new WHERE clause
      const fromIndex = query.toLowerCase().indexOf('from');
      const afterFrom = query.substring(fromIndex);
      const nextClause = afterFrom.match(/(ORDER BY|GROUP BY|HAVING|LIMIT)/i);

      if (nextClause) {
        const insertIndex = fromIndex + afterFrom.indexOf(nextClause[0]);
        const beforeInsert = query.substring(0, insertIndex);
        const afterInsert = query.substring(insertIndex);
        const modifiedQuery = `${beforeInsert} WHERE organization_id = ${tenantParam} ${afterInsert}`;
        return { query: modifiedQuery, params: [organizationId] };
      } else {
        const modifiedQuery = `${query} WHERE organization_id = ${tenantParam}`;
        return { query: modifiedQuery, params: [organizationId] };
      }
    }
  }

  /**
   * Generate next ticket ID for organization
   */
  static async generateTicketId(organizationId: string): Promise<string> {
    const result = await db.query(
      'SELECT generate_ticket_id($1) as ticket_id',
      [organizationId]
    );
    return result.rows[0].ticket_id;
  }

  /**
   * Paginate query results
   */
  static addPagination(query: string, page: number = 1, limit: number = 20): { query: string; offset: number } {
    const offset = (page - 1) * limit;
    const paginatedQuery = `${query} LIMIT ${limit} OFFSET ${offset}`;
    return { query: paginatedQuery, offset };
  }
}