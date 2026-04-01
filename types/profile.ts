/**
 * types/profile.ts
 *
 * Central type definitions for the Company Profile schema.
 * Every piece of data in the simulator is derived from a CompanyProfile.
 *
 * This file is the canonical reference for the profile data model.
 * When adding new features, start here to extend the schema, then update
 * the relevant profile JSON files and consuming modules.
 *
 * Schema version history:
 *   v1.0 — Phase 1: Core profile structure, three reference companies
 */

// ---------------------------------------------------------------------------
// Primitive / shared types
// ---------------------------------------------------------------------------

/** Weighted distribution map for randomizing select-type fields.
 *  Keys are option values, values are percentage weights (must sum to 100). */
export type WeightedDistribution = Record<string, number>;

/** Numeric range used for randomizing number/currency fields. */
export interface Range {
  min: number;
  max: number;
}

/** Locale object. Defaults to Grand Rapids, MI.
 *  Abstracted so future expansion to other markets requires only a new locale config. */
export interface Location {
  city: string;
  state: string;
  /** Full list of zip codes for this locale — used by the grAddress generator. */
  zips: string[];
  /** Named neighborhoods for flavor text in generated events. */
  neighborhoods: string[];
}

// ---------------------------------------------------------------------------
// Team member
// ---------------------------------------------------------------------------

export interface TeamMember {
  /** Display name, or a label like "6 Field Technicians" for groups. */
  name: string;
  role: string;
  /** Day-to-day responsibilities. 1-3 sentences. */
  responsibilities: string;
  /** True if this person is a workflow bottleneck (used by event generator). */
  isBottleneck: boolean;
  /** Technology comfort level 1 (avoids tech) to 5 (power user). */
  techComfort: 1 | 2 | 3 | 4 | 5;
  /** 1 for individuals; higher for role groups ("6 Line Cooks" = 6). */
  count: number;
}

// ---------------------------------------------------------------------------
// Tool stack
// ---------------------------------------------------------------------------

/** Standardized tool categories for consistent filtering and display. */
export type ToolCategory =
  | 'Accounting'
  | 'CRM'
  | 'Communication'
  | 'Scheduling'
  | 'POS'
  | 'Document Management'
  | 'Marketing'
  | 'Project Management'
  | 'Custom/Manual'
  | 'Other';

