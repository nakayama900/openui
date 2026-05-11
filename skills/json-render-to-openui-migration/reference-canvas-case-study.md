# Reference: Canvas Migration Case Study

This is the worked example the `json-render-to-openui-migration` skill was distilled from. Read it when a phase's general guidance leaves a step ambiguous and you want to see exactly how it was resolved in the canvas case.

> **Heads-up on canvas-specific noise.** Anything below mentioning Recharts, kibo-ui, reui, `stripLinks`, `sanitizeInlineHtml`, `canvas-stagger`, `temperature: 0`, `seed: 42`, the 23 specific component names, or the chart-rule content of `customRules` is **canvas-specific**. The general pattern lives in `SKILL.md`; this doc is for transferring intuition, not copy-paste.

---

## Inputs (resolved for canvas)

| Skill input | Canvas value |
|---|---|
| `MODULE_NAME` | `canvas` |
| `CATALOG_PATH` | `lib/canvas/catalog.ts` |
| `REGISTRY_PATH` | `lib/canvas/registry.tsx` |
| `WRAPPER_VIEW_PATH` | `components/canvas-renderer.tsx` (`CanvasRendererView`) |
| `STREAM_PIPELINE_PATH` | `app/api/search/route.ts` (the `pipeJsonRender` call gated by `group === 'canvas'`) |
| `SYSTEM_PROMPT_PATH` | `lib/search/group-config.ts` (the `'server-only'` module that calls `canvasCatalog.prompt(...)`) |
| `MESSAGE_PARTS_PATH` | `components/message-parts/index.tsx` (`useJsonRenderMessage`, `SPEC_DATA_PART_TYPE`) |
| `TYPES_PATH` | `lib/types.ts` (`SpecDataPart` import + `spec:` data-type entry) |
| `FENCE_NAME` | `spec` (the existing prompt already instructed the model to emit ` ```spec ` blocks) |
| `ROOT_COMPONENT` | `Stack` (most existing dashboards already wrapped in one) |
| `IS_PROMPT_SERVER_ONLY` | **Yes** — `group-config.ts` is `'server-only'`, so the 3-file split was required |
| `LOCKFILES` | `bun.lock` and `pnpm-lock.yaml` both present — both updated |
| `ROLLOUT_STRATEGY` | `hard-cutover` (no feature flag was used in the canvas migration; this is a deliberate project choice, not a recommendation) |

## Component count

23 components ported: Stack, Card, Grid, Heading, Text, Badge, Alert, Separator, Metric, Table, Link, Image, BarChart, LineChart, PieChart, Callout, Accordion, Timeline, StatComparison, Quote, KPIRow, LayerCard, SourceCard.

## Resolved verification flags (canvas-specific outcomes)

- **`$state` bindings:** Several catalog entries (`Table`, `LineChart`, `PieChart`) documented `$state` bindings, but the model was already inlining data in practice — the `$state` lines were dropped from component descriptions, no behavior change observed.
- **`actions` map:** Empty `{}` in `defineCatalog`. `ActionProvider` removed safely.
- **Custom `fallback` renderer:** A trivial `Fallback` component existed; not ported (OpenUI's built-in unknown-element handling is sufficient for display-only dashboards).
- **`useJsonRenderMessage` semantics:** Plain extraction; no hidden deduping logic. Replaced cleanly with `extractSpecBlock`.
- **Children-eligible component set:** Loose `z.array(z.any()).nullable()` chosen. The plan suggested an explicit union; the implementer found `z.array(z.any())` simpler and equally effective. **Lesson: default to loose unless strict is requested.**
- **Existing fence convention:** Confirmed — the prompt already used ` ```spec `. Kept the same fence name.
- **Existing memoization:** `CanvasRendererView` was `memo`'d on `spec`; new version is `memo`'d on `response`.

---

## File outputs (3-file split)

Because `lib/search/group-config.ts` is `'server-only'`, the canvas migration could not import a `'use client'` library file from the prompt builder. Resolved with the 3-file split:

```
lib/canvas/
├── components-meta.ts    # pure data — Zod schemas + descriptions
├── library.tsx           # 'use client' — defineComponent({ ...Meta, component: <JSX/> })
└── library-spec.ts       # server-safe — same createLibrary call but components stubbed
```

`components-meta.ts` exports objects like:

```ts
export const StackMeta = {
  name: "Stack",
  description: "Flex layout container",
  props: z.object({
    direction: z.enum(["horizontal", "vertical"]).nullable(),
    gap: z.enum(["sm", "md", "lg"]).nullable(),
    wrap: z.boolean().nullable(),
    children: z.array(z.any()).nullable(),
  }),
} as const;
```

`library.tsx` consumes them:

```tsx
const Stack = defineComponent({
  ...StackMeta,
  component: ({ props, renderNode }: ComponentRenderProps<typeof StackMeta.props>) => (
    <div className={...}>{renderChildren(renderNode, props.children)}</div>
  ),
});

export const canvasLibrary = createLibrary({ root: "Stack", components: [Stack, Card, Grid, ...] });
```

`library-spec.ts` is the server-safe twin used **only** by the prompt builder:

```ts
const stub = undefined as unknown as never;
export const canvasLibrarySpec = createLibrary({
  root: "Stack",
  components: [
    defineComponent({ ...StackMeta, component: stub }),
    defineComponent({ ...CardMeta, component: stub }),
    // ...
  ],
});
```

`library.prompt()` only reads schemas, names, and descriptions — never the renderer — so the stub is safe.

---

## Phase 3 cutover diff (canvas)

The canvas migration landed all of Phase 3 in a single commit. The relevant hunks:

### Stream pipeline (`app/api/search/route.ts`)

```diff
-      dataStream.merge(
-        (group === 'canvas' ? pipeJsonRender(uiMessageStream) : uiMessageStream) as AsyncIterableStream<...>
-      );
+      dataStream.merge(uiMessageStream as AsyncIterableStream<InferUIMessageChunk<ChatMessage>>);
```

### Wrapper view (`components/canvas-renderer.tsx`)

```diff
-import { type Spec } from "@json-render/react";
 import { CanvasRenderer as CanvasRendererCore } from "@/lib/canvas/renderer";

 interface CanvasRendererProps {
-  spec: Spec | null;
+  response: string | null;
   loading?: boolean;
 }

 export const CanvasRendererView = memo(function CanvasRendererView({
-  spec,
+  response,
   loading,
 }: CanvasRendererProps) {
-  if (!spec && !loading) return null;
-  if (spec) {
-    return <CanvasRendererCore spec={spec} loading={loading} />;
-  }
+  if (!response && !loading) return null;
+  if (response) {
+    return <CanvasRendererCore response={response} loading={loading} />;
+  }
   // Loading skeleton ... (unchanged)
```

### Renderer wrapper (`lib/canvas/renderer.tsx`)

The providers (`StateProvider` / `VisibilityProvider` / `ActionProvider`), the `sanitizeSpec` shim, and the explicit `fallback` were all dropped. The `canvas-stagger` class was preserved.

```tsx
import { Renderer } from "@openuidev/react-lang";
import { canvasLibrary } from "./library";

export function CanvasRenderer({ response, loading }: { response: string | null; loading?: boolean }) {
  if (!response) return null;
  return (
    <div className={loading ? "" : "canvas-stagger"}>
      <Renderer response={response} library={canvasLibrary} isStreaming={loading} />
    </div>
  );
}
```

### Message parts (`components/message-parts/index.tsx`)

Two helpers added (these are the general extraction pattern — recommended verbatim):

```ts
function extractSpecBlock(text: string): string | null {
  const open = text.match(/```spec\s*\n/);
  if (!open) return null;
  const startIdx = open.index! + open[0].length;
  const rest = text.slice(startIdx);
  const closeIdx = rest.indexOf('```');
  return closeIdx >= 0 ? rest.slice(0, closeIdx) : rest;
}

