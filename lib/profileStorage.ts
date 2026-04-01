/**
 * lib/profileStorage.ts
 *
 * Profile storage service — all CRUD operations for CompanyProfile data.
 *
 * Storage architecture:
 *   /profiles/templates/ — built-in reference companies (ships with the app)
 *   /profiles/custom/    — user-created profiles
 *   /profiles/prospects/ — pre-prospect research profiles
 *   /profiles/archive/   — retired profiles kept for reference
 *
 * This module is intentionally a SERVER-SIDE utility (uses Node.js `fs`).
 * Call it from Next.js API routes or Server Components — never from the browser.
 *
 * All profile files are stored as [profile-id].json in their respective directory.
 * Built-in templates use the "tpl-" ID prefix; custom profiles use UUIDs.
 */

import fs from 'fs';
import path from 'path';
import { CompanyProfile, ProfileSummary } from '@/types/profile';

// ---------------------------------------------------------------------------
// Directory paths
// ---------------------------------------------------------------------------

/** Root of the profiles directory — sibling to /app, /lib, etc.
 *  The turbopackIgnore comment suppresses the NFT (Node File Tracer) warning
 *  that Turbopack emits when it sees dynamic process.cwd() calls.
 *  This is safe — profileStorage only ever runs server-side. */
const PROFILES_ROOT = path.join(/*turbopackIgnore: true*/ process.cwd(), 'profiles');

/** Map from profileType to its storage directory. */
const PROFILE_DIRS: Record<CompanyProfile['profileType'], string> = {
  template: path.join(PROFILES_ROOT, 'templates'),
  custom: path.join(PROFILES_ROOT, 'custom'),
  prospect: path.join(PROFILES_ROOT, 'prospects'),
  archive: path.join(PROFILES_ROOT, 'archive'),
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Ensure all profile directories exist.
 * Called lazily before any disk operation.
 */
function ensureDirectories(): void {
  Object.values(PROFILE_DIRS).forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Build the full file path for a profile given its type and ID.
 */
function profilePath(profileType: CompanyProfile['profileType'], id: string): string {
  return path.join(PROFILE_DIRS[profileType], `${id}.json`);
}

/**
 * Read and parse a single profile JSON file.
 * Returns null if the file doesn't exist or can't be parsed.
 */
function readProfileFile(filePath: string): CompanyProfile | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as CompanyProfile;
  } catch {
    // File missing or malformed — callers handle null gracefully
    return null;
  }
}

/**
 * Project a full CompanyProfile down to a lightweight ProfileSummary.
 * Used for list/card views that don't need full event type definitions or content pools.
 */
function toSummary(profile: CompanyProfile): ProfileSummary {
  return {
    id: profile.id,
    name: profile.name,
    industry: profile.industry,
    profileType: profile.profileType,
    description: profile.description,
    size: profile.size,
    eventTypeCount: profile.eventTypes.length,
    workflowCount: profile.workflows.length,
    metadata: profile.metadata,
  };
}

/**
 * Generate a simple UUID v4.
 * Used for new profile IDs. No external dependency needed.
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a single profile by ID and type.
 * Returns null if not found.
 */
export function loadProfile(
  id: string,
  profileType: CompanyProfile['profileType']
): CompanyProfile | null {
  ensureDirectories();
  const filePath = profilePath(profileType, id);
  return readProfileFile(filePath);
}

/**
 * Load ALL profiles of a given type (or all types if none specified).
 * Returns full CompanyProfile objects — use listProfileSummaries() for card views.
 */
export function loadProfiles(
  profileType?: CompanyProfile['profileType']
): CompanyProfile[] {
  ensureDirectories();

  const types: CompanyProfile['profileType'][] = profileType
    ? [profileType]
    : ['template', 'custom', 'prospect', 'archive'];

  const profiles: CompanyProfile[] = [];

  for (const type of types) {
    const dir = PROFILE_DIRS[type];
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const profile = readProfileFile(path.join(dir, file));
      if (profile) {
        profiles.push(profile);
      }
    }
  }

  // Sort by: templates first, then by updatedAt descending
  return profiles.sort((a, b) => {
    if (a.profileType === 'template' && b.profileType !== 'template') return -1;
    if (a.profileType !== 'template' && b.profileType === 'template') return 1;
    return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
  });
}

/**
 * Load lightweight summaries for all profiles (or a filtered subset).
 * Preferred for the Profile Library card grid — avoids loading content pools.
 */
export function listProfileSummaries(
  profileType?: CompanyProfile['profileType']
): ProfileSummary[] {
  return loadProfiles(profileType).map(toSummary);
}

/**
 * Save a profile to disk.
 * If the profile already exists, it is overwritten.
 * Updates `metadata.updatedAt` automatically.
 */
export function saveProfile(profile: CompanyProfile): CompanyProfile {
  ensureDirectories();

  const updated: CompanyProfile = {
    ...profile,
    metadata: {
      ...profile.metadata,
      updatedAt: new Date().toISOString(),
    },
  };

  const filePath = profilePath(updated.profileType, updated.id);
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');

  return updated;
}

/**
 * Create a brand-new profile from a partial definition.
 * Assigns a new UUID and sets createdAt/updatedAt timestamps.
 * The caller provides everything except id and metadata timestamps.
 */
