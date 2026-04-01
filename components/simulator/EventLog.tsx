'use client';

/**
 * components/simulator/EventLog.tsx
 *
 * Scrolling event feed — shows every event that has been generated,
 * with timestamp, type, a one-line summary, and status badge.
 *
 * Clicking an event row opens the EventDetailModal for the full payload.
 *
 * Status lifecycle (updated as the event moves through the pipeline):
 *   generated → sending → sent → processing → complete
 *   (error can occur at any step after generated)
 *
 * In Phase 3+ the status will update in real-time as Airtable/webhook
 * responses come back. For now, all events stay at "generated".
 */

import React, { useRef, useEffect } from 'react';
import { GeneratedEvent, EventStatus } from '@/engine/eventGenerator';

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<EventStatus, { bg: string; text: string; label: string }> = {
  generated:  { bg: 'var(--bg-muted)',           text: 'var(--text-muted)',    label: 'Generated' },
  sending:    { bg: 'var(--status-info-bg)',      text: 'var(--status-info)',   label: 'Sending...' },
  sent:       { bg: 'var(--status-info-bg)',      text: 'var(--status-info)',   label: 'Sent' },
  processing: { bg: 'var(--status-warning-bg)',   text: 'var(--status-warning)',label: 'Processing' },
  complete:   { bg: 'var(--status-success-bg)',   text: 'var(--status-success)',label: 'Complete' },
  error:      { bg: 'var(--status-error-bg)',     text: 'var(--status-error)',  label: 'Error' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format ISO timestamp as "9:42:07 AM" */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Generate a human-readable one-line summary for an event.
 * Tries to find the most meaningful fields from the data payload.
 */
function getEventSummary(event: GeneratedEvent): string {
  const { data } = event;

  // Try common "name" keys in order of preference
  const name =
    (data.customer_name as string) ||
    (data.contact_name as string) ||
    (data.reviewer_name as string) ||
    (data.employee_name as string) ||
    (data.client_name as string) ||
    '';

  // Try to find a meaningful detail field
  const detail =
    (data.urgency as string) ||
    (data.service_type as string) ||
    (data.inquiry_type as string) ||
    (data.document_type as string) ||
    (data.event_type as string) ||
    (data.platform as string) ||
    (data.requested_action as string) ||
    '';

  if (name && detail) return `${name} — ${detail}`;
  if (name) return name;
  if (detail) return detail;

  // Last resort: show the event type
  return event.eventTypeName;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EventLogProps {
  events: GeneratedEvent[];
  onSelectEvent: (event: GeneratedEvent) => void;
  onClearLog: () => void;
  simulatedTimes?: Record<string, string>; // eventId → simulated time string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventLog({
  events,
  onSelectEvent,
  onClearLog,
  simulatedTimes = {},
}: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

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
            Event Log
          </p>
          {events.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--gold-glow)',
                color: 'var(--text-gold)',
                border: '1px solid var(--border-gold)',
              }}
            >
              {events.length}
            </span>
          )}
        </div>
        {events.length > 0 && (
          <button
            onClick={onClearLog}
            className="text-xs transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--status-error)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Event rows */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full py-16">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No events yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              Click an event type to generate
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {/* Show newest events at top */}
            {[...events].reverse().map((event, i) => {
              const status = STATUS_STYLES[event.status];
              const simulatedTime = simulatedTimes[event.id];
              const summary = getEventSummary(event);

              return (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {/* Icon */}
                  <span className="text-lg leading-none mt-0.5 shrink-0">
                    {event.eventTypeIcon}
                  </span>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {event.eventTypeName}
                      </span>
                      {/* Status badge */}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: status.bg,
                          color: status.text,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Summary line */}
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {summary}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-right">
                    {simulatedTime ? (
                      <>
                        <p className="text-xs" style={{ color: 'var(--text-gold)', opacity: 0.8 }}>
                          {simulatedTime}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatTime(event.timestamp)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(event.timestamp)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
