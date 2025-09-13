# Database Setup Instructions

## Prerequisites

You need Docker installed to run the local PostgreSQL database. If Docker isn't available, you can:

1. **Install Docker Desktop** (recommended):
   - macOS: https://docs.docker.com/desktop/install/mac-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/

2. **Install PostgreSQL directly**:
   - macOS: `brew install postgresql redis`
   - Windows: Download from https://www.postgresql.org/download/
   - Linux: `sudo apt-get install postgresql redis-server`

## Quick Start with Docker

1. **Start the database**:
   ```bash
   npm run db:up
   ```

2. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

3. **Seed with demo data**:
   ```bash
   npm run db:seed
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## Manual PostgreSQL Setup

If you prefer not to use Docker:

1. **Create database**:
   ```sql
   CREATE DATABASE supportai;
   CREATE USER supportai WITH PASSWORD 'supportai_dev_password';
   GRANT ALL PRIVILEGES ON DATABASE supportai TO supportai;
   ```

2. **Update .env.local** with your PostgreSQL settings:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=supportai
   DB_USER=supportai
   DB_PASSWORD=supportai_dev_password
   ```

3. **Run migrations**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Database Commands

- `npm run db:up` - Start PostgreSQL and Redis containers
- `npm run db:down` - Stop containers
- `npm run db:logs` - View PostgreSQL logs
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed with demo data
- `npm run db:reset` - Reset database (destroy data and recreate)

## Production Setup

For production, use managed services:

### Supabase
```env
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Neon
```env
DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
```

### Railway/Render
```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[dbname]
```

## Security Notes

- The `.env.local` file contains development credentials only
- In production, use proper environment variables
- Each organization has its own encryption key for data isolation
- All PII data is encrypted before storage