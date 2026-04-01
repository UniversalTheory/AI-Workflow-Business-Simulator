'use client';

/**
 * components/profiles/ProfileLibrary.tsx
 *
 * The Profile Library — the main view of the simulator application.
 *
 * Responsibilities:
 *   - Display all company profiles as a card grid
 *   - Filter by profile type (All / Templates / Custom / Prospects)
 *   - Search by name or industry
 *   - Handle profile actions: open, duplicate, archive, delete, export
 *   - Open the ProfileDetailModal for full profile inspection
 *
 * Receives initial profile data from the server component (page.tsx)
 * and manages client-side state from there.
 *
 * In Phase 2+, the "Open in Simulator" action will route to the
 * SimulatorDashboard page with the selected profile loaded.
 */

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileSummary, CompanyProfile } from '@/types/profile';
import ProfileCard from './ProfileCard';
import ProfileDetailModal from './ProfileDetailModal';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProfileLibraryProps {
  initialProfiles: ProfileSummary[];
}

// ---------------------------------------------------------------------------
// Filter tab definitions
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'template' | 'custom' | 'prospect';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',      label: 'All Profiles' },
  { id: 'template', label: 'Templates' },
  { id: 'custom',   label: 'Custom' },
  { id: 'prospect', label: 'Prospects' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileLibrary({ initialProfiles }: ProfileLibraryProps) {
  const router = useRouter();

  // Local profile list — will be updated optimistically on actions
  const [profiles, setProfiles] = useState<ProfileSummary[]>(initialProfiles);

  // Active filter tab
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Search query
  const [search, setSearch] = useState('');

  // Modal state — stores the full CompanyProfile for the selected card
  const [selectedProfile, setSelectedProfile] = useState<CompanyProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading states for async actions
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ---------------------------------------------------------------------------
  // Derived: filtered + searched profiles
  // ---------------------------------------------------------------------------

  const filtered = useMemo(() => {
    let result = profiles;

    if (activeFilter !== 'all') {
      result = result.filter((p) => p.profileType === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.industry.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [profiles, activeFilter, search]);

  // Tab counts — shown next to each filter tab label
  const counts = useMemo(() => ({
    all:      profiles.length,
    template: profiles.filter((p) => p.profileType === 'template').length,
    custom:   profiles.filter((p) => p.profileType === 'custom').length,
    prospect: profiles.filter((p) => p.profileType === 'prospect').length,
  }), [profiles]);

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Open the profile in the Simulator Dashboard */
  function handleOpen(summary: ProfileSummary) {
    router.push(`/simulator?id=${summary.id}&type=${summary.profileType}`);
  }

  /** Open the full profile detail modal */
  async function handleViewDetails(summary: ProfileSummary) {
    setLoadingId(summary.id);
    try {
      const res = await fetch(`/api/profiles/${summary.id}?type=${summary.profileType}`);
      const data = await res.json();
      if (data.profile) {
        setSelectedProfile(data.profile);
        setIsModalOpen(true);
      } else {
        showToast('Could not load profile details.', 'error');
      }
    } catch {
      showToast('Failed to load profile.', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  /** Duplicate a profile — creates a copy in 'custom' tier */
  async function handleDuplicate(summary: ProfileSummary) {
    setLoadingId(summary.id);
    try {
      const res = await fetch(
        `/api/profiles/${summary.id}?type=${summary.profileType}&action=duplicate`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      );
      const data = await res.json();
      if (data.profile) {
        // Add the new clone to the local list as a summary projection
        const newSummary: ProfileSummary = {
          id: data.profile.id,
          name: data.profile.name,
          industry: data.profile.industry,
          profileType: data.profile.profileType,
          description: data.profile.description,
          size: data.profile.size,
          eventTypeCount: data.profile.eventTypes.length,
          workflowCount: data.profile.workflows.length,
          metadata: data.profile.metadata,
        };
        setProfiles((prev) => [newSummary, ...prev]);
        showToast(`"${data.profile.name}" created in Custom Profiles.`);
      } else {
        showToast('Could not duplicate profile.', 'error');
      }
    } catch {
      showToast('Duplicate failed.', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  /** Archive a profile — moves it to archive tier */
  async function handleArchive(summary: ProfileSummary) {
    if (!confirm(`Archive "${summary.name}"? It will be moved to your archive.`)) return;
    setLoadingId(summary.id);
    try {
      const res = await fetch(
        `/api/profiles/${summary.id}?type=${summary.profileType}&action=archive`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        setProfiles((prev) => prev.filter((p) => p.id !== summary.id));
        showToast(`"${summary.name}" archived.`);
      } else {
        showToast(data.error ?? 'Could not archive profile.', 'error');
      }
    } catch {
      showToast('Archive failed.', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  /** Delete a profile permanently */
  async function handleDelete(summary: ProfileSummary) {
    if (!confirm(`Permanently delete "${summary.name}"? This cannot be undone.`)) return;
    setLoadingId(summary.id);
    try {
      const res = await fetch(
        `/api/profiles/${summary.id}?type=${summary.profileType}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        setProfiles((prev) => prev.filter((p) => p.id !== summary.id));
        showToast(`"${summary.name}" deleted.`);
      } else {
        showToast(data.error ?? 'Could not delete profile.', 'error');
      }
    } catch {
      showToast('Delete failed.', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  /** Export a profile as a downloadable JSON file */
  async function handleExport(summary: ProfileSummary) {
    try {
      const res = await fetch(
        `/api/profiles/${summary.id}?type=${summary.profileType}&action=export`
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summary.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`"${summary.name}" exported.`);
    } catch {
      showToast('Export failed.', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ------------------------------------------------------------------- */}
      {/* App header */}
      {/* ------------------------------------------------------------------- */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <h1
            className="text-base font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="text-gradient-gold">AI Workflow</span> Simulator
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Grand Rapids, MI &nbsp;·&nbsp; Business Profile Library
          </p>
        </div>

        {/* Future: + New Profile button — wired up in Phase 4 */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: 'var(--gold-glow)',
            color: 'var(--text-gold)',
            border: '1px solid var(--border-gold)',
            cursor: 'not-allowed',
            opacity: 0.5,
          }}
          title="Profile Builder — available in Phase 4"
          disabled
        >
          + New Profile
        </button>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* Page content */}
      {/* ------------------------------------------------------------------- */}
      <main className="px-6 py-8 max-w-7xl mx-auto">

        {/* Page title */}
        <div className="mb-8">
          <h2
            className="text-2xl font-semibold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Company Profiles
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Select a profile to view details or run a simulation.
          </p>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Filter bar + search */}
        {/* --------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">

          {/* Filter tabs */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.id;
              const count = counts[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background: isActive ? 'var(--bg-card)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
                    boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                  }}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className="text-xs px-1 rounded"
                      style={{
                        background: isActive ? 'var(--gold-glow)' : 'var(--border-subtle)',
                        color: isActive ? 'var(--text-gold)' : 'var(--text-muted)',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search profiles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--border-gold)';
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--border-default)';
              }}
            />
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Profile card grid */}
        {/* --------------------------------------------------------------- */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filtered.map((profile, i) => (
              <div
                key={profile.id}
                style={{ opacity: loadingId === profile.id ? 0.5 : 1, transition: 'opacity 150ms' }}
              >
                <ProfileCard
                  profile={profile}
                  index={i}
                  onOpen={handleOpen}
                  onViewDetails={handleViewDetails}
                  onDuplicate={handleDuplicate}
                  onArchive={profile.profileType !== 'template' ? handleArchive : undefined}
                  onDelete={profile.profileType !== 'template' ? handleDelete : undefined}
                  onExport={handleExport}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center py-24 rounded-xl"
            style={{ border: '1px dashed var(--border-default)', background: 'var(--bg-surface)' }}
          >
            <p className="text-3xl mb-3">🏢</p>
            <p
              className="text-base font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {search ? `No profiles match "${search}"` : 'No profiles in this category'}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Profiles you create will appear here.'}
            </p>
          </div>
        )}

      </main>

      {/* ------------------------------------------------------------------- */}
      {/* Profile Detail Modal */}
      {/* ------------------------------------------------------------------- */}
      <ProfileDetailModal
        profile={selectedProfile}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedProfile(null); }}
      />

      {/* ------------------------------------------------------------------- */}
      {/* Toast notification */}
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
