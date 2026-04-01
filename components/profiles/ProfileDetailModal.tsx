'use client';

/**
 * components/profiles/ProfileDetailModal.tsx
 *
 * Modal drawer that displays the full details of a selected company profile.
 *
 * Sections shown:
 *   1. Company overview (name, industry, size, description)
 *   2. Team structure
 *   3. Current tool stack
 *   4. Workflows & pain points
 *   5. Event types (simulator configuration)
 *   6. Integration status
 *
 * This is a read-only view for Phase 1.
 * The full edit capability comes in Phase 4 (Profile Builder UI).
 */

import React, { useEffect } from 'react';
import { CompanyProfile } from '@/types/profile';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProfileDetailModalProps {
  profile: CompanyProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileDetailModal({
  profile,
  isOpen,
  onClose,
}: ProfileDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !profile) return null;

  const totalEmployees = profile.team.reduce((sum, m) => sum + m.count, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal panel — slides in from right */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(680px, 95vw)',
          background: 'var(--bg-modal)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-start justify-between gap-4 p-6"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-medium uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-gold)' }}
            >
              {profile.industry}
            </p>
            <h2
              className="text-xl font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {profile.name}
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {profile.location.city}, {profile.location.state} &nbsp;·&nbsp;
              {totalEmployees} employees &nbsp;·&nbsp;
              ${(profile.size.annualRevenue / 1_000_000).toFixed(1)}M revenue
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{
              color: 'var(--text-muted)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Description */}
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {profile.description}
          </p>

          {/* Tags */}
          {profile.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: 'var(--bg-muted)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="divider-gold" />

          {/* Team section */}
          <Section title="Team Structure" count={profile.team.length}>
            <div className="space-y-2">
              {profile.team.map((member, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  {/* Bottleneck indicator */}
                  <div
                    className="shrink-0 mt-0.5 w-2 h-2 rounded-full"
                    style={{ background: member.isBottleneck ? 'var(--status-warning)' : 'var(--border-emphasis)' }}
                    title={member.isBottleneck ? 'Workflow bottleneck' : ''}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {member.count > 1 ? `${member.count}× ` : ''}{member.name}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--bg-card)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {member.role}
                      </span>
                      {/* Tech comfort pip row */}
                      <div className="flex gap-0.5" title={`Tech comfort: ${member.techComfort}/5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className="w-1.5 h-1.5 rounded-sm"
                            style={{
                              background: n <= member.techComfort
                                ? 'var(--gold-500)'
                                : 'var(--border-default)',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {member.responsibilities}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              ● Yellow dot = workflow bottleneck &nbsp;|&nbsp; Gold pips = tech comfort (1-5)
            </p>
          </Section>

          <div className="divider-gold" />

          {/* Tool stack */}
          <Section title="Current Tool Stack" count={profile.toolStack.length}>
            <div className="space-y-2">
              {profile.toolStack.map((tool, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {tool.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <CategoryBadge>{tool.category}</CategoryBadge>
                      {tool.hasAiFeatures && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: 'var(--gold-glow)',
                            color: 'var(--text-gold)',
                            border: '1px solid var(--border-gold)',
                          }}
                          title="Has unused AI features"
                        >
                          AI Ready
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {tool.usage}
                  </p>
                  {tool.painPoints.length > 0 && (
                    <ul className="space-y-0.5">
                      {tool.painPoints.map((pt, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--status-error)', flexShrink: 0 }}>✗</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <div className="divider-gold" />

          {/* Workflows */}
          <Section title="Workflows & Pain Points" count={profile.workflows.length}>
            <div className="space-y-3">
              {profile.workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {wf.name}
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ErrorBadge frequency={wf.errorFrequency} />
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--bg-card)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        ~{wf.estimatedTimePerWeek}h/wk
                      </span>
                    </div>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {wf.currentProcess}
                  </p>
                  {wf.painPoints.length > 0 && (
                    <ul className="space-y-0.5 mb-2">
                      {wf.painPoints.map((pt, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--status-error)', flexShrink: 0 }}>✗</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* AI opportunity callout */}
                  <div
                    className="flex items-start gap-2 p-2 rounded"
                    style={{
                      background: 'var(--gold-glow)',
                      border: '1px solid var(--border-gold)',
                    }}
                  >
                    <span style={{ color: 'var(--text-gold)', flexShrink: 0 }}>✦</span>
                    <p className="text-xs" style={{ color: 'var(--text-gold)' }}>
                      {wf.aiOpportunity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="divider-gold" />

          {/* Event types */}
          <Section title="Simulator Event Types" count={profile.eventTypes.length}>
            <div className="grid grid-cols-2 gap-2">
              {profile.eventTypes.map((et) => (
                <div
                  key={et.id}
                  className="flex items-start gap-2 p-3 rounded-lg"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  <span className="text-lg leading-none">{et.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {et.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {et.fields.length} fields &nbsp;·&nbsp; {et.frequency.perDay.min}–{et.frequency.perDay.max}/day
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="divider-gold" />

          {/* Integration status */}
          <Section title="Integration Status">
            <div className="space-y-2">
              <IntegrationRow
                label="Airtable Base"
                connected={!!profile.integrations.airtable.baseId}
              />
              <IntegrationRow
                label="Claude API"
                connected={profile.integrations.claude.enabled}
                note={profile.integrations.claude.enabled ? profile.integrations.claude.model : undefined}
              />
              <IntegrationRow
                label="Email"
                connected={!!profile.integrations.email.fromAddress}
              />
              <div className="mt-2">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Webhooks</p>
                <div className="space-y-1">
                  {Object.entries(profile.integrations.webhooks).map(([key, url]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: url ? 'var(--status-success)' : 'var(--border-emphasis)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {key.replace(/_webhook$/, '').replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Notes if present */}
          {profile.metadata.notes && (
            <>
              <div className="divider-gold" />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {profile.metadata.notes}
              </p>
            </>
          )}

        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-gold)' }}>
          {title}
        </h3>
        {count !== undefined && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-muted)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function CategoryBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded"
      style={{
        background: 'var(--bg-card)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {children}
    </span>
  );
}

function ErrorBadge({ frequency }: { frequency: 'Low' | 'Medium' | 'High' }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    Low:    { bg: 'var(--status-success-bg)',  color: 'var(--status-success)', border: 'rgba(74,222,128,0.25)' },
    Medium: { bg: 'var(--status-warning-bg)',  color: 'var(--status-warning)', border: 'rgba(251,191,36,0.25)' },
    High:   { bg: 'var(--status-error-bg)',    color: 'var(--status-error)',   border: 'rgba(248,113,113,0.25)' },
  };
  const s = styles[frequency];
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {frequency} Error Rate
    </span>
  );
}

function IntegrationRow({
  label,
  connected,
  note,
}: {
  label: string;
  connected: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: connected ? 'var(--status-success)' : 'var(--border-emphasis)' }}
      />
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: connected ? 'var(--status-success)' : 'var(--text-muted)' }}>
        {connected ? (note ?? 'Connected') : 'Not configured'}
      </span>
    </div>
  );
}
