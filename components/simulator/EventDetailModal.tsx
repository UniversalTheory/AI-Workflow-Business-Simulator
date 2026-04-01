'use client';

/**
 * components/simulator/EventDetailModal.tsx
 *
 * Modal that shows the full generated data payload for a selected event.
 *
 * Two views:
 *   - "Formatted" — human-readable field-by-field breakdown with labels
 *   - "Raw JSON"  — the exact payload that would be sent to Airtable/webhook
 *
 * In Phase 3+ this modal will also show the webhook delivery status,
 * Airtable record link, and the automation output from the Output Feed.
 */

import React, { useEffect, useState } from 'react';
import { GeneratedEvent } from '@/engine/eventGenerator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a snake_case key to Title Case label. */
function keyToLabel(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Format a value for display — handles arrays, booleans, numbers, strings. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }
  if (typeof value === 'number') {
    // Detect currency-ish numbers (have decimals or are large round numbers)
    return String(value);
  }
  return String(value);
}

/** Detect if a value looks like a currency amount for display formatting. */
function isCurrency(key: string, value: unknown): boolean {
  const currencyKeys = ['amount', 'cost', 'price', 'revenue', 'budget', 'value', 'ticket'];
  return (
    typeof value === 'number' &&
    currencyKeys.some((k) => key.toLowerCase().includes(k))
  );
}

/** Format currency value. */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EventDetailModalProps {
  event: GeneratedEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const [view, setView] = useState<'formatted' | 'json'>('formatted');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset to formatted view when a new event opens
  useEffect(() => { if (isOpen) setView('formatted'); }, [isOpen, event?.id]);

  if (!isOpen || !event) return null;

  const fieldEntries = Object.entries(event.data);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(560px, 95vw)',
          background: 'var(--bg-modal)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 p-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl leading-none mt-0.5">{event.eventTypeIcon}</span>
            <div className="min-w-0">
              <p
                className="text-xs font-medium uppercase tracking-wider mb-0.5"
                style={{ color: 'var(--text-gold)' }}
              >
                {event.eventCategory}
              </p>
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {event.eventTypeName}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {event.profileName} &nbsp;·&nbsp;{' '}
                {new Date(event.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = 'var(--text-primary)';
              el.style.background = 'var(--bg-card-hover)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = 'var(--text-muted)';
              el.style.background = 'transparent';
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* View toggle */}
        <div
          className="flex gap-1 p-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {(['formatted', 'json'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-xs px-3 py-1.5 rounded-md font-medium transition-all capitalize"
              style={{
                background: view === v ? 'var(--bg-card)' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${view === v ? 'var(--border-default)' : 'transparent'}`,
              }}
            >
              {v === 'json' ? 'Raw JSON' : 'Formatted'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {view === 'formatted' ? (
            <div className="space-y-2">
              {fieldEntries.map(([key, value]) => {
                const label = keyToLabel(key);
                const displayValue = isCurrency(key, value)
                  ? formatCurrency(value as number)
                  : formatValue(value);

                // Detect long text fields for full-width display
                const isLongText =
                  typeof value === 'string' && value.length > 60;

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg ${isLongText ? 'flex flex-col gap-1' : 'flex items-start justify-between gap-4'}`}
                    style={{
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span
                      className="text-xs font-medium shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {label}
                    </span>
                    <span
                      className={`text-sm ${isLongText ? '' : 'text-right'}`}
                      style={{
                        color: 'var(--text-primary)',
                        wordBreak: 'break-word',
                        lineHeight: 1.5,
                      }}
                    >
                      {displayValue || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Raw JSON view */
            <pre
              className="text-xs rounded-lg p-4 overflow-x-auto"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                fontFamily: 'var(--font-geist-mono), monospace',
              }}
            >
              {JSON.stringify(
                {
                  id: event.id,
                  timestamp: event.timestamp,
                  profileId: event.profileId,
                  eventTypeId: event.eventTypeId,
                  data: event.data,
                },
                null,
                2
              )}
            </pre>
          )}

          {/* Automation description */}
          <div
            className="mt-4 p-3 rounded-lg flex items-start gap-2"
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid var(--border-gold)',
            }}
          >
            <span style={{ color: 'var(--text-gold)', flexShrink: 0 }}>✦</span>
            <div>
              <p
                className="text-xs font-medium mb-0.5"
                style={{ color: 'var(--text-gold)' }}
              >
                Automation
              </p>
              <p className="text-xs" style={{ color: 'var(--text-gold)', opacity: 0.85 }}>
                {event.automationDescription}
              </p>
            </div>
          </div>

          {/* Phase 3 placeholder: delivery status */}
          <div
            className="mt-3 p-3 rounded-lg"
            style={{
              background: 'var(--bg-muted)',
              border: '1px dashed var(--border-default)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Airtable record &amp; webhook delivery status — available in Phase 3
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
