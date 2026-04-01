/**
 * engine/contentPoolManager.ts
 *
 * Manages content pool access for the event generator.
 *
 * Content pools are the named arrays of pre-written text strings stored
 * in each event type's `contentPools` object (e.g. `problemDescriptions`,
 * `reviewTexts`, `inquiryDescriptions`). When an event field has
 * dataType: "contentPool", the generator calls this manager to pick an entry.
 *
 * Features:
 *   - Random selection from a named pool
 *   - Anti-repeat logic: tracks recently used entries per pool per profile
 *     so the same text doesn't appear consecutively in a simulation run
 *   - Graceful fallback when pools are empty (Phase 2 placeholder behavior)
 *   - Pool stats: how many entries, how many recently used
 *
 * The recent-use window is configurable. Default: avoid repeating any of
 * the last N entries where N = min(poolSize/2, 10).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Tracks recently-used indices per pool to avoid consecutive repeats. */
interface PoolTracker {
  /** Key: `${profileId}:${eventTypeId}:${poolKey}` */
  recentIndices: Map<string, number[]>;
}

// ---------------------------------------------------------------------------
// Module-level state (singleton tracker per runtime session)
// ---------------------------------------------------------------------------

/**
 * The tracker is a module-level singleton so it persists across multiple
 * event generations within the same simulation session.
 * It resets when the module is re-imported (i.e. on server restart).
 */
const tracker: PoolTracker = {
  recentIndices: new Map(),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pick a random entry from a content pool, avoiding recent repeats.
 *
 * @param pool        The array of text strings to pick from.
 * @param trackingKey A unique key for this pool (prevents cross-pool interference).
 *                    Convention: `${profileId}:${eventTypeId}:${poolKey}`
 * @returns           A randomly selected string from the pool.
 */
export function pickFromPool(pool: string[], trackingKey: string): string {
  if (pool.length === 0) {
    // Phase 2 fallback: pool hasn't been populated yet
    return '[Content pool not yet populated — will be filled in Phase 2]';
  }

  if (pool.length === 1) {
    return pool[0];
  }

  // Determine how large the "do not repeat" window should be
  // For small pools: avoid last 1-2 entries. For large pools: avoid last 10.
  const windowSize = Math.min(Math.floor(pool.length / 2), 10);

  const recentlyUsed = tracker.recentIndices.get(trackingKey) ?? [];

  // Build list of available indices (those not in the recent window)
  const available = pool
    .map((_, i) => i)
    .filter((i) => !recentlyUsed.includes(i));

  // If somehow all indices are excluded (tiny pool), allow any
  const candidates = available.length > 0 ? available : pool.map((_, i) => i);

  const chosenIndex = candidates[Math.floor(Math.random() * candidates.length)];

  // Update the tracker — keep only the last `windowSize` entries
  const updated = [...recentlyUsed, chosenIndex].slice(-windowSize);
  tracker.recentIndices.set(trackingKey, updated);

  return pool[chosenIndex];
}

/**
 * Clear the recent-use history for a specific pool or all pools.
 * Call this at the start of a new simulation run to reset anti-repeat state.
 *
 * @param trackingKey If provided, clears only that pool's history.
 *                    If omitted, clears all history.
 */
export function clearPoolHistory(trackingKey?: string): void {
  if (trackingKey) {
    tracker.recentIndices.delete(trackingKey);
  } else {
    tracker.recentIndices.clear();
  }
}

/**
 * Get stats for a pool — useful for the Profile Builder's pool editor.
 */
export function getPoolStats(pool: string[], trackingKey: string): {
  total: number;
  recentlyUsed: number;
  availableNow: number;
} {
  const recentlyUsed = tracker.recentIndices.get(trackingKey) ?? [];
  const windowSize = Math.min(Math.floor(pool.length / 2), 10);
  const activeWindow = recentlyUsed.slice(-windowSize);

  return {
    total: pool.length,
    recentlyUsed: activeWindow.length,
    availableNow: Math.max(0, pool.length - activeWindow.length),
  };
}

/**
 * Build a standardized tracking key for a pool.
 * Centralizes the key format so it's consistent everywhere.
 */
export function buildTrackingKey(
  profileId: string,
  eventTypeId: string,
  poolKey: string
): string {
  return `${profileId}:${eventTypeId}:${poolKey}`;
}
