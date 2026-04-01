/**
 * engine/eventGenerator.ts
 *
 * Generic event generator — the core engine of the simulator.
 *
 * Takes a CompanyProfile and an EventType definition and produces a fully
 * randomized, realistic event data payload. This single module replaces
 * the per-company generator files from the original architecture.
 *
 * How it works:
 *   1. Iterates over the EventType's `fields` array
 *   2. For each field, dispatches to the appropriate value generator based
 *      on the field's `dataType` and optional `generator` / `contentPoolRef`
 *   3. Assembles all field values into a typed GeneratedEvent object
 *   4. Adds simulator metadata (id, timestamp, status)
 *
 * Field generation rules (in priority order):
 *   - If field has `generator`: use the named built-in generator (grAddress, etc.)
 *   - If field has `contentPoolRef`: pick from the event type's content pool
 *   - If field has `options` + `distribution`: weighted random pick from options
 *   - If field has `options` (no distribution): uniform random pick
 *   - If field has `range`: random number/currency within range
 *   - Otherwise: generate based on `dataType`
 */

import { CompanyProfile, EventType, FieldDef } from '@/types/profile';
import { runGenerator, pick, randInt, randFloat, weightedPick } from '@/config/fieldGenerators';
import { pickFromPool, buildTrackingKey, clearPoolHistory } from './contentPoolManager';
import { activeLocale } from '@/config/locale';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** Status of a generated event in the simulator pipeline. */
export type EventStatus =
  | 'generated'     // Created, not yet sent
  | 'sending'       // In flight to Airtable / webhook
  | 'sent'          // Successfully delivered
  | 'processing'    // Automation is running
  | 'complete'      // Automation finished, output available
  | 'error';        // Delivery or processing error

/** A fully generated event — the output of the event generator. */
export interface GeneratedEvent {
  /** Unique ID for this event instance (UUID). */
  id: string;
  /** When the event was generated (ISO 8601). */
  timestamp: string;
  /** The profile this event belongs to. */
  profileId: string;
  profileName: string;
  /** The event type definition that produced this event. */
  eventTypeId: string;
  eventTypeName: string;
  eventTypeIcon: string;
  eventCategory: string;
  /** The generated data payload — keys match FieldDef.key values. */
  data: Record<string, unknown>;
  /** Current status in the simulator pipeline. */
  status: EventStatus;
  /** Automation output — populated after the automation runs (Phase 3+). */
  automationOutput?: string;
  automationDescription: string;
}

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Field value generators
// ---------------------------------------------------------------------------

/**
 * Generate a value for a single field definition.
 * Returns the appropriate JS type for the field's dataType.
 */
