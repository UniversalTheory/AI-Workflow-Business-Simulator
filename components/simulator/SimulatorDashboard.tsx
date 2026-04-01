'use client';

/**
 * components/simulator/SimulatorDashboard.tsx
 *
 * The main Simulator Dashboard — wires together all simulator UI components.
 *
 * Layout (three-column):
 *   Left  (280px) — EventPanel: event type buttons + full day controls
 *   Center (flex) — EventLog: scrolling feed of generated events
 *   Right  (flex) — OutputFeed: before/after automation comparison
 *
 * State managed here:
 *   - events[]          — all generated events for the current session
 *   - simulatedTimes    — maps event IDs to their simulated day time strings
 *   - selectedEvent     — the event open in the detail modal
 *   - isGenerating      — single-event generation in flight
 *   - isSimulatingDay   — full day simulation running
 *   - simulationProgress— 0-1 progress for the full day progress bar
 *   - selectedSpeed     — the current speed setting for full day mode
 *   - simulationHandle  — cancellable handle for realtime simulations
 *
 * Event generation flow:
 *   1. User clicks an event type button or "Simulate Full Day"
 *   2. POST /api/events with profileId + eventTypeId (or mode=day)
 *   3. Server generates events using the engine and returns JSON
 *   4. Client adds events to the log and updates simulatedTimes map
 *   5. For realtime mode: events are dripped into the log using the
 *      day plan's dayFraction timing (no server round-trips per event —
 *      all events are generated at once, then revealed on a timer)
 */

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyProfile, EventType } from '@/types/profile';
import { GeneratedEvent } from '@/engine/eventGenerator';
import { SPEED_OPTIONS, SimulationHandle } from '@/engine/simulationEngine';
import CompanyHeader from './CompanyHeader';
import EventPanel from './EventPanel';
import EventLog from './EventLog';
import OutputFeed from './OutputFeed';
import EventDetailModal from './EventDetailModal';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SimulatorDashboardProps {
  profile: CompanyProfile;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Day plan item as returned from /api/events?mode=day */
interface DayPlanItem {
  dayFraction: number;
  simulatedTime: string;
  eventTypeId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SimulatorDashboard({ profile }: SimulatorDashboardProps) {
  const router = useRouter();

  // Session state
  const [events, setEvents] = useState<GeneratedEvent[]>([]);
  const [simulatedTimes, setSimulatedTimes] = useState<Record<string, string>>({});
  const [selectedEvent, setSelectedEvent] = useState<GeneratedEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulatingDay, setIsSimulatingDay] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [selectedSpeed, setSelectedSpeed] = useState<typeof SPEED_OPTIONS[number]>(SPEED_OPTIONS[0]); // default: 1×
  const simulationHandleRef = useRef<SimulationHandle | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ---------------------------------------------------------------------------
  // Handler: generate a single event type
  // ---------------------------------------------------------------------------

  const handleGenerateEvent = useCallback(async (eventType: EventType) => {
    if (isGenerating || isSimulatingDay) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          profileType: profile.profileType,
          eventTypeId: eventType.id,
          count: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      const newEvents: GeneratedEvent[] = data.events;
      setEvents((prev) => [...prev, ...newEvents]);

    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Event generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, isSimulatingDay, profile.id, profile.profileType]);

  // ---------------------------------------------------------------------------
  // Handler: full day simulation
  // ---------------------------------------------------------------------------

  const handleSimulateDay = useCallback(async () => {
    if (isGenerating || isSimulatingDay) return;
    setIsSimulatingDay(true);
    setSimulationProgress(0);

    try {
      // Fetch all events for the full day from the server (instant generation)
      const res = await fetch('/api/events?mode=day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          profileType: profile.profileType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Simulation failed');

      const allEvents: GeneratedEvent[] = data.events;
      const plan: DayPlanItem[] = data.plan;

      // Build a map from position index → simulated time
      // (plan and events arrays are parallel — same order)
      const timeMap: Record<string, string> = {};
      allEvents.forEach((event, i) => {
        if (plan[i]) {
          timeMap[event.id] = plan[i].simulatedTime;
        }
      });

      // Instant mode: add all events immediately
      if (selectedSpeed.multiplier === Infinity) {
        setEvents((prev) => [...prev, ...allEvents]);
        setSimulatedTimes((prev) => ({ ...prev, ...timeMap }));
        setSimulationProgress(1);
        setIsSimulatingDay(false);
        showToast(`Simulated full day — ${allEvents.length} events generated`);
        return;
      }

      // Realtime mode: drip events into the log over `durationMs`
      const durationMs = selectedSpeed.durationMs;
      const timers: ReturnType<typeof setTimeout>[] = [];
      let cancelled = false;

      const handle: SimulationHandle = {
        cancel: () => {
          cancelled = true;
          timers.forEach(clearTimeout);
          setIsSimulatingDay(false);
          setSimulationProgress(0);
        },
        isPaused: () => false,
        pause: () => {},
        resume: () => {},
      };
      simulationHandleRef.current = handle;

      // Schedule each event reveal based on its day fraction
      plan.forEach((planItem, index) => {
        const delayMs = planItem.dayFraction * durationMs;
        const timer = setTimeout(() => {
          if (cancelled) return;

          const event = allEvents[index];
          if (!event) return;

          setEvents((prev) => [...prev, event]);
          setSimulatedTimes((prev) => ({ ...prev, [event.id]: planItem.simulatedTime }));
          setSimulationProgress((index + 1) / allEvents.length);

          // Last event: mark simulation complete
          if (index === allEvents.length - 1) {
            setIsSimulatingDay(false);
            setSimulationProgress(1);
            showToast(`Full day complete — ${allEvents.length} events`);
          }
        }, delayMs);
        timers.push(timer);
      });

      // Edge case: empty plan
      if (allEvents.length === 0) {
        setIsSimulatingDay(false);
        showToast('No events scheduled for this profile', 'error');
      }

    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Simulation failed', 'error');
      setIsSimulatingDay(false);
    }
  }, [isGenerating, isSimulatingDay, profile.id, profile.profileType, selectedSpeed]);

  // ---------------------------------------------------------------------------
  // Handler: cancel simulation
  // ---------------------------------------------------------------------------

  const handleCancelSimulation = useCallback(() => {
    simulationHandleRef.current?.cancel();
    simulationHandleRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Handler: select event for detail modal
  // ---------------------------------------------------------------------------

  const handleSelectEvent = useCallback((event: GeneratedEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Handler: clear event log
  // ---------------------------------------------------------------------------

  const handleClearLog = useCallback(() => {
    setEvents([]);
    setSimulatedTimes({});
    setSimulationProgress(0);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ------------------------------------------------------------------- */}
      {/* App header */}
      {/* ------------------------------------------------------------------- */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-3"
        style={{
          background: 'rgba(10,10,15,0.90)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Back to library */}
          <button
            onClick={() => router.push('/')}
            className="text-sm transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            ← Library
          </button>
          <span style={{ color: 'var(--border-default)' }}>/</span>
          <h1
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="text-gradient-gold">Simulator</span>
          </h1>
        </div>

        {/* Session stats */}
        <div className="flex items-center gap-4">
          {events.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {events.length} event{events.length !== 1 ? 's' : ''} this session
            </span>
          )}
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isSimulatingDay
                ? 'var(--status-warning)'
                : isGenerating
                ? 'var(--status-info)'
                : 'var(--status-success)',
            }}
            title={isSimulatingDay ? 'Simulating...' : isGenerating ? 'Generating...' : 'Ready'}
          />
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* Main content */}
      {/* ------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col px-6 py-5 gap-5 max-w-[1600px] mx-auto w-full">

        {/* Company header banner */}
        <CompanyHeader
          profile={profile}
          onSwitchProfile={() => router.push('/')}
        />

        {/* Three-column simulator layout */}
        <div className="flex gap-4 flex-1" style={{ minHeight: 0 }}>

          {/* Left column: Event Panel */}
          <div className="w-72 shrink-0 overflow-y-auto">
            <EventPanel
              profile={profile}
              isGenerating={isGenerating}
              isSimulatingDay={isSimulatingDay}
              selectedSpeed={selectedSpeed}
              onSpeedChange={setSelectedSpeed}
              onGenerateEvent={handleGenerateEvent}
              onSimulateDay={handleSimulateDay}
              onCancelSimulation={handleCancelSimulation}
              simulationProgress={simulationProgress}
            />
          </div>

          {/* Center column: Event Log */}
          <div className="flex-1 min-w-0" style={{ minHeight: '500px' }}>
            <EventLog
              events={events}
              onSelectEvent={handleSelectEvent}
              onClearLog={handleClearLog}
              simulatedTimes={simulatedTimes}
            />
          </div>

          {/* Right column: Output Feed */}
          <div className="flex-1 min-w-0" style={{ minHeight: '500px' }}>
            <OutputFeed
              events={events}
              onSelectEvent={handleSelectEvent}
            />
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------- */}
      {/* Event Detail Modal */}
      {/* ------------------------------------------------------------------- */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
      />

      {/* ------------------------------------------------------------------- */}
      {/* Toast */}
      {/* ------------------------------------------------------------------- */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fade-in"
          style={{
            background: toast.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
            color: toast.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            backdropFilter: 'blur(8px)',
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          <span>{toast.type === 'success' ? '✓' : '✗'}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
