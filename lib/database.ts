import { Pool, PoolClient, PoolConfig } from 'pg';
import { z } from 'zod';

// Database configuration schema
const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  max: z.number().int().min(1).max(100).default(20),
  idleTimeoutMillis: z.number().int().min(1000).default(30000),
  connectionTimeoutMillis: z.number().int().min(1000).default(10000),
});

// type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>; // Currently unused

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private isConnected: boolean = false;
  private hasEnded: boolean = false;
  private handlersAttached: boolean = false;

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
    const sslConfig = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false;

    // Prefer DATABASE_URL when available (e.g., Vercel/Neon)
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      // For Neon/managed databases, always use SSL regardless of environment
      const isNeonOrManagedDB = connectionString.includes('neon.tech') || connectionString.includes('supabase.co') || connectionString.includes('amazonaws.com');
      const cfg: PoolConfig = {
        connectionString,
        // Neon and other managed databases require SSL
        ssl: isNeonOrManagedDB ? { rejectUnauthorized: true } : sslConfig,
      };

      // Optional pool tuning from env
      if (process.env.DB_POOL_MAX) cfg.max = parseInt(process.env.DB_POOL_MAX);
      if (process.env.DB_IDLE_TIMEOUT) cfg.idleTimeoutMillis = parseInt(process.env.DB_IDLE_TIMEOUT);
      if (process.env.DB_CONNECTION_TIMEOUT) cfg.connectionTimeoutMillis = parseInt(process.env.DB_CONNECTION_TIMEOUT);

      return cfg;
    }

    // Fallback to individual DB_* variables (local/dev)
    const rawConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : undefined,
      idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT) : undefined,
      connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT ? parseInt(process.env.DB_CONNECTION_TIMEOUT) : undefined,
    };

    // Parse and validate with zod
    const parsed = DatabaseConfigSchema.parse(rawConfig);

    return {
      ...parsed,
      ssl: sslConfig,
    };
  }

  /**
   * Setup database event handlers
   */
  private setupEventHandlers(): void {
    if (this.handlersAttached) return;
    this.handlersAttached = true;
    this.pool.on('connect', () => {
      this.isConnected = true;
    });

    this.pool.on('error', (err) => {
      console.error('💥 Unexpected database pool error:', err);
      this.isConnected = false;
    });

    this.pool.on('remove', () => {
      // Connection returned to pool
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
  async query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
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
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    try {
      const start = Date.now();
      const result = await this.query<{ health_check: number; timestamp: string }>('SELECT 1 as health_check, NOW() as timestamp');
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
    try {
      if (this.hasEnded) {
        return;
      }
      this.hasEnded = true;
      await this.pool.end();
    } catch (error) {
      console.error('Database shutdown error:', error);
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
  static buildTenantWhereClause(organizationId: string, additionalConditions?: string): { clause: string; params: unknown[] } {
    const params = [organizationId];
    let clause = 'organization_id = $1';

    if (additionalConditions) {
      clause += ` AND (${additionalConditions})`;
    }

    return { clause, params };
  }

  /**
   * Add tenant filter to any query (DEPRECATED - Security Risk)
   * @deprecated Use buildTenantWhereClause or explicit parameterized queries instead
   * This method is kept for backward compatibility but should not be used for new code
   */
  static addTenantFilter(query: string, organizationId: string): { query: string; params: unknown[] } {
    // Security: Validate that input query comes from a whitelist of safe base queries
    const safeQueries = [
      /^SELECT \* FROM messages$/i,
      /^SELECT .+ FROM messages$/i,
      /^SELECT .+ FROM knowledge_base_entries$/i,
      /^SELECT .+ FROM users$/i,
      /^SELECT .+ FROM organizations$/i
    ];

    const isSafe = safeQueries.some(pattern => pattern.test(query.trim()));
    if (!isSafe) {
      throw new Error('Unsafe query detected - use explicit parameterized queries');
    }

    const matches = query.match(/\$\d+/g);
    const tenantParam = '$' + ((matches?.length ?? 0) + 1);

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
    const result = await db.query<{ ticket_id: string }>(
      'SELECT generate_ticket_id($1) as ticket_id',
      [organizationId]
    );
    return result.rows[0].ticket_id;
  }

  /**
   * Paginate query results (DEPRECATED - Use parameterized pagination)
   * @deprecated Use explicit LIMIT and OFFSET parameters in queries instead
   */
  static addPagination(query: string, page: number = 1, limit: number = 20): { query: string; offset: number } {
    // Security: Validate numeric inputs
    const validatedPage = Math.max(1, Math.floor(Math.abs(page)));
    const validatedLimit = Math.max(1, Math.min(1000, Math.floor(Math.abs(limit)))); // Cap at 1000

    const offset = (validatedPage - 1) * validatedLimit;
    const paginatedQuery = `${query} LIMIT ${validatedLimit} OFFSET ${offset}`;
    return { query: paginatedQuery, offset };
  }
}
