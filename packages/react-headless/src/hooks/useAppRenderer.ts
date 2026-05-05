import { lookupAppRenderer, useAppRendererRegistry } from "../store/AppRenderersContext";
import type { AppRendererConfig } from "../store/appRendererTypes";

/**
 * Resolves the AppRenderer config matching a given `toolName`, or `null` if none match.
 *
 * Thin React wrapper over {@link lookupAppRenderer}: reads the registry from
 * `<ChatProvider>` context and runs the lookup. See `lookupAppRenderer` for
 * matching rules and dev-mode ambiguity warnings.
 *
 * Returns `null` if no `appRenderers` were supplied to the provider — callers
 * should fall back to default rendering in that case.
 *
 * @category Hooks
 *
 * @example
 * ```tsx
 * function ToolResultDispatcher({ toolName, ...rest }) {
 *   const renderer = useAppRenderer(toolName);
 *   if (!renderer) return <DefaultToolResult {...rest} />;
 *   return <AppRendererBridge renderer={renderer} {...rest} />;
 * }
 * ```
 */
export function useAppRenderer(toolName: string): AppRendererConfig<unknown> | null {
  const registry = useAppRendererRegistry();
  if (!registry) return null;
  return lookupAppRenderer(registry, toolName);
}
