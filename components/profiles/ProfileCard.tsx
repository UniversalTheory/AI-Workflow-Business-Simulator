'use client';

/**
 * components/profiles/ProfileCard.tsx
 *
 * Card component for the Profile Library grid view.
 *
 * Displays a lightweight ProfileSummary — no full profile data needed.
 * Each card shows the company's key stats and provides action buttons
 * for opening in the simulator, editing, duplicating, exporting, and archiving.
 *
 * Color-coding by industry is intentional — at a glance you can see
 * what type of business each profile represents.
 */

import React from 'react';
import { ProfileSummary } from '@/types/profile';

// ---------------------------------------------------------------------------
// Industry color mapping
// Each industry gets a distinct accent color for visual differentiation
// ---------------------------------------------------------------------------

const INDUSTRY_COLORS: Record<string, { dot: string; tag: string; border: string }> = {
  'HVAC & Plumbing':         { dot: '#3b82f6', tag: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  'Legal Services':          { dot: '#8b5cf6', tag: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
  'Restaurant / Fast-Casual':{ dot: '#f97316', tag: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)' },
};

/** Returns the color config for a given industry, with a neutral fallback. */
function getIndustryColor(industry: string) {
  return INDUSTRY_COLORS[industry] ?? {
    dot: '#d4af37',
    tag: 'rgba(212,175,55,0.12)',
    border: 'rgba(212,175,55,0.25)',
  };
}

// ---------------------------------------------------------------------------
// Helper: format currency as compact string — $2.8M, $1.4M, etc.
// ---------------------------------------------------------------------------

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

// ---------------------------------------------------------------------------
// Helper: format date as "Mar 2026" style
// ---------------------------------------------------------------------------

function formatDate(isoString: string | null): string {
  if (!isoString) return 'Never';
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProfileCardProps {
  profile: ProfileSummary;
  /** Called when the user clicks "Open →" — navigates to Simulator Dashboard */
  onOpen: (profile: ProfileSummary) => void;
  /** Called when the user clicks the card body — opens the detail modal */
  onViewDetails: (profile: ProfileSummary) => void;
  /** Called when the user clicks "Duplicate" */
  onDuplicate: (profile: ProfileSummary) => void;
  /** Called when the user clicks "Archive" (non-template profiles only) */
  onArchive?: (profile: ProfileSummary) => void;
  /** Called when the user clicks "Delete" (non-template profiles only) */
  onDelete?: (profile: ProfileSummary) => void;
  /** Called when the user clicks "Export" */
  onExport: (profile: ProfileSummary) => void;
  /** Animation delay index for staggered entry */
  index?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileCard({
  profile,
  onOpen,
  onViewDetails,
  onDuplicate,
  onArchive,
  onDelete,
  onExport,
  index = 0,
}: ProfileCardProps) {
  const colors = getIndustryColor(profile.industry);
  const isTemplate = profile.profileType === 'template';

  return (
    <article
      className="animate-fade-in group relative flex flex-col rounded-xl overflow-hidden cursor-pointer"
      onClick={() => onViewDetails(profile)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow var(--transition-base), border-color var(--transition-base), background var(--transition-base)',
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'backwards',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card-hover)';
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
        (e.currentTarget as HTMLElement).style.borderColor = colors.border;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
      }}
    >
      {/* Top accent bar — industry color */}
      <div
        style={{
          height: '3px',
          background: `linear-gradient(90deg, ${colors.dot}, transparent)`,
        }}
      />

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5">

        {/* Header row: name + template badge */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3
            className="font-semibold text-base leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {profile.name}
          </h3>
          {isTemplate && (
            <span
              className="shrink-0 text-xs font-medium px-2 py-0.5 rounded"
              style={{
                background: 'var(--gold-glow)',
                color: 'var(--text-gold)',
                border: '1px solid var(--border-gold)',
              }}
            >
              Template
            </span>
          )}
          {profile.profileType === 'prospect' && (
            <span
              className="shrink-0 text-xs font-medium px-2 py-0.5 rounded"
              style={{
                background: 'var(--status-info-bg)',
                color: 'var(--status-info)',
                border: '1px solid rgba(96,165,250,0.25)',
              }}
            >
              Prospect
            </span>
          )}
        </div>

        {/* Industry tag */}
        <div className="flex items-center gap-1.5 mb-3">
          <span
            className="dot"
            style={{ background: colors.dot }}
          />
          <span
            className="text-xs font-medium px-2 py-0.5 rounded"
            style={{
              background: colors.tag,
              color: colors.dot,
              border: `1px solid ${colors.border}`,
            }}
          >
            {profile.industry}
          </span>
        </div>

        {/* Description — 2 lines max */}
        <p
          className="text-sm mb-4 line-clamp-2 flex-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          {profile.description}
        </p>

        {/* Stats row */}
        <div
          className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
        >
          <Stat label="Employees" value={profile.size.employeeCount.toString()} />
          <Stat label="Revenue" value={formatRevenue(profile.size.annualRevenue)} />
          <Stat label="Events" value={profile.eventTypeCount.toString()} />
        </div>

        {/* Footer: last simulated + action buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Last simulation date */}
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {profile.metadata.lastSimulationDate
              ? `Last run: ${formatDate(profile.metadata.lastSimulationDate)}`
              : 'Not yet simulated'}
          </span>

          {/* Quick action: open simulator */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(profile); }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'var(--gold-glow)',
              color: 'var(--text-gold)',
              border: '1px solid var(--border-gold)',
              transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)';
            }}
          >
            Open →
          </button>
        </div>
      </div>

      {/* Hover action bar — slides up from bottom on hover */}
      <div
        className="flex items-center gap-1 px-4 py-3 overflow-hidden transition-all duration-200"
        style={{
          background: 'var(--bg-muted)',
          borderTop: '1px solid var(--border-subtle)',
          maxHeight: '0px',
          padding: '0 16px',
          opacity: 0,
          transition: 'max-height var(--transition-base), padding var(--transition-base), opacity var(--transition-base)',
        }}
        ref={(el) => {
          if (!el) return;
          const card = el.closest('article');
          if (!card) return;
          const show = () => {
            el.style.maxHeight = '48px';
            el.style.padding = '10px 16px';
            el.style.opacity = '1';
          };
          const hide = () => {
            el.style.maxHeight = '0px';
            el.style.padding = '0 16px';
            el.style.opacity = '0';
          };
          card.addEventListener('mouseenter', show);
          card.addEventListener('mouseleave', hide);
        }}
      >
        <ActionButton onClick={() => onDuplicate(profile)} title="Duplicate">
          Clone
        </ActionButton>
        <ActionButton onClick={() => onExport(profile)} title="Export JSON">
          Export
        </ActionButton>
        {!isTemplate && onArchive && (
          <ActionButton onClick={() => onArchive(profile)} title="Archive">
            Archive
          </ActionButton>
        )}
        {!isTemplate && onDelete && (
          <ActionButton
            onClick={() => onDelete(profile)}
            title="Delete permanently"
            variant="danger"
          >
            Delete
          </ActionButton>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span
        className="text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </span>
      <span
        className="text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
    </div>
  );
}

function ActionButton({
  onClick,
  title,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  const isDanger = variant === 'danger';
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className="text-xs font-medium px-2.5 py-1 rounded transition-all"
      style={{
        color: isDanger ? 'var(--status-error)' : 'var(--text-secondary)',
        background: 'transparent',
        border: `1px solid ${isDanger ? 'rgba(248,113,113,0.25)' : 'var(--border-default)'}`,
        transition: 'background var(--transition-fast), color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = isDanger ? 'var(--status-error-bg)' : 'var(--border-default)';
        el.style.color = isDanger ? 'var(--status-error)' : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'transparent';
        el.style.color = isDanger ? 'var(--status-error)' : 'var(--text-secondary)';
      }}
    >
      {children}
    </button>
  );
}
