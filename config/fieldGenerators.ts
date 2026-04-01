/**
 * config/fieldGenerators.ts
 *
 * Built-in data generator functions for structured, locale-aware fields.
 *
 * Each generator produces a realistic random value for its field type.
 * All generators read from the active locale config so this file stays
 * locale-agnostic — swapping to a new market only requires changing the
 * locale, not these functions.
 *
 * Generator types (matching FieldDef.generator in types/profile.ts):
 *   grAddress  — a realistic street address in the active locale
 *   grPhone    — a phone number using the locale's area code(s)
 *   fullName   — a first + last name from the locale name pools
 *   bizEmail   — a plausible email address from a name
 *   dateNear   — a date within a configurable range of today
 *
 * Usage:
 *   import { runGenerator } from '@/config/fieldGenerators';
 *   const address = runGenerator('grAddress'); // "1842 Fulton Ave NE, Grand Rapids, MI 49506"
 */

import { activeLocale, LocaleConfig } from './locale';

// ---------------------------------------------------------------------------
// Shared random helpers
// ---------------------------------------------------------------------------

/** Pick a random element from an array. */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick a random integer between min and max (inclusive). */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random float between min and max, rounded to `decimals` places. */
export function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/**
 * Weighted random pick.
 * distribution: { "Low": 30, "Medium": 40, "High": 20, "Emergency": 10 }
 * Returns a key with probability proportional to its weight.
 */
export function weightedPick(distribution: Record<string, number>): string {
  const total = Object.values(distribution).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of Object.entries(distribution)) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  // Fallback to last key (handles floating point edge cases)
  return Object.keys(distribution)[Object.keys(distribution).length - 1];
}

// ---------------------------------------------------------------------------
// Individual generators
// ---------------------------------------------------------------------------

/**
 * grAddress — Generates a realistic street address in the active locale.
 * Format: "1842 Fulton Ave NE, Grand Rapids, MI 49506"
 * Includes occasional directional suffixes (NE, SW, etc.) for realism.
 */
export function generateAddress(locale: LocaleConfig = activeLocale): string {
  const streetNum = randInt(100, 9999);
  const streetName = pick(locale.streetNames);
  const suffix = pick(locale.streetSuffixes);
  const zip = pick(locale.zipCodes);

  // ~40% chance of a directional suffix on the street
  const directionals = ['NE', 'NW', 'SE', 'SW', ''];
  const directionalWeights = [15, 15, 10, 10, 50];
  let directional = '';
  let roll = Math.random() * 100;
  for (let i = 0; i < directionals.length; i++) {
    roll -= directionalWeights[i];
    if (roll <= 0) { directional = directionals[i]; break; }
  }

  const streetPart = directional
    ? `${streetNum} ${streetName} ${suffix} ${directional}`
    : `${streetNum} ${streetName} ${suffix}`;

  return `${streetPart}, ${locale.city}, ${locale.stateAbbr} ${zip}`;
}

/**
 * grPhone — Generates a phone number using the locale's first area code.
 * Format: "616-482-7391"
 */
export function generatePhone(locale: LocaleConfig = activeLocale): string {
  const areaCode = pick(locale.areaCodes);
  const exchange = randInt(200, 999);  // Avoid 0xx and 1xx (non-valid)
  const subscriber = randInt(1000, 9999);
  return `${areaCode}-${exchange}-${subscriber}`;
}

/**
 * fullName — Generates a realistic first + last name from the locale pools.
 * Occasionally generates a two-person name for residential customers ("John & Lisa Patterson").
 * businessName flag: returns a business-style name instead.
 */
export function generateFullName(
  locale: LocaleConfig = activeLocale,
  options: { couple?: boolean } = {}
): string {
  const firstName = pick(locale.firstNames);
  const lastName = pick(locale.lastNames);

  // ~15% chance of couple name when couple generation is allowed
  if (options.couple && Math.random() < 0.15) {
    const partnerFirst = pick(locale.firstNames.filter((n) => n !== firstName));
    return `${firstName} & ${partnerFirst} ${lastName}`;
  }

  return `${firstName} ${lastName}`;
}

/**
 * bizEmail — Generates a plausible email address from a name.
 * Takes an optional name parameter; generates one if not provided.
 * Format variations: john.patterson@gmail.com, jpatterson@outlook.com, etc.
 */
export function generateEmail(
  locale: LocaleConfig = activeLocale,
  name?: string
): string {
  const fullName = name ?? generateFullName(locale);
  // Parse out first/last from the generated name (handles "John & Lisa Patterson" too)
  const parts = fullName.replace(' & ', ' ').split(' ');
  const first = parts[0].toLowerCase().replace(/[^a-z]/g, '');
  const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '');

  const domain = pick(locale.emailDomains);

  // Vary the email format
  const formats = [
    `${first}.${last}`,
    `${first}${last}`,
    `${first[0]}${last}`,
    `${first}.${last}${randInt(1, 99)}`,
    `${last}.${first}`,
  ];

  return `${pick(formats)}@${domain}`;
}

/**
 * dateNear — Generates an ISO date string within a range of today.
 * Default: anywhere from yesterday to 14 days in the future.
 * Used for scheduled dates, preferred appointment dates, event dates, etc.
 */
export function generateDateNear(options: {
  daysBack?: number;
  daysAhead?: number;
} = {}): string {
  const { daysBack = 1, daysAhead = 14 } = options;
  const now = new Date();
  const offsetDays = randInt(-daysBack, daysAhead);
  const result = new Date(now);
  result.setDate(result.getDate() + offsetDays);
  return result.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

/**
 * jobId — Generates a job ID in the format used by a company.
 * e.g. "JOB-2026-0847"
 */
export function generateJobId(prefix = 'JOB'): string {
  const year = new Date().getFullYear();
  const num = String(randInt(1, 9999)).padStart(4, '0');
  return `${prefix}-${year}-${num}`;
}

/**
 * invoiceNumber — Generates an invoice number.
 * e.g. "INV-2026-1042"
 */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const num = String(randInt(100, 9999)).padStart(4, '0');
  return `INV-${year}-${num}`;
}

// ---------------------------------------------------------------------------
// Dispatch: runGenerator
// ---------------------------------------------------------------------------

/**
 * runGenerator — Unified entry point for the event generator engine.
 * Maps a GeneratorType string to the appropriate generator function.
 * Returns the generated value as a string (the event generator will
 * convert to the appropriate type based on the field's dataType).
 */
export function runGenerator(
  generatorType: string,
  locale: LocaleConfig = activeLocale
): string {
  switch (generatorType) {
    case 'grAddress':  return generateAddress(locale);
    case 'grPhone':    return generatePhone(locale);
    case 'fullName':   return generateFullName(locale);
    case 'bizEmail':   return generateEmail(locale);
    case 'dateNear':   return generateDateNear();
    case 'jobId':      return generateJobId();
    case 'invoiceNumber': return generateInvoiceNumber();
    default:
      console.warn(`[fieldGenerators] Unknown generator type: "${generatorType}"`);
      return '';
  }
}
