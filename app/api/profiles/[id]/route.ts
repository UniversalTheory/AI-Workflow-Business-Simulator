/**
 * app/api/profiles/[id]/route.ts
 *
 * API route: /api/profiles/[id]
 *
 * GET    /api/profiles/[id]?type=template  — Load a full profile by ID
 * PUT    /api/profiles/[id]                — Save/update a profile
 * DELETE /api/profiles/[id]?type=custom    — Delete a profile
 *
 * Query param `type` is required for GET and DELETE to locate the correct
 * storage directory. For PUT, the type is read from the request body.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  loadProfile,
  saveProfile,
  deleteProfile,
  exportProfile,
  archiveProfile,
  duplicateProfile,
} from '@/lib/profileStorage';
import { CompanyProfile } from '@/types/profile';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const profileType = searchParams.get('type') as CompanyProfile['profileType'] | null;
    const action = searchParams.get('action'); // 'export' for export mode

    if (!profileType) {
      return NextResponse.json(
        { error: 'Missing required query param: type' },
        { status: 400 }
      );
    }

    // Export mode — returns sanitized JSON string for download
    if (action === 'export') {
      const json = exportProfile(id, profileType);
      if (!json) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${id}.json"`,
        },
      });
    }

    // Standard load
    const profile = loadProfile(id, profileType);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[API /api/profiles/[id] GET]', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json() as CompanyProfile;

    // Ensure the body ID matches the URL parameter
    if (body.id !== id) {
      return NextResponse.json(
        { error: 'Profile ID mismatch between URL and body' },
        { status: 400 }
      );
    }

    const saved = saveProfile(body);
    return NextResponse.json({ profile: saved });
  } catch (error) {
    console.error('[API /api/profiles/[id] PUT]', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const profileType = searchParams.get('type') as CompanyProfile['profileType'] | null;
    const action = searchParams.get('action'); // 'archive' to archive instead of delete

    if (!profileType) {
      return NextResponse.json(
        { error: 'Missing required query param: type' },
        { status: 400 }
      );
    }

    if (action === 'archive') {
      const success = archiveProfile(id, profileType);
      if (!success) {
        return NextResponse.json(
          { error: 'Cannot archive profile (not found or is a built-in template)' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, action: 'archived' });
    }

    const success = deleteProfile(id, profileType);
    if (!success) {
      return NextResponse.json(
        { error: 'Cannot delete profile (not found or is a built-in template)' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, action: 'deleted' });
  } catch (error) {
    console.error('[API /api/profiles/[id] DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const profileType = searchParams.get('type') as CompanyProfile['profileType'] | null;
    const action = searchParams.get('action');

    if (!profileType) {
      return NextResponse.json(
        { error: 'Missing required query param: type' },
        { status: 400 }
      );
    }

    // Duplicate action
    if (action === 'duplicate') {
      const body = await request.json().catch(() => ({}));
      const clone = duplicateProfile(id, profileType, body);

      if (!clone) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      return NextResponse.json({ profile: clone }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[API /api/profiles/[id] POST]', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
