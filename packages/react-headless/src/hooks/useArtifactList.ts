import { useStore } from "zustand";
import { useThreadContextStore } from "../store/ThreadContextContext";
import type { ArtifactEntry } from "../store/threadContextTypes";

/**
 * Returns all artifacts registered in the active thread, grouped by `id` and
 * sorted ascending by `version`. The latest version of each artifact is the
 * last element.
 *
 * Use this for sidebar lists, artifact pickers, or any UI that enumerates
 * artifacts attached to the current thread.
 *
 * Must be called within a `<ChatProvider>`.
 *
 * @category Hooks
 * @returns Map of artifact id → ordered version list
 *
 * @example
 * ```tsx
 * function ArtifactSidebar() {
 *   const artifacts = useArtifactList();
 *   const latest = Object.values(artifacts).map((versions) => versions[versions.length - 1]);
 *   return (
 *     <ul>
 *       {latest.map((artifact) => (
 *         <li key={artifact.id}>{artifact.heading}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useArtifactList(): Record<string, ArtifactEntry[]> {
  const store = useThreadContextStore();
  return useStore(store, (s) => s.artifacts);
}
