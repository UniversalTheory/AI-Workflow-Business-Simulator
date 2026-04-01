'use client';

/**
 * components/simulator/OutputFeed.tsx
 *
 * Automation Output Feed — shows what an AI automation "did" with each event.
 *
 * This is the panel you show to prospective clients during demos.
 * It presents a before/after comparison for each processed event:
 *   - BEFORE: what currently happens manually (slow, error-prone)
 *   - AFTER:  what the AI automation does instead (fast, consistent)
 *
 * Phase 2 behavior:
 *   Events that have been generated appear here with their automation
 *   description and a simulated "pending" state. The actual automation
 *   output (AI-drafted emails, Airtable updates, webhook responses) comes
 *   in Phase 3 when Airtable and webhook integrations are wired up.
 *
 * Phase 3+ behavior:
 *   Real automation output replaces the placeholder cards.
 *   Response time metrics and before/after comparisons populate dynamically.
 */

import React from 'react';
import { GeneratedEvent } from '@/engine/eventGenerator';

// ---------------------------------------------------------------------------
// Before/After copy — maps event type IDs to the "before" scenario
// These are the pain points that resonate most with demo audiences
// ---------------------------------------------------------------------------

const BEFORE_SCENARIOS: Record<string, string> = {
  // Westside Mechanical
  service_request:    'Customer waits 1–3 hours for a callback. Tyler manually enters the request on the whiteboard. No confirmation sent.',
  estimate_request:   'Request sits in Sarah\'s notepad. Mike gets to it in 3–5 days when he has time. Customer may have already called a competitor.',
  job_completion:     'Tech\'s paper form arrives 1–3 days late. Sarah deciphers the handwriting and manually creates the invoice. Average delay: 7 days.',
  overdue_invoice:    'Linda manually checks aging every Tuesday/Thursday. Sends a single reminder email. No follow-up cadence.',
  review_received:    'Review sits unresponded for days. Mike sees it eventually, writes something quick. Happy customers never hear from the company.',

  // Bridgewater Legal
  client_inquiry:     'Olivia takes a message. Attorney responds when they see the forwarded email — sometimes 2–3 days. Potential client may have gone elsewhere.',
  document_draft_needed: 'Attorney opens a previous document, saves a copy, manually finds and replaces client details. 1–3 hours per document. Find-and-replace errors reach clients.',
  client_status_request: 'Olivia takes a message or forwards the email. Attorney responds when available. Clients call back repeatedly. 15–20 status calls per week.',
  invoice_due:        'Tom generates monthly invoice runs manually. Sends one reminder at 30 days. Overdue accounts sit at ~$180K.',

  // Rapids Bite Kitchen
  catering_inquiry:   'Inquiry goes to Nadia\'s paper notebook. She responds when she\'s in (part-time). No proposal sent for days. Inquiry often goes cold.',
  inventory_alert:    'Ethan walks the walk-in from memory and calls suppliers. Items run out 2–3x/month. Food waste at 12–15%. No data-driven ordering.',
  new_review:         'Priya checks reviews when she remembers. Negative reviews go unanswered for days. No system for requesting reviews from happy customers.',
  schedule_change_request: 'Request goes to the group text. Priya manually updates the Google Sheet. Shift coverage is chaotic. No-shows happen weekly.',
  daily_sales_summary: 'Priya looks at Toast reports weekly if she remembers. No automated insights, no cost flags, no reorder triggers.',
};

// ---------------------------------------------------------------------------
// Simulated response times by category (for the "after" side of the comparison)
// ---------------------------------------------------------------------------

const RESPONSE_TIMES: Record<string, string> = {
  'Customer-Facing':     '< 2 minutes',
  'Internal Operations': '< 30 seconds',
  'Financial':           '< 1 minute',
  'Marketing':           '< 3 minutes',
  'Scheduling':          '< 1 minute',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OutputFeedProps {
  events: GeneratedEvent[];
  onSelectEvent: (event: GeneratedEvent) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutputFeed({ events, onSelectEvent }: OutputFeedProps) {
  // Only show events that have a known before-scenario (others aren't demo-ready yet)
  const demoEvents = [...events]
    .reverse()
    .filter((e) => BEFORE_SCENARIOS[e.eventTypeId]);

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        height: '100%',
        minHeight: '400px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-gold)' }}
          >
            Output Feed
          </p>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--status-info-bg)',
              color: 'var(--status-info)',
              border: '1px solid rgba(96,165,250,0.25)',
            }}
          >
            Before / After
          </span>
        </div>
        {events.length > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {demoEvents.length} demo-ready
          </span>
        )}
      </div>

      {/* Feed content */}
      <div className="flex-1 overflow-y-auto">
        {demoEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <p className="text-2xl mb-2">⚡</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Automation output appears here
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              Generate events to see the before/after comparison
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {demoEvents.map((event) => {
              const before = BEFORE_SCENARIOS[event.eventTypeId];
              const after = event.automationDescription;
              const responseTime = RESPONSE_TIMES[event.eventCategory] ?? '< 2 minutes';

              return (
                <div
                  key={event.id}
                  className="p-4 cursor-pointer transition-all"
                  style={{ background: 'transparent' }}
                  onClick={() => onSelectEvent(event)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {/* Event type header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">{event.eventTypeIcon}</span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {event.eventTypeName}
                    </span>
                    <span
                      className="ml-auto text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--status-success-bg)',
                        color: 'var(--status-success)',
                        border: '1px solid rgba(74,222,128,0.25)',
                      }}
                    >
                      {responseTime}
                    </span>
                  </div>

                  {/* Before / After side-by-side */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Before */}
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        background: 'var(--status-error-bg)',
                        border: '1px solid rgba(248,113,113,0.15)',
                      }}
                    >
                      <p
                        className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                        style={{ color: 'var(--status-error)', opacity: 0.8 }}
                      >
                        Before
                      </p>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {before}
                      </p>
                    </div>

                    {/* After */}
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        background: 'var(--status-success-bg)',
                        border: '1px solid rgba(74,222,128,0.15)',
                      }}
                    >
                      <p
                        className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                        style={{ color: 'var(--status-success)', opacity: 0.8 }}
                      >
                        After
                      </p>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {after}
                      </p>
                    </div>
                  </div>

                  {/* Phase 3 placeholder — real output will replace this */}
                  <div
                    className="mt-2 px-3 py-2 rounded flex items-center gap-2"
                    style={{
                      background: 'var(--bg-muted)',
                      border: '1px dashed var(--border-default)',
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: 'var(--border-emphasis)' }}
                    />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Live automation output — available in Phase 3
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
