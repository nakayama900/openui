"use client";

import { useDetailedView } from "@openuidev/react-headless";
import type { ComponentRenderer } from "@openuidev/react-lang";
import { useId, type ReactNode } from "react";
import {
  DetailedViewPanel,
  type DetailedViewPanelProps,
} from "../components/_shared/detailed-view";

/**
 * Controls injected into `preview` and `actual` render functions.
 */
export interface DetailedViewControls {
  /** Whether this view is the currently active (visible) one. */
  isActive: boolean;
  /** Activates this view. */
  open: () => void;
  /** Deactivates this view. */
  close: () => void;
  /** Toggles this view: opens if closed, closes if open. */
  toggle: () => void;
}

/**
 * Configuration for {@link DetailedView}.
 */
export interface DetailedViewConfig<P = Record<string, unknown>> {
  /** Panel title — static string or derived from props. */
  title: string | ((props: P) => string);
  /** Renders the inline preview shown in the chat message. */
  preview: (props: P, controls: DetailedViewControls) => ReactNode;
  /** Renders the content inside the detailed-view side panel. */
  actual: (props: P, controls: DetailedViewControls) => ReactNode;
  /** Optional props forwarded to the underlying `<DetailedViewPanel>`. */
  panelProps?: Pick<DetailedViewPanelProps, "className" | "errorFallback" | "header">;
}

/**
 * Factory that returns a `ComponentRenderer<P>` wiring up `useId`, `useDetailedView`,
 * and `<DetailedViewPanel>` internally. Pass the result as `defineComponent`'s `component`.
 *
 * @example
 * ```tsx
 * export const DetailedViewCodeBlock = defineComponent({
 *   name: "DetailedViewCodeBlock",
 *   props: DetailedViewCodeBlockSchema,
 *   description: "Code block that opens in the detailed-view side panel",
 *   component: DetailedView({
 *     title: (props) => props.title,
 *     preview: (props, { open, isActive }) => (
 *       <InlinePreview title={props.title} onOpen={open} isActive={isActive} />
 *     ),
 *     actual: (props) => (
 *       <CodeView language={props.language} codeString={props.codeString} />
 *     ),
 *   }),
 * });
 * ```
 */
export function DetailedView<P = Record<string, unknown>>(
  config: DetailedViewConfig<P>,
): ComponentRenderer<P> {
  const { title, preview, actual, panelProps } = config;

  const DetailedViewComponent: ComponentRenderer<P> = ({ props }) => {
    const viewId = useId();
    const { isActive, open, close, toggle } = useDetailedView(viewId);

    const controls: DetailedViewControls = { isActive, open, close, toggle };
    const resolvedTitle = typeof title === "function" ? title(props) : title;

    return (
      <>
        {preview(props, controls)}
        <DetailedViewPanel viewId={viewId} title={resolvedTitle} {...panelProps}>
          {actual(props, controls)}
        </DetailedViewPanel>
      </>
    );
  };

  DetailedViewComponent.displayName = `DetailedView(${typeof title === "string" ? title : "dynamic"})`;

  return DetailedViewComponent;
}
