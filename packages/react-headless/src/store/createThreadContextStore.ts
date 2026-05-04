import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AppEntry, ArtifactEntry, ThreadContextStore } from "./threadContextTypes";

type RegistryEntry = AppEntry | ArtifactEntry;

const upsertVersion = <T extends RegistryEntry>(
  registry: Record<string, T[]>,
  entry: T,
): Record<string, T[]> => {
  const existing = registry[entry.id] ?? [];
  const sameVersionIdx = existing.findIndex((e) => e.version === entry.version);

  if (sameVersionIdx !== -1) {
    const current = existing[sameVersionIdx]!;
    if (current.heading === entry.heading) return registry;
    const next = existing.slice();
    next[sameVersionIdx] = entry;
    return { ...registry, [entry.id]: next };
  }

  // Insert sorted ascending by version.
  const insertIdx = existing.findIndex((e) => e.version > entry.version);
  const next =
    insertIdx === -1
      ? [...existing, entry]
      : [...existing.slice(0, insertIdx), entry, ...existing.slice(insertIdx)];
  return { ...registry, [entry.id]: next };
};

const removeVersion = <T extends RegistryEntry>(
  registry: Record<string, T[]>,
  id: string,
  version: number,
): Record<string, T[]> => {
  const existing = registry[id];
  if (!existing) return registry;
  const idx = existing.findIndex((e) => e.version === version);
  if (idx === -1) return registry;

  if (existing.length === 1) {
    const { [id]: _removed, ...rest } = registry;
    return rest;
  }

  const next = existing.slice();
  next.splice(idx, 1);
  return { ...registry, [id]: next };
};

/**
 * Creates a Zustand store managing the per-thread registries of apps and artifacts.
 *
 * Active detailed-view state lives in a separate store
 * (see {@link useDetailedView} / {@link useActiveDetailedView}) — TC tracks
 * what's *attached* to the thread; detailed-view state tracks what's *visible*.
 *
 * Instantiated once by `ChatProvider` — consumers should not call this directly.
 *
 * @internal
 */
export const createThreadContextStore = () => {
  return createStore<ThreadContextStore>()(
    subscribeWithSelector((set) => ({
      apps: {},
      artifacts: {},

      registerApp: (entry) => {
        set((s) => ({ apps: upsertVersion(s.apps, entry) }));
      },

      unregisterApp: (id, version) => {
        set((s) => ({ apps: removeVersion(s.apps, id, version) }));
      },

      registerArtifact: (entry) => {
        set((s) => ({ artifacts: upsertVersion(s.artifacts, entry) }));
      },

      unregisterArtifact: (id, version) => {
        set((s) => ({ artifacts: removeVersion(s.artifacts, id, version) }));
      },

      reset: () => {
        set({ apps: {}, artifacts: {} });
      },
    })),
  );
};
