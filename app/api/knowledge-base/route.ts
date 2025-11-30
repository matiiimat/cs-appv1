import { type NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth/server';
import { getOrgAndUserByEmail } from '@/lib/tenant';
import {
  KnowledgeBaseStorage,
  CreateKnowledgeBaseEntrySchema,
  type KnowledgeBaseEntry
} from '@/lib/knowledge-base';

async function requireAuth(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    throw new Error('UNAUTHORIZED');
  }
  const orgUser = await getOrgAndUserByEmail(session.user.email);
  if (!orgUser) throw new Error('ORG_NOT_FOUND');
  return orgUser;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search')?.split(',').filter(Boolean) || undefined;

    let entries: KnowledgeBaseEntry[];

    if (category || search) {
      entries = KnowledgeBaseStorage.findRelevantEntries(category, search);
    } else {
      entries = KnowledgeBaseStorage.getAll();
    }

    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    console.error('Error fetching knowledge base entries:', error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge base entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Note: Knowledge base operations are now handled client-side with localStorage
  // This endpoint is kept for future PostgreSQL migration
  try {
    await requireAuth(request);

    return NextResponse.json({
      message: "Knowledge base operations are currently handled client-side"
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    console.error('Error in knowledge base API:', error);
    return NextResponse.json(
      { error: "API error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth(request);

    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }

    const updatedEntry = KnowledgeBaseStorage.update(id, updates);

    if (!updatedEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    console.error('Error updating knowledge base entry:', error);
    return NextResponse.json(
      { error: "Failed to update knowledge base entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }

    const deleted = KnowledgeBaseStorage.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    console.error('Error deleting knowledge base entry:', error);
    return NextResponse.json(
      { error: "Failed to delete knowledge base entry" },
      { status: 500 }
    );
  }
}