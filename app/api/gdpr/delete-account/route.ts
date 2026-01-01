import { type NextRequest, NextResponse } from 'next/server';
import { GDPRModel } from '@/lib/models/gdpr';
import { auth } from '@/lib/auth/server';
import { getOrgAndUserByEmail } from '@/lib/tenant';
import { withRateLimit } from '@/lib/rate-limiter';

/**
 * GDPR Account Deletion API
 * Article 17 - Right to Erasure (Right to be Forgotten)
 *
 * Permanently deletes the organization and all associated data.
 * Only organization administrators can perform this action.
 */

async function requireAuth(request: NextRequest): Promise<{ organizationId: string; userId: string }> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    throw new Error('UNAUTHORIZED');
  }
  const orgUser = await getOrgAndUserByEmail(session.user.email);
  if (!orgUser) throw new Error('ORG_NOT_FOUND');
  return orgUser;
}

async function postHandler(request: NextRequest) {
  try {
    const { organizationId, userId } = await requireAuth(request);

    // Only admins can delete the organization
    const isAdmin = await GDPRModel.isOrganizationAdmin(organizationId, userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only organization administrators can delete the account' },
        { status: 403 }
      );
    }

    // Parse request body for confirmation
    const body = await request.json().catch(() => ({}));
    const { confirmDelete } = body;

    if (confirmDelete !== true) {
      return NextResponse.json(
        { error: 'Deletion confirmation required. Set confirmDelete: true in request body.' },
        { status: 400 }
      );
    }

    // Log the deletion request (for audit purposes)
    console.log(`[GDPR] Account deletion requested by user ${userId} for organization: ${organizationId}`);

    // Get stats before deletion for logging
    const stats = await GDPRModel.getOrganizationStats(organizationId);

    // Perform the deletion
    await GDPRModel.deleteOrganization(organizationId);

    console.log(`[GDPR] Account deletion completed for organization: ${organizationId}. Deleted ${stats.messageCount} messages, ${stats.userCount} users.`);

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
      deletedAt: new Date().toISOString(),
      stats: {
        messagesDeleted: stats.messageCount,
        usersDeleted: stats.userCount,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.error('[GDPR] Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check deletion eligibility and get stats
 */
async function getHandler(request: NextRequest) {
  try {
    const { organizationId, userId } = await requireAuth(request);

    const isAdmin = await GDPRModel.isOrganizationAdmin(organizationId, userId);
    const stats = await GDPRModel.getOrganizationStats(organizationId);

    return NextResponse.json({
      canDelete: isAdmin,
      reason: isAdmin ? null : 'Only organization administrators can delete the account',
      stats,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.error('[GDPR] Deletion status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check deletion status' },
      { status: 500 }
    );
  }
}

// Apply rate limiting: Account deletion is the most sensitive operation
// Using 'auth' rate limit (5 requests per 15 min) to prevent abuse
export const POST = withRateLimit(postHandler, 'auth');
export const GET = withRateLimit(getHandler, 'api');
