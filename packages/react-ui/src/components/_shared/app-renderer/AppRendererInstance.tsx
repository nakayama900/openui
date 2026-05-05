import {
  useDetailedView,
  useThreadContextStore,
  type AppRendererConfig,
  type AppRendererControls,
} from "@openuidev/react-headless";
import { useEffect, useId, useMemo } from "react";
import { DetailedViewPanel } from "../detailed-view";

/**
 * Renders a matched AppRenderer for a single tool call/response.
 *
 * Lifecycle:
 * 1. Run `parser({ args, response })` to derive Props.
 * 2. Run `meta(props, ctx)` to derive ThreadContext entry.
 * 3. If meta returns non-null, register the entry on mount; unregister on unmount.
 * 4. Render `preview(props, controls)` inline + `<DetailedViewPanel>` containing
 *    `actual(props, controls)` for the side panel.
 *
 * If `parser` returns `null`, renders nothing (caller should fall back).
 * If `meta` returns `null`, renders inline + panel but skips ThreadContext registration —
 * a fallback `viewId` derived from `useId()` is used so `controls` remain functional.
 *
 * Internal — consumers should use {@link ToolMessageRenderer}.
 *
 * @internal
 */
export function AppRendererInstance<Props>({
  renderer,
  args,
  response,
}: {
  renderer: AppRendererConfig<Props>;
  args: unknown;
  response: unknown;
}) {
  const fallbackId = useId();
  const tcStore = useThreadContextStore();

  const props = useMemo(() => renderer.parser({ args, response }), [renderer, args, response]);

  const meta = useMemo(() => {
    if (props === null) return null;
    return renderer.meta(props, { isStreaming: false });
  }, [renderer, props]);

  // viewId derives from meta when present, otherwise from React's useId
  // so `controls.open` still works for an inline-only renderer.
  const viewId = meta ? `${meta.id}:${meta.version}` : fallbackId;

  // Register entry on mount; unregister on unmount or when (id, version) changes.
  // Heading-only changes upsert via the store's idempotent registerApp.
  useEffect(() => {
    if (!meta) return;
    tcStore.getState().registerApp(meta);
    return () => {
      tcStore.getState().unregisterApp(meta.id, meta.version);
    };
  }, [tcStore, meta?.id, meta?.version, meta?.heading]); // eslint-disable-line react-hooks/exhaustive-deps

  const { isActive, open, close, toggle } = useDetailedView(viewId);

  if (props === null) return null;

  const controls: AppRendererControls = {
    isActive,
    open,
    close,
    toggle,
    isStreaming: false,
  };

  return (
    <>
      {renderer.preview(props, controls)}
      <DetailedViewPanel viewId={viewId} title={meta?.heading ?? "Detailed view"}>
        {renderer.actual(props, controls)}
      </DetailedViewPanel>
    </>
  );
}
