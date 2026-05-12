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
  /**
   * `true` while the tool call is still streaming — i.e. its arguments are
   * arriving incrementally and no tool result has been paired in yet. Becomes
   * `false` once the tool result message lands and the renderer is invoked
   * with the full `response`.
   *
   * The same component instance is reused across the streaming → completed
   * transition, so renderers can rely on this flag to swap UI states (e.g.
   * show a skeleton or "streaming…" badge during partial args, then the final
   * view) without remounting.
   */
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
   * does not pre-parse JSON. Return `null` to skip rendering this tool call.
   *
   * Called on every update to args or response, including during streaming.
   * Implementations must therefore be tolerant of:
   *  - `args` as a *partial* JSON string (the LLM is still emitting it), and
   *  - `response` as `null` (the tool result hasn't arrived yet — see
   *    {@link AppRendererControls.isStreaming}).
   *
   * Once the tool call completes, the parser is re-invoked with full `args`
   * and a non-null `response`. Returning a stable `Props` shape across the
   * streaming → completed transition lets the same renderer instance update
   * smoothly without remounting.
   */
  parser: (raw: { args: unknown; response: unknown }) => Props | null;
  /**
   * Derives the registry entry fields for ThreadContext.
   *
   * Return `null` to skip registration (the renderer still renders if `parser`
   * returned non-null Props, but the entry will not appear in the apps/artifacts list).
   * A common pattern is to return `null` while `ctx.isStreaming === true` so the
   * entry only appears in the registry once the tool result has arrived.
   *
   * The `id` should be stable across re-runs of the same logical entry — when
   * `(id, version)` changes, the registry entry is unregistered and re-registered.
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
