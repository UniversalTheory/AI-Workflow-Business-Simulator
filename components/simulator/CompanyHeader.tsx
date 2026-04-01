'use client';

/**
 * components/simulator/CompanyHeader.tsx
 *
 * Company summary banner displayed at the top of the Simulator Dashboard.
 * Shows the active profile's key details — name, industry, size, and a
 * quick stats row.
 *
 * Provides a "Switch Profile" button to return to the Profile Library.
 */

import React from 'react';
import { CompanyProfile } from '@/types/profile';

// Industry dot colors — must match ProfileCard for visual consistency
const INDUSTRY_COLORS: Record<string, string> = {
  'HVAC & Plumbing':          '#3b82f6',
  'Legal Services':           '#8b5cf6',
  'Restaurant / Fast-Casual': '#f97316',
};

function getIndustryColor(industry: string): string {
  return INDUSTRY_COLORS[industry] ?? '#d4af37';
}

function formatRevenue(amount: number): string {
  return amount >= 1_000_000
    ? `$${(amount / 1_000_000).toFixed(1)}M`
    : `$${(amount / 1_000).toFixed(0)}K`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompanyHeaderProps {
  profile: CompanyProfile;
  onSwitchProfile: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompanyHeader({ profile, onSwitchProfile }: CompanyHeaderProps) {
  const color = getIndustryColor(profile.industry);
  const totalEmployees = profile.team.reduce((sum, m) => sum + m.count, 0);

  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: company info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color }}
            >
              {profile.industry}
            </span>
            {profile.metadata.isTemplate && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--gold-glow)',
                  color: 'var(--text-gold)',
                  border: '1px solid var(--border-gold)',
                }}
              >
                Template
              </span>
            )}
          </div>
          <h2
            className="text-lg font-semibold truncate mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {profile.name}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {profile.description.split('.')[0]}.
          </p>
        </div>

        {/* Right: switch profile button */}
        <button
          onClick={onSwitchProfile}
          className="shrink-0 text-sm px-3 py-1.5 rounded-lg transition-all"
          style={{
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = 'var(--bg-card-hover)';
            el.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = 'transparent';
            el.style.color = 'var(--text-secondary)';
          }}
        >
          ← Switch Profile
        </button>
      </div>

      {/* Stats row */}
      <div
        className="flex items-center gap-5 mt-4 pt-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <StatItem label="Employees" value={totalEmployees.toString()} />
        <StatItem label="Revenue" value={formatRevenue(profile.size.annualRevenue)} />
        <StatItem label="Locations" value={profile.size.locationCount.toString()} />
        <StatItem label="Workflows" value={profile.workflows.length.toString()} />
        <StatItem label="Event Types" value={profile.eventTypes.length.toString()} />
        {/* Integration status indicators */}
        <div className="ml-auto flex items-center gap-3">
          <IntegrationDot
            label="Airtable"
            connected={!!profile.integrations.airtable.baseId}
          />
          <IntegrationDot
            label="Webhooks"
            connected={Object.values(profile.integrations.webhooks).some(Boolean)}
          />
          <IntegrationDot
            label="Claude"
            connected={profile.integrations.claude.enabled}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

function IntegrationDot({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: connected ? 'var(--status-success)' : 'var(--border-emphasis)' }}
      />
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
}
