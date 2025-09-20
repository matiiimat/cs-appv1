import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT;
    const dbName = process.env.DB_NAME;
    const nodeEnv = process.env.NODE_ENV;

    return NextResponse.json({
      hasDatabase_URL: !!databaseUrl,
      databaseUrlPrefix: databaseUrl ? databaseUrl.substring(0, 20) + '...' : 'Not set',
      isNeonConnection: databaseUrl ? databaseUrl.includes('neon.tech') : false,
      fallbackConfig: {
        host: dbHost,
        port: dbPort,
        name: dbName
      },
      nodeEnv
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}