function generateFieldValue(
  field: FieldDef,
  eventType: EventType,
  profile: CompanyProfile
): unknown {
  // Priority 1: named built-in generator (grAddress, grPhone, fullName, etc.)
  if (field.generator) {
    return runGenerator(field.generator, activeLocale);
  }

  // Priority 2: content pool reference
  if (field.dataType === 'contentPool' && field.contentPoolRef) {
    const pool = eventType.contentPools[field.contentPoolRef] ?? [];
    const trackingKey = buildTrackingKey(profile.id, eventType.id, field.contentPoolRef);
    return pickFromPool(pool, trackingKey);
  }

  // Priority 3: select with weighted distribution
  if (field.distribution && field.options && field.options.length > 0) {
    return weightedPick(field.distribution);
  }

  // Priority 4: select without distribution (uniform)
  if (field.options && field.options.length > 0) {
    if (field.dataType === 'multiselect') {
      // Pick 0-3 random options
      const shuffled = [...field.options].sort(() => Math.random() - 0.5);
      const count = randInt(0, Math.min(3, field.options.length));
      return shuffled.slice(0, count);
    }
    return pick(field.options);
  }

  // Priority 5: range-based number/currency
  if (field.range) {
    if (field.dataType === 'currency') {
      // Round to 2 decimal places for currency
      return randFloat(field.range.min, field.range.max, 2);
    }
    if (field.dataType === 'number') {
      // Integers for whole-number fields; floats for things like hours
      const isWholeNumber = field.range.min % 1 === 0 && field.range.max % 1 === 0;
      return isWholeNumber ? randInt(field.range.min, field.range.max) : randFloat(field.range.min, field.range.max, 1);
    }
  }

  // Priority 6: dataType fallback
  switch (field.dataType) {
    case 'boolean':
      return Math.random() > 0.5;

    case 'date':
      // Default date range: today ± 7 days
      return runGenerator('dateNear', activeLocale);

    case 'time': {
      // Random time in business hours
      const hour = randInt(7, 18);
      const minute = pick(['00', '15', '30', '45']);
      return `${String(hour).padStart(2, '0')}:${minute}`;
    }

    case 'email':
      return runGenerator('bizEmail', activeLocale);

    case 'phone':
      return runGenerator('grPhone', activeLocale);

    case 'address':
      return runGenerator('grAddress', activeLocale);

    case 'text':
    case 'longtext':
      // For fields with no other generator, return empty string
      // (these should always have a generator or contentPoolRef)
      return field.required ? `[${field.label}]` : '';

    case 'number':
      return randInt(1, 100);

    case 'currency':
      return randFloat(10, 1000, 2);

    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Special field overrides
// ---------------------------------------------------------------------------

/**
 * Some fields need special cross-field logic.
 * For example, job_id should be consistent across related fields,
 * and email should match the customer_name when both are present.
 *
 * This function applies post-generation patches to the data payload.
 */
function applyFieldPatches(
  data: Record<string, unknown>,
  eventType: EventType,
  profile: CompanyProfile
): Record<string, unknown> {
  const patched = { ...data };

  // If job_id is present and empty, generate one
  if ('job_id' in patched && !patched.job_id) {
    patched.job_id = runGenerator('jobId', activeLocale);
  }

  // If invoice_number is present and empty, generate one
  if ('invoice_number' in patched && !patched.invoice_number) {
    patched.invoice_number = runGenerator('invoiceNumber', activeLocale);
  }

  // If email is present and customer_name/contact_name is also present,
  // make the email loosely match the name for realism
  const nameKey = 'customer_name' in patched ? 'customer_name'
    : 'contact_name' in patched ? 'contact_name'
    : null;

  if (nameKey && 'email' in patched) {
    const name = String(patched[nameKey] ?? '');
    if (name && !patched.email) {
      const { generateEmail } = require('@/config/fieldGenerators');
      patched.email = generateEmail(activeLocale, name);
    }
  }

  // Ensure days_overdue is a concrete number (not a range string)
  if ('days_overdue' in patched && typeof patched.days_overdue === 'string') {
    const range = patched.days_overdue as string;
    if (range.includes('-')) {
      const [minStr, maxStr] = range.split('-');
      patched.days_overdue = randInt(parseInt(minStr), parseInt(maxStr));
    } else if (range.includes('+')) {
      patched.days_overdue = randInt(parseInt(range), parseInt(range) + 30);
    }
  }

  return patched;
}

// ---------------------------------------------------------------------------
// Main export: generateEvent
// ---------------------------------------------------------------------------

/**
 * Generate a single randomized event from a profile + event type definition.
 *
 * @param profile   The active CompanyProfile.
 * @param eventType The EventType definition to generate from.
 * @returns         A fully populated GeneratedEvent ready for the Event Log.
 */
export function generateEvent(
  profile: CompanyProfile,
  eventType: EventType
): GeneratedEvent {
  // Generate each field
  const rawData: Record<string, unknown> = {};
  for (const field of eventType.fields) {
    rawData[field.key] = generateFieldValue(field, eventType, profile);
  }

  // Apply cross-field patches
  const data = applyFieldPatches(rawData, eventType, profile);

  return {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    profileId: profile.id,
    profileName: profile.name,
    eventTypeId: eventType.id,
    eventTypeName: eventType.name,
    eventTypeIcon: eventType.icon,
    eventCategory: eventType.category,
    data,
    status: 'generated',
    automationDescription: eventType.automationDescription,
  };
}

/**
 * Generate multiple events of a specific type.
 * Useful for batch generation in the Event Panel.
 */
export function generateEvents(
  profile: CompanyProfile,
  eventType: EventType,
  count: number
): GeneratedEvent[] {
  return Array.from({ length: count }, () => generateEvent(profile, eventType));
}

/**
 * Generate one event per event type in a profile.
 * Used for the "Generate All" button — gives a quick snapshot of each type.
 */
export function generateOneOfEach(profile: CompanyProfile): GeneratedEvent[] {
  return profile.eventTypes.map((eventType) => generateEvent(profile, eventType));
}

/**
 * Reset the content pool anti-repeat tracker for a profile.
 * Call this when starting a new simulation session.
 */
export function resetSession(profileId: string): void {
  // Clear all tracking keys that start with this profile's ID
  clearPoolHistory();
}