export interface ToolStackEntry {
  name: string;
  category: ToolCategory;
  /** Names or roles that use this tool. References team member names. */
  usedBy: string[];
  /** How they actually use it in practice. 1-2 sentences. */
  usage: string;
  /** Specific pain points with this tool's current usage. */
  painPoints: string[];
  /** Whether the tool has AI features they aren't currently using. */
  hasAiFeatures: boolean;
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

/** Frequency of errors in this workflow. */
export type ErrorFrequency = 'Low' | 'Medium' | 'High';

/** Audit scoring matrix results. Populated after running the scoring exercise.
 *  All scores are 1-5. */
export interface AuditScore {
  timeImpact: number;
  implementationEase: number;
  errorReduction: number;
  teamAdoption: number;
  dataSensitivity: number;
}

export interface Workflow {
  /** Unique identifier within this profile. e.g. "estimate_creation" */
  id: string;
  name: string;
  /** What this workflow accomplishes for the business. */
  description: string;
  /** Step-by-step description of the current (manual/broken) process. */
  currentProcess: string;
  /** Concrete, specific pain points — not vague platitudes. */
  painPoints: string[];
  /** Estimated hours per week consumed by this workflow in its current state. */
  estimatedTimePerWeek: number;
  errorFrequency: ErrorFrequency;
  /** Team member names/roles directly involved in this workflow. */
  affectedTeamMembers: string[];
  /** Short description of the AI opportunity for this workflow. */
  aiOpportunity: string;
  /** Null until the audit scoring matrix has been run against this workflow. */
  auditScore: AuditScore | null;
  /** IDs of event types in this profile that relate to this workflow. */
  linkedEventTypes: string[];
}

// ---------------------------------------------------------------------------
// Event type field definitions
// ---------------------------------------------------------------------------

/** All supported data types for event fields. */
export type FieldDataType =
  | 'text'
  | 'email'
  | 'phone'
  | 'address'
  | 'currency'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'longtext'
  | 'contentPool'; // Draws randomly from a named content pool

/** Built-in data generator types for structured/locale-aware fields. */
export type GeneratorType =
  | 'grAddress'    // Grand Rapids area street address
  | 'grPhone'      // 616-area-code phone number
  | 'fullName'     // Realistic first + last name
  | 'bizEmail'     // Business-style email pattern
  | 'dateNear';    // Date within a configurable range of today

/** Definition for a single field within an event type.
 *  The event generator reads this to produce typed, realistic data. */
export interface FieldDef {
  /** Machine-readable key. e.g. "customer_name", "urgency" */
  key: string;
  /** Human-readable label for UI display. */
  label: string;
  dataType: FieldDataType;
  required: boolean;
  /** Valid options for select/multiselect fields. */
  options?: string[];
  /** Weighted randomization for select fields. Keys must match options. */
  distribution?: WeightedDistribution;
  /** Min/max range for number/currency fields. */
  range?: Range;
  /** For contentPool fields: key into the event type's contentPools object. */
  contentPoolRef?: string;
  /** For auto-generated structured data (addresses, phone numbers, names, etc.) */
  generator?: GeneratorType;
}

// ---------------------------------------------------------------------------
// Event type
// ---------------------------------------------------------------------------

/** High-level grouping for event types. */
export type EventCategory =
  | 'Customer-Facing'
  | 'Internal Operations'
  | 'Financial'
  | 'Marketing'
  | 'Scheduling';

/** Frequency configuration for Full Day simulation mode. */
export interface EventFrequency {
  perDay: Range;
  timeRange: {
    /** "HH:MM" 24-hour format */
    earliest: string;
    latest: string;
  };
  /** Hours (0-23) when this event clusters. e.g. [8, 9, 17] */
  peakHours: number[];
}

/** Full definition of one type of business event a company can generate.
 *  This is the heart of the dynamic simulator — the event generator reads
 *  these definitions to produce realistic, randomized event data. */
export interface EventType {
  /** Unique identifier within this profile. e.g. "service_request" */
  id: string;
  name: string;
  /** Emoji or icon string for UI display. */
  icon: string;
  category: EventCategory;
  /** ID of the workflow this event relates to. */
  linkedWorkflow: string;
  /** Ordered list of field definitions for this event's data payload. */
  fields: FieldDef[];
  /**
   * Named pools of pre-written text strings for contentPool fields.
   * Keys are pool names; values are arrays of candidate strings.
   * Phase 2 note: populate with 50-100 entries per pool for each reference company.
   *
   * Example:
   *   { "problemDescriptions": ["Furnace making banging noise...", ...] }
   */
  contentPools: Record<string, string[]>;
  /** Key used to look up this event's webhook URL in integrations config. */
  webhookKey: string;
  /** Where to write this event in Airtable and how fields map to columns. */
  airtableTarget: {
    tableId: string;
    /** Maps event field keys to Airtable column names. */
    fieldMapping: Record<string, string>;
  };
  frequency: EventFrequency;
  /** Short description of what the AI automation does with this event.
   *  Displayed in the Output Feed panel. */
  automationDescription: string;
}

// ---------------------------------------------------------------------------
// Data schema (Airtable structure)
// ---------------------------------------------------------------------------

export interface TableFieldDef {
  name: string;
  type: string;
  /** For select fields: the list of options. */
  options?: string[];
  description?: string;
}

export interface TableDef {
  /** Airtable table name. */
  name: string;
  fields: TableFieldDef[];
}

export interface TableRelationship {
  from: string;
  to: string;
  field: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

/** Specifies how much sample data to generate for each table.
 *  Keys are table names, values are record counts. */
export type SampleDataSpec = Record<string, number>;

export interface DataSchema {
  tables: TableDef[];
  relationships: TableRelationship[];
  sampleDataSpec: SampleDataSpec;
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface IntegrationsConfig {
  airtable: {
    /** The Airtable base ID for this company. Empty until configured. */
    baseId: string;
    /** NOTE: API keys are stored in .env, never in the profile JSON. */
  };
  /** Map of webhookKey to webhook URL. e.g. { service_request_webhook: "https://..." } */
  webhooks: Record<string, string>;
  email: {
    /** Optional "from" address for test emails. */
    fromAddress: string | null;
  };
  claude: {
    /** Whether to use live Claude API for event generation vs. static content pools. */
    enabled: boolean;
    /** Which Claude model to use for live generation. */
    model: string;
  };
}

// ---------------------------------------------------------------------------
// Profile metadata
// ---------------------------------------------------------------------------

export interface ProfileMetadata {
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
  createdBy: string;  // "system" for built-in templates, email/name for custom
  /** Free-form tags for filtering and organization. */
  tags: string[];
  /** Internal notes about this profile. */
  notes: string;
  /** True for profiles that appear in the "Start from Template" list. */
  isTemplate: boolean;
  /** Last date a simulation was run against this profile. */
  lastSimulationDate: string | null;
}

// ---------------------------------------------------------------------------
// Top-level Company Profile
// ---------------------------------------------------------------------------

/**
 * CompanyProfile is the root type for the entire simulator data model.
 * Every feature — event generation, Airtable integration, the profile builder,
 * AI generation, and the simulator dashboard — reads from this structure.
 *
 * Profiles are stored as JSON files:
 *   /profiles/templates/  — built-in (ships with the app, cannot be deleted)
 *   /profiles/custom/     — user-created custom profiles
 *   /profiles/prospects/  — pre-prospect research profiles
 *   /profiles/archive/    — retired profiles kept for reference
 */
export interface CompanyProfile {
  /** UUID — auto-generated on creation. Used for storage and lookup. */
  id: string;
  /** Display name. e.g. "Westside Mechanical LLC" */
  name: string;
  /** Industry category. e.g. "HVAC & Plumbing" */
  industry: string;
  /**
   * Which storage tier this profile belongs to.
   * Determines the file system directory and which UI sections show it.
   */
  profileType: 'template' | 'custom' | 'prospect' | 'archive';
  /** If cloned from a template, stores the original template ID. */
  industryTemplate: string | null;
  /** 2-3 sentence overview of the business. */
  description: string;
  location: Location;
  size: {
    employeeCount: number;
    annualRevenue: number;
    locationCount: number;
  };
  team: TeamMember[];
  toolStack: ToolStackEntry[];
  workflows: Workflow[];
  eventTypes: EventType[];
  dataSchema: DataSchema;
  integrations: IntegrationsConfig;
  metadata: ProfileMetadata;
}

// ---------------------------------------------------------------------------
// Utility types used by the storage layer and UI
// ---------------------------------------------------------------------------

/** Summary card data — a lightweight projection of CompanyProfile for list views.
 *  Avoids loading full profiles (including large content pools) just to render cards. */
export interface ProfileSummary {
  id: string;
  name: string;
  industry: string;
  profileType: CompanyProfile['profileType'];
  description: string;
  size: CompanyProfile['size'];
  eventTypeCount: number;
  workflowCount: number;
  metadata: ProfileMetadata;
}
