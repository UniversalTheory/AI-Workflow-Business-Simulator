/**
 * engine/simulationEngine.ts
 *
 * Simulation Engine — orchestrates Full Day simulation mode.
 *
 * A Full Day simulation generates a realistic sequence of business events
 * spread across a simulated business day, mimicking actual event timing
 * patterns (morning rush, lunchtime spike, end-of-day wrap-up).
 *
 * Two playback modes:
 *   - "instant"    : All events generated at once and delivered to the UI.
 *   - "realtime"   : Events dispatched on a timer, spacing them out over
 *                    a configurable simulated-day duration (default: 2 minutes
 *                    of wall-clock time = a full 10-hour business day).
 *
 * The engine reads from each event type's `frequency` config:
 *   - perDay { min, max }       — how many of this event type per simulated day
 *   - timeRange { earliest, latest } — business hours for this event type
 *   - peakHours []              — hours where events cluster (higher density)
 *
 * Usage:
 *   const plan = buildDayPlan(profile);           // Create the event schedule
 *   const events = executePlanInstant(profile, plan); // Run all at once
 *   // OR
 *   executePlanRealtime(profile, plan, onEvent, onComplete, speedMultiplier);
 */

import { CompanyProfile, EventType } from '@/types/profile';
import { GeneratedEvent, generateEvent } from './eventGenerator';
import { randInt } from '@/config/fieldGenerators';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A scheduled event in the day plan.
 * The simulated time is a fraction of the business day (0.0 = open, 1.0 = close).
 */
export interface ScheduledEvent {
  /** Fractional position in the business day (0.0 - 1.0). */
  dayFraction: number;
  /** Simulated wall-clock time string, e.g. "09:45". */
  simulatedTime: string;
  eventType: EventType;
}

/** A complete day plan — sorted list of events to generate and when. */
export type DayPlan = ScheduledEvent[];

