import type { ReactNode } from "react";

/**
 * Controls passed to an AppRenderer's `preview` and `actual` render functions.
 *
 * @category Types
 */
export interface AppRendererControls {
  /** Whether this app's detailed view is the currently active one. */
  isActive: boolean;
  /** Whether the underlying tool response is still streaming (always `false` in v1; reserved for streaming protocol). */
  isStreaming: boolean;
  /** Activates this app's detailed view. */
  open: () => void;
  /** Closes this app's detailed view if currently active. */
  close: () => void;
  /** Toggles this app's detailed view. */
  toggle: () => void;
}

/**
 * Configuration for a single app renderer, returned by {@link defineAppRenderer}.
 *
 * Renderers are matched against tool calls by `toolName` (literal string or RegExp).
 * When a match fires, `parser` converts the raw tool envelope into typed `Props`,
 * `meta` derives the registry entry (id, version, heading), and `preview` / `actual`
 * render the inline chat preview and side-panel detailed view respectively.
 *
 * @category Types
 */
export interface AppRendererConfig<Props = unknown> {
  /**
   * Tool name to match. Literal strings take priority over regex; first match wins.
   *
   * String example: `"presentation:create"`.
   * Regex example: `/^presentation:/`.
   */
  toolName: string | RegExp;
  /**
   * Converts the raw tool envelope into renderer-shaped `Props`.
   *
   * Receives `{ args, response }` exactly as the backend emitted them — the SDK
   * does not pre-parse JSON. Return `null` to skip rendering this tool result.
   */
  parser: (raw: { args: unknown; response: unknown }) => Props | null;
  /**
   * Derives the {@link AppEntry} fields registered in ThreadContext.
   *
   * Return `null` to skip registration (the renderer still renders if `parser`
   * returned non-null Props, but the entry will not appear in the apps list).
   *
   * The `id` should be stable across re-runs of the same logical app.
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
 * Identity helper that returns its argument while preserving `Props` inference.
 *
 * Without this, users would have to write `const r: AppRendererConfig<MyProps> = {...}`
 * to get type checking. With it, `defineAppRenderer({...})` infers `Props` from
 * `parser`'s return type.
 *
 * @category Functions
 *
 * @example
 * ```ts
 * const presentationRenderer = defineAppRenderer({
 *   toolName: "presentation:create",
 *   parser: (raw) => raw.response as { id: string; slides: Slide[] },
 *   meta: (props) => ({ id: props.id, version: 1, heading: `Presentation ${props.id}` }),
 *   preview: (props, controls) => <PresentationCard onOpen={controls.open} />,
 *   actual: (props) => <SlideViewer slides={props.slides} />,
 * });
 * ```
 */
export function defineAppRenderer<Props>(
  config: AppRendererConfig<Props>,
): AppRendererConfig<Props> {
  return config;
}
