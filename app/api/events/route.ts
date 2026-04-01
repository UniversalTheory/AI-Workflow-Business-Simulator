/**
 * app/api/events/route.ts
 *
 * API route: /api/events
 *
 * POST /api/events
 *   Body: { profileId, profileType, eventTypeId, count? }
 *   Generates one or more events and returns the data payload(s).
 *   Used by the Event Panel's individual event buttons.
 *
 * POST /api/events?mode=day
 *   Body: { profileId, profileType }
 *   Builds and executes a full-day plan instantly.
 *   Returns all generated events sorted by simulated time.
 *
 * POST /api/events?mode=each
 *   Body: { profileId, profileType }
 *   Generates one of each event type in the profile.
 *   Quick way to preview all event types at once.
 *
 * Note: The simulation engine and content pools run server-side.
 * The client receives the fully-generated event payloads over HTTP.
 * Realtime (timer-based) simulation is handled client-side using the
 * event list returned from mode=day.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadProfile } from '@/lib/profileStorage';
import { CompanyProfile } from '@/types/profile';
import { generateEvent, generateOneOfEach } from '@/engine/eventGenerator';
import { buildDayPlan, executePlanInstant, getDayPlanStats } from '@/engine/simulationEngine';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'day' | 'each' | null (single)

    const body = await request.json() as {
      profileId: string;
      profileType: CompanyProfile['profileType'];
      eventTypeId?: string;
      count?: number;
    };

    const { profileId, profileType, eventTypeId, count = 1 } = body;

    if (!profileId || !profileType) {
      return NextResponse.json(
        { error: 'Missing required fields: profileId, profileType' },
        { status: 400 }
      );
    }

    // Load the full profile (we need event type definitions + content pools)
    const profile = loadProfile(profileId, profileType);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // -----------------------------------------------------------------------
    // Mode: full day simulation
    // -----------------------------------------------------------------------
    if (mode === 'day') {
      const plan = buildDayPlan(profile);
      const events = executePlanInstant(profile, plan);
      const stats = getDayPlanStats(plan);

      return NextResponse.json({
        events,
        stats,
        // Include the day plan so the client can replay in realtime if desired
        plan: plan.map((s) => ({
          dayFraction: s.dayFraction,
          simulatedTime: s.simulatedTime,
          eventTypeId: s.eventType.id,
        })),
      });
    }

    // -----------------------------------------------------------------------
    // Mode: one of each event type
    // -----------------------------------------------------------------------
    if (mode === 'each') {
      const events = generateOneOfEach(profile);
      return NextResponse.json({ events });
    }

    // -----------------------------------------------------------------------
    // Mode: single event type (default)
    // -----------------------------------------------------------------------
    if (!eventTypeId) {
      return NextResponse.json(
        { error: 'Missing required field: eventTypeId (required when mode is not "day" or "each")' },
        { status: 400 }
      );
    }

    const eventType = profile.eventTypes.find((et) => et.id === eventTypeId);
    if (!eventType) {
      return NextResponse.json(
        { error: `Event type "${eventTypeId}" not found in profile` },
        { status: 404 }
      );
    }

    // Generate `count` events (capped at 20 to prevent abuse)
    const clampedCount = Math.min(count, 20);
    const events = Array.from({ length: clampedCount }, () =>
      generateEvent(profile, eventType)
    );

    return NextResponse.json({ events });

  } catch (error) {
    console.error('[API /api/events POST]', error);
    return NextResponse.json({ error: 'Event generation failed' }, { status: 500 });
  }
}
