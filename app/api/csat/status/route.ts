import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import {
  isCSATTokenValid,
  isValidTokenFormat,
  type CSATMetadata,
} from '@/lib/csat-tokens';
import { withRateLimit } from '@/lib/rate-limiter';

/**
 * GET /api/csat/status?token=xxx
 * Check if a CSAT token is valid (public endpoint, no auth required)
 * Returns consistent responses to prevent information leakage
 */
async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Validate token format (43 chars, base64url)
    if (!isValidTokenFormat(token)) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Find message by CSAT token in metadata
    const result = await db.query<{ metadata: Record<string, unknown> }>(`
      SELECT metadata
      FROM messages
      WHERE metadata->'csat'->>'token' = $1
    `, [token]);

    if (result.rows.length === 0) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    const csatData = result.rows[0].metadata?.csat as CSATMetadata | undefined;

    if (!csatData) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    // Check expiry
    if (!isCSATTokenValid(csatData.expiresAt)) {
      return NextResponse.json({
        valid: false,
        reason: 'expired'
      });
    }

    // Check if already submitted
    if (csatData.rating !== undefined) {
      return NextResponse.json({
        valid: false,
        reason: 'already_submitted',
        rating: csatData.rating
      });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('CSAT status error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Apply rate limiting to prevent token enumeration
export const GET = withRateLimit(getHandler, 'public');