function stripSpecBlock(text: string): string {
  return text.replace(/```spec\s*\n[\s\S]*?(?:```|$)/g, '').trim();
}
```

`CanvasSpecRenderer` was rewritten to concatenate text parts, run `extractSpecBlock`, and pass `response` to `CanvasRendererView`. `cleanText` (the input to the markdown renderer) was wrapped with `stripSpecBlock` to hide the raw OpenUI Lang. The `hasCanvasSpec` gate switched from "any data part of `SPEC_DATA_PART_TYPE`" to "any text part containing ` ```spec\n`", still gated to `partIndex === lastTextIndex`.

### System prompt (`lib/search/group-config.ts`)

```diff
-${canvasCatalog.prompt({
-  mode: 'inline',
-  customRules: [
+${canvasLibrarySpec.prompt({
+  inlineMode: true,
+  additionalRules: [
     "Chart data values MUST be raw numbers (57, not '57%').",
-    'Emit /state patches before the elements that reference them.',
     ...other content rules unchanged...
+    'Output your dashboard inside a fenced ```spec ... ``` code block containing OpenUI Lang. The fence is REQUIRED so the renderer can find your program.',
   ],
 })}
```

The `'Emit /state patches before the elements that reference them.'` rule was removed because OpenUI Lang has no `$state` equivalent. Every other content rule was kept verbatim.

---

## Cleanup deferral (canvas)

The canvas migration intentionally **left in place**:
- `pipeJsonRender` import in `app/api/search/route.ts`
- `SPEC_DATA_PART_TYPE` / `useJsonRenderMessage` imports + the dead skip-branch in `components/message-parts/index.tsx`
- `SpecDataPart` import + `spec` data-type entry in `lib/types.ts`
- `lib/canvas/catalog.ts` and `lib/canvas/registry.tsx` files
- `@json-render/core` and `@json-render/react` in `package.json` and lockfiles

All harmless dead code. Phase 4 removes them in a separate commit. This deferral made the cutover commit small enough to review and easy to revert.

---

## What this case study does NOT prescribe

- **3-file split is not always required.** It was forced here by `'server-only'`. If the prompt builder runs in client/RSC code, a single `library.tsx` is fine.
- **The fence name `spec` is not canonical.** It was inherited from the pre-existing canvas prompt convention. Other modules might use `ui`, `openui`, or anything that doesn't collide with markdown the LLM emits naturally.
- **`Stack` as root is not canonical.** It was the right call for canvas dashboards. Other modules will pick whichever component most outputs already wrap in.
- **Hard cutover is not always the right call.** Canvas chose it because the module had a single feature-flag-style entry point (the `group === 'canvas'` branch) that made dual-path messy. Modules with broader exposure may prefer the feature-flagged variant in `SKILL.md` Phase 3.
- **Specific rules in `additionalRules`.** Every rule in the canvas prompt (`MAXIMUM 3 series`, `NEVER put Callout inside a Grid`, etc.) is canvas-domain content. Other modules will have their own equivalents — copy from the existing `customRules` array verbatim, then add only the fence-name rule.
