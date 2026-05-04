/**
 * A registered app entry in the per-thread context.
 *
 * Apps are interactive surfaces (e.g. dashboards) produced by tool calls.
 * Versions for the same `id` are kept in an ordered list so the sidebar
 * can show history; the latest version (highest `version` number) is the
 * default open target.
 *
 * @category Types
 */
export type AppEntry = {
  id: string;
  version: number;
  heading: string;
};

/**
 * A registered artifact entry in the per-thread context.
 *
 * Artifacts are durable structured outputs (e.g. presentations, reports)
 * produced by tool calls. Same shape as {@link AppEntry} for now —
 * separate type so future fields can diverge without a discriminated union.
 *
 * @category Types
 */
export type ArtifactEntry = {
  id: string;
  version: number;
  heading: string;
};

/**
 * Read-only state slice for the ThreadContext.
 *
 * @category Types
 */
export type ThreadContextState = {
  /** Apps registered in the active thread, grouped by `id`, sorted ascending by `version`. */
  apps: Record<string, AppEntry[]>;
  /** Artifacts registered in the active thread, grouped by `id`, sorted ascending by `version`. */
  artifacts: Record<string, ArtifactEntry[]>;
};

/**
 * Actions for managing the ThreadContext.
 *
 * @category Types
 */
export type ThreadContextActions = {
  /**
   * Upserts an app entry by `(id, version)`.
   *
   * - If no entry with the same `id` exists, creates a new bucket.
   * - If a different `version` exists, inserts and keeps versions sorted ascending.
   * - If the same `(id, version)` exists, updates `heading` (no-op when unchanged).
   */
  registerApp: (entry: AppEntry) => void;
  /** Removes an app version. No-op if `(id, version)` is not registered. */
  unregisterApp: (id: string, version: number) => void;
  /**
   * Upserts an artifact entry by `(id, version)`. See {@link registerApp} for semantics.
   */
  registerArtifact: (entry: ArtifactEntry) => void;
  /** Removes an artifact version. No-op if `(id, version)` is not registered. */
  unregisterArtifact: (id: string, version: number) => void;
  /**
   * Clears all registries. Called automatically on thread switch.
   */
  reset: () => void;
};

/** Combined ThreadContext store type (state + actions). */
export type ThreadContextStore = ThreadContextState & ThreadContextActions;
