import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  // Security: Only allow debug endpoint in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;
    const nodeEnv = process.env.NODE_ENV;

    // Only expose minimal, safe information even in development
    return NextResponse.json({
      hasDatabase_URL: !!databaseUrl,
      isNeonConnection: databaseUrl ? databaseUrl.includes('neon.tech') : false,
      nodeEnv
    });
  } catch {
    return NextResponse.json({
      error: 'Debug endpoint failed'
    }, { status: 500 });
  }
}