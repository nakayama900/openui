import { useStore } from "zustand";
import { useThreadContextStore } from "../store/ThreadContextContext";
import type { AppEntry } from "../store/threadContextTypes";

/**
 * Returns all apps registered in the active thread, grouped by `id` and sorted
 * ascending by `version`. The latest version of each app is the last element.
 *
 * Use this for sidebar lists, app pickers, or any UI that enumerates apps
 * attached to the current thread.
 *
 * Must be called within a `<ChatProvider>`.
 *
 * @category Hooks
 * @returns Map of app id → ordered version list
 *
 * @example
 * ```tsx
 * function AppSidebar() {
 *   const apps = useAppList();
 *   const latest = Object.values(apps).map((versions) => versions[versions.length - 1]);
 *   return (
 *     <ul>
 *       {latest.map((app) => (
 *         <li key={app.id}>{app.heading}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAppList(): Record<string, AppEntry[]> {
  const store = useThreadContextStore();
  return useStore(store, (s) => s.apps);
}
