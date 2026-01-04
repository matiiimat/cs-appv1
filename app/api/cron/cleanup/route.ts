import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * Cron job to clean up temporary/expired data
 * Runs daily at 3 AM UTC via Vercel Cron
 *
 * Cleans up:
 * - Expired sessions (Better Auth)
 * - Expired verification tokens (Better Auth)
 * - Activity logs older than 90 days
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  // In production, CRON_SECRET must be set and match
  // In development, allow requests without secret for testing
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured in production');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const results = await db.transaction(async (client) => {
      // 1. Delete expired sessions (Better Auth)
      const sessionsResult = await client.query(
        `DELETE FROM session WHERE "expiresAt" < NOW()`
      );

      // 2. Delete expired verification tokens (Better Auth)
      const verificationsResult = await client.query(
        `DELETE FROM verification WHERE "expiresAt" < NOW()`
      );

      // 3. Delete activity logs older than 90 days
      const activityLogsResult = await client.query(
        `DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL '90 days'`
      );

      return {
        expiredSessions: sessionsResult.rowCount || 0,
        expiredVerifications: verificationsResult.rowCount || 0,
        oldActivityLogs: activityLogsResult.rowCount || 0,
      };
    });

    const totalDeleted =
      results.expiredSessions +
      results.expiredVerifications +
      results.oldActivityLogs;

    console.log('[Cron] Cleanup completed:', results);

    return NextResponse.json({
      success: true,
      deleted: results,
      totalDeleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