export function createProfile(
  partial: Omit<CompanyProfile, 'id' | 'metadata'> & {
    metadata?: Partial<CompanyProfile['metadata']>;
  }
): CompanyProfile {
  const now = new Date().toISOString();
  const id = generateId();

  const profile: CompanyProfile = {
    ...partial,
    id,
    metadata: {
      createdAt: now,
      updatedAt: now,
      createdBy: partial.metadata?.createdBy ?? 'user',
      tags: partial.metadata?.tags ?? [],
      notes: partial.metadata?.notes ?? '',
      isTemplate: partial.metadata?.isTemplate ?? false,
      lastSimulationDate: null,
    },
  };

  return saveProfile(profile);
}

/**
 * Duplicate an existing profile into the 'custom' tier.
 * The clone gets a new UUID, cleared integrations, and updated metadata.
 * Built-in templates (profileType: 'template') are always duplicated into 'custom'.
 */
export function duplicateProfile(
  id: string,
  sourceType: CompanyProfile['profileType'],
  overrides?: Partial<Pick<CompanyProfile, 'name' | 'profileType'>>
): CompanyProfile | null {
  const source = loadProfile(id, sourceType);
  if (!source) return null;

  const now = new Date().toISOString();
  const newId = generateId();

  const clone: CompanyProfile = {
    ...source,
    id: newId,
    name: overrides?.name ?? `${source.name} (Copy)`,
    profileType: overrides?.profileType ?? 'custom',
    // Track which template this was cloned from
    industryTemplate: source.metadata.isTemplate ? source.id : source.industryTemplate,
    // Clear integration credentials — the clone starts with empty connections
    integrations: {
      ...source.integrations,
      airtable: { baseId: '' },
      webhooks: Object.fromEntries(
        Object.keys(source.integrations.webhooks).map((k) => [k, ''])
      ),
      email: { fromAddress: null },
      claude: { enabled: false, model: source.integrations.claude.model },
    },
    metadata: {
      ...source.metadata,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user',
      isTemplate: false,
      lastSimulationDate: null,
      notes: `Cloned from: ${source.name}`,
    },
  };

  return saveProfile(clone);
}

/**
 * Move a profile to the 'archive' tier.
 * The original file is deleted from its current directory;
 * a copy is written to /profiles/archive/.
 */
export function archiveProfile(
  id: string,
  currentType: CompanyProfile['profileType']
): boolean {
  // Cannot archive built-in templates
  if (currentType === 'template') return false;

  const profile = loadProfile(id, currentType);
  if (!profile) return false;

  // Delete from current location
  const oldPath = profilePath(currentType, id);
  fs.unlinkSync(oldPath);

  // Save to archive
  saveProfile({ ...profile, profileType: 'archive' });
  return true;
}

/**
 * Permanently delete a profile.
 * Built-in templates cannot be deleted (they ship with the app).
 * Returns true on success, false if the profile wasn't found or is a template.
 */
export function deleteProfile(
  id: string,
  profileType: CompanyProfile['profileType']
): boolean {
  // Templates are permanent — use archiveProfile or duplicateProfile instead
  if (profileType === 'template') return false;

  const filePath = profilePath(profileType, id);
  if (!fs.existsSync(filePath)) return false;

  fs.unlinkSync(filePath);
  return true;
}

/**
 * Export a profile as a shareable JSON string.
 * Strips sensitive fields (API keys are in .env, not in profiles,
 * but this also clears webhook URLs and Airtable base IDs for safety).
 */
export function exportProfile(
  id: string,
  profileType: CompanyProfile['profileType']
): string | null {
  const profile = loadProfile(id, profileType);
  if (!profile) return null;

  const exportable: CompanyProfile = {
    ...profile,
    integrations: {
      ...profile.integrations,
      airtable: { baseId: '' },
      webhooks: Object.fromEntries(
        Object.keys(profile.integrations.webhooks).map((k) => [k, ''])
      ),
      email: { fromAddress: null },
    },
  };

  return JSON.stringify(exportable, null, 2);
}

/**
 * Import a profile from a JSON string (from an exported file).
 * Assigns a new UUID to avoid ID collisions with existing profiles.
 * The imported profile lands in the 'custom' tier regardless of its original type.
 */
export function importProfile(jsonString: string): CompanyProfile | null {
  try {
    const parsed = JSON.parse(jsonString) as CompanyProfile;
    const now = new Date().toISOString();

    const imported: CompanyProfile = {
      ...parsed,
      id: generateId(),
      profileType: 'custom',
      metadata: {
        ...parsed.metadata,
        createdAt: now,
        updatedAt: now,
        createdBy: 'imported',
        isTemplate: false,
        lastSimulationDate: null,
      },
    };

    return saveProfile(imported);
  } catch {
    return null;
  }
}

/**
 * Update the lastSimulationDate for a profile.
 * Called by the simulator dashboard after each simulation run.
 */
export function recordSimulationRun(
  id: string,
  profileType: CompanyProfile['profileType']
): void {
  const profile = loadProfile(id, profileType);
  if (!profile) return;

  saveProfile({
    ...profile,
    metadata: {
      ...profile.metadata,
      lastSimulationDate: new Date().toISOString(),
    },
  });
}
