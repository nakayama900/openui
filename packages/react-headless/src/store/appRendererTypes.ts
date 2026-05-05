import type { ReactNode } from "react";

/**
 * Which ThreadContext slice the renderer registers into when matched.
 *
 * - `"app"` (default): registers in the `apps` slice (read via `useAppList`).
 * - `"artifact"`: registers in the `artifacts` slice (read via `useArtifactList`).
 *
 * Both kinds share the same renderer shape (parser, meta, preview, actual) and
 * the same active-detailed-view slot — the kind only routes registry membership.
 *
 * @category Types
 */
export type AppRendererKind = "app" | "artifact";

/**
 * Controls passed to a renderer's `preview` and `actual` render functions.
 *
 * @category Types
 */
export interface AppRendererControls {
  /** Whether this renderer's detailed view is the currently active one. */
  isActive: boolean;
  /** Whether the underlying tool response is still streaming (always `false` in v1; reserved for streaming protocol). */
  isStreaming: boolean;
  /** Activates this renderer's detailed view. */
  open: () => void;
  /** Closes this renderer's detailed view if currently active. */
  close: () => void;
  /** Toggles this renderer's detailed view. */
  toggle: () => void;
}

/**
 * Configuration for a single app or artifact renderer, returned by
 * {@link defineAppRenderer} or {@link defineArtifactRenderer}.
 *
 * Renderers are matched against tool calls by `toolName` (literal string or RegExp).
 * When a match fires, `parser` converts the raw tool envelope into typed `Props`,
 * `meta` derives the registry entry (id, version, heading), and `preview` / `actual`
 * render the inline chat preview and side-panel detailed view respectively.
 *
 * The `kind` field controls which ThreadContext slice the entry registers into;
 * defaults to `"app"`.
 *
 * @category Types
 */
export interface AppRendererConfig<Props = unknown> {
  /**
   * Tool name to match. Literal strings take priority over regex; first match wins.
   *
   * String example: `"create_presentation"`.
   * Regex example: `/^presentation_/`.
   */
  toolName: string | RegExp;
  /**
   * Which ThreadContext slice this renderer registers into. Defaults to `"app"`.
   */
  kind?: AppRendererKind;
  /**
   * Converts the raw tool envelope into renderer-shaped `Props`.
   *
   * Receives `{ args, response }` exactly as the backend emitted them — the SDK
   * does not pre-parse JSON. Return `null` to skip rendering this tool result.
   */
  parser: (raw: { args: unknown; response: unknown }) => Props | null;
  /**
   * Derives the registry entry fields for ThreadContext.
   *
   * Return `null` to skip registration (the renderer still renders if `parser`
   * returned non-null Props, but the entry will not appear in the apps/artifacts list).
   *
   * The `id` should be stable across re-runs of the same logical entry.
   */
  meta: (
    props: Props,
    ctx: { isStreaming: boolean },
  ) => { id: string; version: number; heading: string } | null;
  /** Renders the inline preview shown in the chat message. */
  preview: (props: Props, controls: AppRendererControls) => ReactNode;
  /** Renders the content displayed in the detailed-view side panel. */
  actual: (props: Props, controls: AppRendererControls) => ReactNode;
}

/**
 * Identity helper that returns its argument while preserving `Props` inference,
 * and tags `kind` as `"app"` so the entry registers into the apps slice.
 *
 * Without this, users would have to write `const r: AppRendererConfig<MyProps> = {...}`
 * to get type checking. With it, `defineAppRenderer({...})` infers `Props` from
 * `parser`'s return type.
 *
 * @category Functions
 *
 * @example
 * ```ts
 * const dashboardRenderer = defineAppRenderer({
 *   toolName: "create_dashboard",
 *   parser: (raw) => raw.response as { id: string; widgets: Widget[] },
 *   meta: (props) => ({ id: props.id, version: 1, heading: `Dashboard ${props.id}` }),
 *   preview: (props, controls) => <DashboardCard onOpen={controls.open} />,
 *   actual: (props) => <DashboardView widgets={props.widgets} />,
 * });
 * ```
 */
export function defineAppRenderer<Props>(
  config: Omit<AppRendererConfig<Props>, "kind">,
): AppRendererConfig<Props> {
  return { ...config, kind: "app" };
}

/**
 * Identity helper that returns its argument while preserving `Props` inference,
 * and tags `kind` as `"artifact"` so the entry registers into the artifacts slice.
 *
 * Same shape as {@link defineAppRenderer}; the only difference is which
 * ThreadContext list the entry appears in.
 *
 * @category Functions
 *
 * @example
 * ```ts
 * const presentationRenderer = defineArtifactRenderer({
 *   toolName: "create_presentation",
 *   parser: (raw) => raw.response as { id: string; slides: Slide[] },
 *   meta: (props) => ({ id: props.id, version: 1, heading: `Presentation ${props.id}` }),
 *   preview: (props, controls) => <PresentationCard onOpen={controls.open} />,
 *   actual: (props) => <SlideDeck slides={props.slides} />,
 * });
 * ```
 */
export function defineArtifactRenderer<Props>(
  config: Omit<AppRendererConfig<Props>, "kind">,
): AppRendererConfig<Props> {
  return { ...config, kind: "artifact" };
}
