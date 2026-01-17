import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database';
import {
  isCSATTokenValid,
  TOKEN_LENGTH,
  TOKEN_REGEX,
  CSAT_FEEDBACK_MAX_LENGTH,
  type CSATMetadata,
} from '@/lib/csat-tokens';
import { withRateLimit } from '@/lib/rate-limiter';

const SubmitSchema = z.object({
  token: z.string().length(TOKEN_LENGTH).regex(TOKEN_REGEX, 'Invalid token format'),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(CSAT_FEEDBACK_MAX_LENGTH).trim().optional(),
});

/**
 * POST /api/csat/submit
 * Submit a CSAT rating (public endpoint, no auth required)
 * Uses atomic update to prevent race conditions
 */
async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SubmitSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validated.error.issues },
        { status: 400 }
      );
    }

    const { token, rating, feedback } = validated.data;

    // Find message by token and check expiry in a single query
    const findResult = await db.query<{
      id: string;
      organization_id: string;
      metadata: Record<string, unknown>;
    }>(`
      SELECT id, organization_id, metadata
      FROM messages
      WHERE metadata->'csat'->>'token' = $1
    `, [token]);

    if (findResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const message = findResult.rows[0];
    const csatData = message.metadata?.csat as CSATMetadata | undefined;

    if (!csatData) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Validate token expiry
    if (!isCSATTokenValid(csatData.expiresAt)) {
      return NextResponse.json({ error: 'Survey expired' }, { status: 410 });
    }

    // Build updated CSAT metadata
    const updatedCSAT: CSATMetadata = {
      ...csatData,
      rating,
      feedback: feedback || undefined,
      submittedAt: new Date().toISOString(),
    };

    const updatedMetadata = {
      ...message.metadata,
      csat: updatedCSAT,
    };

    // ATOMIC UPDATE: Only update if rating doesn't already exist
    // This prevents race conditions where two concurrent requests both try to submit
    const updateResult = await db.query(`
      UPDATE messages
      SET metadata = $1, updated_at = NOW()
      WHERE id = $2 AND (metadata->'csat'->>'rating') IS NULL
    `, [JSON.stringify(updatedMetadata), message.id]);

    // Check if update actually happened (rowCount = 0 means already submitted)
    if (updateResult.rowCount === 0) {
      // Check if it's the same rating (idempotent success)
      if (csatData.rating === rating) {
        return NextResponse.json({ success: true, message: 'Already submitted' });
      }
      return NextResponse.json(
        { error: 'Rating already submitted' },
        { status: 409 }
      );
    }

    // Log activity (optional - don't fail the request if logging fails)
    try {
      await db.query(`
        INSERT INTO activity_log (organization_id, user_id, message_id, activity_type, details)
        VALUES ($1, NULL, $2, 'csat_submitted', $3)
      `, [
        message.organization_id,
        message.id,
        JSON.stringify({ rating, hasFeedback: !!feedback })
      ]);
    } catch (err) {
      console.error('Failed to log CSAT activity:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CSAT submit error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Apply rate limiting to prevent abuse
export const POST = withRateLimit(postHandler, 'public');
