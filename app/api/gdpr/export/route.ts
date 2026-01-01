import { type NextRequest, NextResponse } from 'next/server';
import { GDPRModel } from '@/lib/models/gdpr';
import { auth } from '@/lib/auth/server';
import { getOrgAndUserByEmail } from '@/lib/tenant';
import { withRateLimit } from '@/lib/rate-limiter';

/**
 * GDPR Data Export API
 * Article 20 - Right to Data Portability
 *
 * Returns all organization data in JSON format with decrypted PII fields.
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

    // Only admins can export all organization data
    const isAdmin = await GDPRModel.isOrganizationAdmin(organizationId, userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only organization administrators can export data' },
        { status: 403 }
      );
    }

    // Log the export request (for audit purposes)
    console.log(`[GDPR] Data export requested by user ${userId} for organization: ${organizationId}`);

    // Export all data with decrypted PII
    const exportedData = await GDPRModel.exportOrganizationData(organizationId);

    console.log(`[GDPR] Data export completed for organization: ${organizationId}`);

    // Return data as downloadable JSON
    const jsonString = JSON.stringify(exportedData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="data-export-${Date.now()}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.error('[GDPR] Data export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data. Please try again or contact support.' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check export availability
 */
async function getHandler(request: NextRequest) {
  try {
    const { organizationId, userId } = await requireAuth(request);

    // Check if user is admin
    const isAdmin = await GDPRModel.isOrganizationAdmin(organizationId, userId);

    // Get stats about what will be exported
    const stats = await GDPRModel.getOrganizationStats(organizationId);

    return NextResponse.json({
      available: true,
      canExport: isAdmin,
      stats,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.error('[GDPR] Export status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check export status' },
      { status: 500 }
    );
  }
}

// Apply rate limiting: GDPR data export is a sensitive operation
// Using 'auth' rate limit (5 requests per 15 min) to prevent abuse
export const POST = withRateLimit(postHandler, 'auth');
export const GET = withRateLimit(getHandler, 'api');
