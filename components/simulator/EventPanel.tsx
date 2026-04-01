'use client';

/**
 * components/simulator/EventPanel.tsx
 *
 * Event generation control panel — the left-side "control board" of the
 * Simulator Dashboard.
 *
 * Features:
 *   - One button per event type in the active profile
 *   - "Simulate Full Day" button — generates a realistic full-day event mix
 *   - Speed selector for realtime vs. instant mode
 *   - Visual loading state during generation
 *   - Displays automation description on hover per event type
 *
 * Each event type button is color-coded by its category and shows the
 * event type's icon, name, and frequency range.
 */

import React from 'react';
import { CompanyProfile, EventType } from '@/types/profile';
import { SPEED_OPTIONS } from '@/engine/simulationEngine';
import { GeneratedEvent } from '@/engine/eventGenerator';

// ---------------------------------------------------------------------------
// Category colors
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Customer-Facing':    { bg: 'rgba(59,130,246,0.10)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  'Internal Operations':{ bg: 'rgba(139,92,246,0.10)', text: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  'Financial':          { bg: 'rgba(74,222,128,0.10)', text: '#4ade80', border: 'rgba(74,222,128,0.25)' },
  'Marketing':          { bg: 'rgba(251,191,36,0.10)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  'Scheduling':         { bg: 'rgba(249,115,22,0.10)', text: '#fb923c', border: 'rgba(249,115,22,0.25)' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] ?? {
    bg: 'var(--bg-muted)',
    text: 'var(--text-muted)',
    border: 'var(--border-default)',
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EventPanelProps {
  profile: CompanyProfile;
  isGenerating: boolean;
  isSimulatingDay: boolean;
  selectedSpeed: typeof SPEED_OPTIONS[number];
  onSpeedChange: (speed: typeof SPEED_OPTIONS[number]) => void;
  onGenerateEvent: (eventType: EventType) => void;
  onSimulateDay: () => void;
  onCancelSimulation?: () => void;
  simulationProgress?: number; // 0-1
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventPanel({
  profile,
  isGenerating,
  isSimulatingDay,
  selectedSpeed,
  onSpeedChange,
  onGenerateEvent,
  onSimulateDay,
  onCancelSimulation,
  simulationProgress = 0,
}: EventPanelProps) {
  const [hoveredEventId, setHoveredEventId] = React.useState<string | null>(null);

  // Group event types by category for organized display
  const grouped = React.useMemo(() => {
    const groups: Record<string, EventType[]> = {};
    for (const et of profile.eventTypes) {
      if (!groups[et.category]) groups[et.category] = [];
      groups[et.category].push(et);
    }
    return groups;
  }, [profile.eventTypes]);

  const categoryOrder = [
    'Customer-Facing',
    'Internal Operations',
    'Financial',
    'Marketing',
    'Scheduling',
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* ----------------------------------------------------------------- */}
      {/* Full Day Simulation */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="p-4 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-gold)' }}
        >
          Full Day Simulation
        </p>

        {/* Speed selector */}
        <div className="flex items-center gap-1 mb-3">
          <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>Speed:</span>
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => onSpeedChange(option)}
              className="text-xs px-2 py-1 rounded transition-all"
              style={{
                background: selectedSpeed.label === option.label
                  ? 'var(--gold-glow)'
                  : 'var(--bg-muted)',
                color: selectedSpeed.label === option.label
                  ? 'var(--text-gold)'
                  : 'var(--text-muted)',
                border: `1px solid ${selectedSpeed.label === option.label
                  ? 'var(--border-gold)'
                  : 'var(--border-subtle)'}`,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Simulate / Cancel button */}
        {isSimulatingDay ? (
          <div className="flex flex-col gap-2">
            {/* Progress bar */}
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-muted)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(simulationProgress * 100)}%`,
                  background: 'linear-gradient(90deg, var(--gold-600), var(--gold-400))',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {Math.round(simulationProgress * 100)}% complete
              </span>
              {onCancelSimulation && (
                <button
                  onClick={onCancelSimulation}
                  className="text-xs px-2 py-1 rounded transition-all"
                  style={{
                    color: 'var(--status-error)',
                    border: '1px solid rgba(248,113,113,0.3)',
                    background: 'var(--status-error-bg)',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={onSimulateDay}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: isGenerating
                ? 'var(--bg-muted)'
                : 'linear-gradient(135deg, var(--gold-700), var(--gold-500))',
              color: isGenerating ? 'var(--text-muted)' : 'var(--text-inverse)',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            ▶ Simulate Full Day
          </button>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Individual event type buttons */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="p-4 rounded-xl flex flex-col gap-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-gold)' }}
        >
          Generate Event
        </p>

        {categoryOrder
          .filter((cat) => grouped[cat])
          .map((category) => {
            const style = getCategoryStyle(category);
            return (
              <div key={category}>
                {/* Category label */}
                <p
                  className="text-xs font-medium mb-2 uppercase tracking-wide"
                  style={{ color: style.text }}
                >
                  {category}
                </p>

                {/* Event type buttons */}
                <div className="flex flex-col gap-1.5">
                  {grouped[category].map((et) => {
                    const isHovered = hoveredEventId === et.id;
                    return (
                      <button
                        key={et.id}
                        onClick={() => onGenerateEvent(et)}
                        disabled={isGenerating || isSimulatingDay}
                        onMouseEnter={() => setHoveredEventId(et.id)}
                        onMouseLeave={() => setHoveredEventId(null)}
                        className="relative flex flex-col w-full text-left rounded-lg p-2.5 transition-all"
                        style={{
                          background: isHovered ? style.bg : 'var(--bg-muted)',
                          border: `1px solid ${isHovered ? style.border : 'var(--border-subtle)'}`,
                          cursor: (isGenerating || isSimulatingDay) ? 'not-allowed' : 'pointer',
                          opacity: (isGenerating || isSimulatingDay) ? 0.5 : 1,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{et.icon}</span>
                          <span
                            className="text-sm font-medium flex-1 text-left"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {et.name}
                          </span>
                          <span
                            className="text-xs shrink-0"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {et.frequency.perDay.min}–{et.frequency.perDay.max}/day
                          </span>
                        </div>

                        {/* Hover: show automation description */}
                        {isHovered && (
                          <p
                            className="text-xs mt-1.5 leading-relaxed"
                            style={{ color: style.text, opacity: 0.85 }}
                          >
                            {et.automationDescription}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
