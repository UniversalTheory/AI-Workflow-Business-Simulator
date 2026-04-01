/**
 * app/api/profiles/route.ts
 *
 * API route: /api/profiles
 *
 * GET  /api/profiles             — List all profile summaries (all types)
 * GET  /api/profiles?type=custom — Filter by profileType
 * POST /api/profiles             — Import a profile from JSON body
 *
 * This route wraps the server-side profileStorage service so the
 * browser-side React components can fetch profile data over HTTP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listProfileSummaries, importProfile } from '@/lib/profileStorage';
import { CompanyProfile } from '@/types/profile';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') as CompanyProfile['profileType'] | null;

    const summaries = listProfileSummaries(typeParam ?? undefined);
    return NextResponse.json({ profiles: summaries });
  } catch (error) {
    console.error('[API /api/profiles GET]', error);
    return NextResponse.json(
      { error: 'Failed to load profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const profile = importProfile(body);

    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid profile JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('[API /api/profiles POST]', error);
    return NextResponse.json(
      { error: 'Failed to import profile' },
      { status: 500 }
    );
  }
}
