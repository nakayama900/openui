import { html } from "@arrow-js/core";
import { defineComponent, getTriggerAction, type ComponentRenderer } from "@openuidev/arrow-lang";
import { z } from "zod/v4";

const buttonStyle =
  "border:1px solid #d1d5db;border-radius:0.5rem;background:#111827;color:#fff;padding:0.5rem 0.875rem;cursor:pointer;";
const cardStyle =
  "border:1px solid #e5e7eb;border-radius:0.75rem;background:#fff;color:#111827;padding:1rem;box-shadow:0 1px 2px rgb(0 0 0 / 0.05);";
const stackBaseStyle = "display:flex;gap:0.75rem;";

function renderChildren(rendered: unknown): any[] {
  return (Array.isArray(rendered) ? rendered : [rendered]).filter((item) => item != null);
}

export const TextContent = defineComponent({
  name: "TextContent",
  props: z.object({
    text: z.string(),
    variant: z.enum(["body", "muted", "title", "code"]).optional(),
  }),
  description: "Displays a block of text.",
  component: ({ props }) => {
    const variant = props.variant ?? "body";
    if (variant === "title") {
      return html`<h3 style="font-size:1.125rem;font-weight:600;margin:0;">${props.text}</h3>`;
    }
    if (variant === "muted") {
      return html`<p style="color:#6b7280;margin:0;">${props.text}</p>`;
    }
    if (variant === "code") {
      return html`<code
        style="font-family:monospace;background:#f3f4f6;border-radius:0.375rem;padding:0.125rem 0.25rem;"
        >${props.text}</code
      >`;
    }
    return html`<p style="margin:0;">${props.text}</p>`;
  },
});

export const Button = defineComponent({
  name: "Button",
  props: z.object({
    label: z.string(),
    actionLabel: z.string().optional(),
  }),
  description: "A button that can trigger a continue-conversation action.",
  component: ({ props }) => {
    const triggerAction = getTriggerAction();
    return html`<button
      style=${buttonStyle}
      @click=${() => triggerAction(props.actionLabel ?? props.label)}
    >
      ${props.label}
    </button>`;
  },
});

export const Stack = defineComponent({
  name: "Stack",
  props: z.object({
    children: z.array(z.union([TextContent.ref, Button.ref])),
    direction: z.enum(["row", "column"]).optional(),
    wrap: z.boolean().optional(),
  }),
  description: "Arranges child components in a row or column.",
  component: ({ props, renderNode }) => {
    const direction = props.direction ?? "column";
    const wrap = props.wrap ? "flex-wrap:wrap;" : "";
    return html`<div style=${`${stackBaseStyle}flex-direction:${direction};${wrap}`}>
      ${renderChildren(renderNode(props.children))}
    </div>`;
  },
});

export const Card = defineComponent({
  name: "Card",
  props: z.object({
    title: z.string().optional(),
    children: z.array(z.union([TextContent.ref, Button.ref, Stack.ref])).optional(),
  }),
  description: "A bordered content container with an optional title.",
  component: ({ props, renderNode }) =>
    html`<section style=${cardStyle}>
      ${props.title
        ? html`<h2 style="font-size:1rem;font-weight:600;margin:0 0 0.75rem;">${props.title}</h2>`
        : null}
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        ${renderChildren(renderNode(props.children ?? []))}
      </div>
    </section>`,
});

export const arrowComponents = [TextContent, Button, Stack, Card];

export type ArrowUIComponent = (typeof arrowComponents)[number];
export type ArrowUIRenderer = ComponentRenderer<any>;