/** Callbacks for realtime simulation. */
export interface RealtimeCallbacks {
  /** Called each time an event is generated. */
  onEvent: (event: GeneratedEvent, simulatedTime: string, progress: number) => void;
  /** Called when the full day simulation completes. */
  onComplete: (events: GeneratedEvent[]) => void;
  /** Called if the simulation is cancelled. */
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Business day configuration
// ---------------------------------------------------------------------------

/** Default business hours: 7 AM to 6 PM. */
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 18;
const DAY_HOURS = DAY_END_HOUR - DAY_START_HOUR;

/** Default realtime playback: 2 minutes of wall-clock = full simulated day. */
const DEFAULT_REALTIME_DURATION_MS = 2 * 60 * 1000;

// ---------------------------------------------------------------------------
// Day plan builder
// ---------------------------------------------------------------------------

/**
 * Convert an "HH:MM" string to a fractional day position (0.0 - 1.0).
 * Based on the DAY_START_HOUR and DAY_HOURS constants.
 */
function timeToDayFraction(timeStr: string): number {
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const totalMinutes = (hour - DAY_START_HOUR) * 60 + minute;
  return Math.max(0, Math.min(1, totalMinutes / (DAY_HOURS * 60)));
}

/**
 * Convert a day fraction back to a simulated time string "HH:MM".
 */
function dayFractionToTime(fraction: number): string {
  const totalMinutes = Math.round(fraction * DAY_HOURS * 60);
  const hour = DAY_START_HOUR + Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
}

/**
 * Pick a random day fraction within the event type's time range,
 * weighted toward peak hours if any are configured.
 */
function pickEventTime(eventType: EventType): number {
  const { timeRange, peakHours } = eventType.frequency;

  const earliest = timeToDayFraction(timeRange.earliest);
  const latest = timeToDayFraction(timeRange.latest);

  // ~60% chance: pick a time near a peak hour
  if (peakHours.length > 0 && Math.random() < 0.6) {
    const peakHour = peakHours[Math.floor(Math.random() * peakHours.length)];
    // Within ±45 minutes of the peak hour
    const peakFraction = timeToDayFraction(`${String(peakHour).padStart(2, '0')}:00`);
    const jitter = (Math.random() - 0.5) * (75 / (DAY_HOURS * 60)); // ±37.5 min
    return Math.max(earliest, Math.min(latest, peakFraction + jitter));
  }

  // Otherwise: uniform random within time range
  return earliest + Math.random() * (latest - earliest);
}

/**
 * Build a full-day event schedule from a company profile.
 * Determines how many of each event type to generate and assigns each a time slot.
 *
 * Returns a sorted array of ScheduledEvent objects (earliest first).
 */
export function buildDayPlan(profile: CompanyProfile): DayPlan {
  const scheduled: ScheduledEvent[] = [];

  for (const eventType of profile.eventTypes) {
    const { perDay } = eventType.frequency;
    const count = randInt(perDay.min, perDay.max);

    for (let i = 0; i < count; i++) {
      const dayFraction = pickEventTime(eventType);
      scheduled.push({
        dayFraction,
        simulatedTime: dayFractionToTime(dayFraction),
        eventType,
      });
    }
  }

  // Sort chronologically
  return scheduled.sort((a, b) => a.dayFraction - b.dayFraction);
}

/**
 * Get summary stats for a day plan before executing it.
 * Used by the UI to show "Simulating X events across Y event types".
 */
export function getDayPlanStats(plan: DayPlan): {
  totalEvents: number;
  byEventType: Record<string, number>;
  firstEvent: string;
  lastEvent: string;
} {
  const byType: Record<string, number> = {};
  for (const item of plan) {
    byType[item.eventType.name] = (byType[item.eventType.name] ?? 0) + 1;
  }
  return {
    totalEvents: plan.length,
    byEventType: byType,
    firstEvent: plan[0]?.simulatedTime ?? '',
    lastEvent: plan[plan.length - 1]?.simulatedTime ?? '',
  };
}

// ---------------------------------------------------------------------------
// Execution: instant mode
// ---------------------------------------------------------------------------

/**
 * Execute a day plan instantly — generates all events synchronously.
 * Best for testing and for the "instant" speed mode.
 */
export function executePlanInstant(
  profile: CompanyProfile,
  plan: DayPlan
): GeneratedEvent[] {
  return plan.map((scheduled) =>
    generateEvent(profile, scheduled.eventType)
  );
}

// ---------------------------------------------------------------------------
// Execution: realtime mode
// ---------------------------------------------------------------------------

/**
 * Active realtime simulation handle — allows cancellation.
 */
export interface SimulationHandle {
  cancel: () => void;
  isPaused: () => boolean;
  pause: () => void;
  resume: () => void;
}

/**
 * Execute a day plan in realtime — dispatches events over time via callbacks.
 *
 * @param profile            The active company profile.
 * @param plan               The sorted day plan from buildDayPlan().
 * @param callbacks          onEvent, onComplete, onCancel handlers.
 * @param durationMs         Total wall-clock time for the simulation (default: 2 min).
 *
 * @returns SimulationHandle  Call .cancel() to abort the simulation.
 */
export function executePlanRealtime(
  profile: CompanyProfile,
  plan: DayPlan,
  callbacks: RealtimeCallbacks,
  durationMs: number = DEFAULT_REALTIME_DURATION_MS
): SimulationHandle {
  const generated: GeneratedEvent[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;
  let paused = false;
  // Track pause state for each scheduled event (simplified: pause just prevents new events)

  // Schedule each event at its proportional time within durationMs
  plan.forEach((scheduled, index) => {
    const delayMs = scheduled.dayFraction * durationMs;

    const timer = setTimeout(() => {
      if (cancelled || paused) return;

      const event = generateEvent(profile, scheduled.eventType);
      generated.push(event);

      const progress = (index + 1) / plan.length;
      callbacks.onEvent(event, scheduled.simulatedTime, progress);

      // Last event triggers onComplete
      if (index === plan.length - 1) {
        callbacks.onComplete(generated);
      }
    }, delayMs);

    timers.push(timer);
  });

  // Handle edge case: empty plan
  if (plan.length === 0) {
    setTimeout(() => callbacks.onComplete([]), 0);
  }

  return {
    cancel: () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      callbacks.onCancel?.();
    },
    isPaused: () => paused,
    pause: () => { paused = true; },
    resume: () => { paused = false; },
  };
}

// ---------------------------------------------------------------------------
// Speed multiplier helpers
// ---------------------------------------------------------------------------

/**
 * Convert a UI speed setting (1x-10x) to a realtime duration in ms.
 * 1x = 2 minutes (default), 10x = 12 seconds.
 */
export function speedToDuration(speedMultiplier: number): number {
  return Math.round(DEFAULT_REALTIME_DURATION_MS / speedMultiplier);
}

/**
 * Pre-defined speed options for the speed slider UI.
 */
export const SPEED_OPTIONS = [
  { label: '1×', multiplier: 1,  durationMs: speedToDuration(1)  },
  { label: '2×', multiplier: 2,  durationMs: speedToDuration(2)  },
  { label: '5×', multiplier: 5,  durationMs: speedToDuration(5)  },
  { label: '10×', multiplier: 10, durationMs: speedToDuration(10) },
  { label: 'Instant', multiplier: Infinity, durationMs: 0 },
] as const;
