---
name: json-render-to-openui-migration
description: >-
  Plans and executes incremental migrations from `@json-render/core` +
  `@json-render/react` to `@openuidev/react-lang` for a specified module.
  Preserves component visuals, schemas, and consumer-visible APIs exactly —
  only the wire format (JSON spec → OpenUI Lang) and SDK bindings change.
  Use when migrating a json-render module to OpenUI Lang, porting a
  catalog/registry pair to a `defineComponent`-based library, replacing
  `pipeJsonRender` with text-based streaming, or when the user mentions
  json-render → openui migration on a new module.
---

# json-render → OpenUI Lang Migration

This skill turns a json-render-based UI module into an OpenUI Lang module **without** changing the visible component library, the system-prompt content rules, or the streaming UX. Only the wire format (JSON spec → OpenUI Lang text) and SDK bindings change.

For the underlying OpenUI/OpenUI Lang concepts (Library / Renderer / Prompt / Parser), defer to a project's `openui` skill if present, or to https://www.openui.com/llms-full.txt.

For a fully worked example showing what each phase looks like end-to-end, read [reference-canvas-case-study.md](reference-canvas-case-study.md). Read it lazily — only when a phase's general guidance below isn't enough.

---

## When to use

Trigger this skill when **all** are true:
- Project depends on `@json-render/core` and/or `@json-render/react`.
- Goal is to render LLM-generated UI without changing the visible component set, styling, or system-prompt content rules.
- A target module (a directory and/or set of files) can be named.

If the project is starting fresh on OpenUI (no json-render to remove), use the generic `openui` skill instead — this one is migration-shaped.

---

## Phase 0 — Discovery & Assumptions

Before writing any code, fill in the run-specific inputs and produce a written plan. Save it as `<MODULE>_OPENUI_MIGRATION_PLAN.md` at the repo root and confirm with the user before proceeding.

### Inputs to collect

| Input | How to obtain | Default if user defers |
|---|---|---|
| `MODULE_NAME` | Ask user (e.g. `canvas`, `dashboard`, `report`) | Required — must ask |
| `CATALOG_PATH` | grep for `defineCatalog(` | Required — must locate |
| `REGISTRY_PATH` | grep for `defineRegistry(` | Required — must locate |
| `WRAPPER_VIEW_PATH` | The React component consumers import (e.g. `*RendererView`) | Required — must locate |
| `STREAM_PIPELINE_PATH` | grep for `pipeJsonRender(` | Required — must locate; may be absent if no server-side injection |
| `SYSTEM_PROMPT_PATH` | grep for `<catalogName>.prompt(` | Required — must locate |
| `MESSAGE_PARTS_PATH` | grep for `useJsonRenderMessage` or `SPEC_DATA_PART_TYPE` | Required — must locate |
| `TYPES_PATH` | grep for `SpecDataPart` import + a `spec:` data-type entry | May be absent |
| `FENCE_NAME` | Existing prompt's code-fence (search prompt for ` ```spec ` etc.) | Ask user; common: `spec`, `ui`, `openui` |
| `ROOT_COMPONENT` | OpenUI requires a single named root. Pick the component most existing dashboards already wrap in. | Ask user; commonly the existing layout primitive (Stack/Container/Page) |
| `IS_PROMPT_SERVER_ONLY` | Check whether `SYSTEM_PROMPT_PATH` is `'server-only'` or imported by a server-only module | Auto-detect |
| `LOCKFILES` | List lockfiles present (`bun.lock`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`) | Auto-detect — update all |
| `ROLLOUT_STRATEGY` | `hard-cutover` (default) or `feature-flagged` | Ask user |
| `FEATURE_FLAG_NAME` | If feature-flagged | Ask user |
| `FEATURE_FLAG_MECHANISM` | If feature-flagged: env var? user prefs row? remote config? | Ask user — re-use whatever the project already uses |

### Assumptions section (mandatory — include in the plan doc)

Every run produces an `## Assumptions` block listing:
1. The exact files identified for each input above.
2. The component count and names extracted from the current catalog (so the user can sanity-check none was missed).
3. Whether the prompt consumer is server-only (decides 2-file vs 3-file output structure — see Phase 2).
4. Which lockfiles will be touched.
5. The chosen `FENCE_NAME` and `ROOT_COMPONENT`.
6. Rollout strategy.

### Flag-for-verification section (mandatory)

For each item below, **read the source** and either resolve or list as "needs user confirmation":

- [ ] **`$state` bindings in current catalog.** grep the catalog for `"$state"` strings in component descriptions. If present, OpenUI Lang has no direct equivalent — flag whether the LLM was already inlining data in practice (check recent assistant outputs / chat logs) or whether `$state` semantics need a workaround. Worst case: drop `$state` lines from descriptions.
- [ ] **`actions` map in `defineCatalog`.** If non-empty, the action handlers must be re-implemented (OpenUI Lang interactivity model differs). If empty `{}`, removing the `ActionProvider` is safe.
- [ ] **Custom `fallback` renderer.** If `defineRegistry` was called with a non-trivial fallback, decide whether to port it (OpenUI's `<Renderer />` has its own unknown-element handling).
- [ ] **`useJsonRenderMessage` semantics beyond extraction.** Re-read the hook source — it may also dedupe during streaming. Preserve any non-obvious behavior in the new text-based extractor.
- [ ] **Children-eligible component set.** json-render lets `slots: ["default"]` accept any component. OpenUI children prefer either `z.array(z.any())` (loose, simplest) or `z.union([...])` (strict). Default to loose unless the user wants strict typing.
- [ ] **Existing fence convention.** Verify the prompt actually instructs the model to emit a fenced block today. If not, the new prompt will introduce one and `MESSAGE_PARTS_PATH` extraction is greenfield.
- [ ] **Existing memoization on the wrapper view.** Note whether the consumer-facing view is `memo`'d on the spec prop. The new wrapper must memo on the equivalent text prop.

### Output of Phase 0

A markdown file in the repo root containing:
1. Goal (one paragraph — copy the description above, substitute `MODULE_NAME`).
2. Current architecture table (one row per identified file).
3. Key architectural difference (the catalog/registry-split → single `defineComponent` change).
4. Assumptions section.
5. Flag-for-verification section.
6. Phase plan (Phases 1–4 below, with this run's specific file paths inlined).
7. Things explicitly **not** changing (the don't-touch list — see "Hard invariants" below).
8. Risks (the general list under "Risks to watch" below).

**Stop after Phase 0 and have the user confirm the plan before continuing.**

---

## Phase 1 — Add dependency, no behavior change

**Changes**
- Add `@openuidev/react-lang` to `package.json` (`zod` is a transitive peer; check it's already present at the version the SDK requires).
- Run the project's package-manager install command. If multiple lockfiles exist, update all.
- Do **not** remove `@json-render/core` or `@json-render/react` yet — they remain in use until Phase 3.

**Verify**
- `<typecheck command>` passes.
- `<dev server / build>` starts without errors.
- Old json-render UI still renders identically (no consumer changes yet).

**Rollback**
- Revert the single commit (one-file diff plus lockfile updates).

**Commit**
- `chore(<MODULE>): add @openuidev/react-lang for upcoming migration`

---

## Phase 2 — Build the OpenUI library alongside the existing one

**Changes**

Decide file structure based on `IS_PROMPT_SERVER_ONLY`:

- **If the prompt consumer is server-only** → 3-file split:
  - `<MODULE_DIR>/components-meta.ts` — pure data: `name`, `description`, Zod `props` schema for each component. **No React, no JSX, no `'use client'`** — server-importable.
  - `<MODULE_DIR>/library.tsx` — `'use client'`; imports `*Meta` from components-meta and pairs each with its React renderer via `defineComponent({ ...Meta, component: (...) => <JSX/> })`; exports `<libraryName> = createLibrary({ root: ROOT_COMPONENT, components: [...] })`.
  - `<MODULE_DIR>/library-spec.ts` — server-safe; rebuilds the same `createLibrary` call but stubs each `component: undefined as unknown as never`. Used **only** for `library.prompt(...)` from server-only modules.

- **If the prompt is built in client/RSC code** → single file:
  - `<MODULE_DIR>/library.tsx` containing both metadata and renderers; export one library.

**For each component in the existing catalog:**
1. Copy the Zod schema **verbatim** — key order matters because OpenUI Lang uses positional arguments. Any reordering silently breaks the prompt-vs-runtime contract.
2. Copy the `description` and any `example` strings **verbatim**.
3. Copy the JSX renderer body **verbatim** from the existing registry — same Tailwind classes, same chart/table imports, same helper functions. This is the "no functionality change" guarantee.
4. For components that previously declared `slots: ["default"]` and accepted `children`, replace with an explicit `children: z.array(z.any()).nullable()` field (or a `z.union([...refs])` if strict typing is requested). Render via the `renderNode` callback OpenUI passes to your component:

   ```tsx
   function renderChildren(renderNode: (v: unknown) => ReactNode, children: unknown[] | null | undefined): ReactNode {
     if (!children) return null;
     return children.map((child, i) => (
       <span key={i} style={{ display: "contents" }}>{renderNode(child)}</span>
     ));
   }
   ```

5. Drop any json-render-specific shims used in the renderer (e.g. `sanitizeSpec` workarounds, `slots`-specific logic).

**Do not yet touch:**
- The existing wrapper view, message-parts hook, stream pipeline, or system prompt. Keep the old library wired up; the new one is a parallel module.

**Verify**
- `<typecheck command>` passes (will catch positional-arg mismatches and missing imports).
- `import { newLibrary } from '<MODULE_DIR>/library'` succeeds in a scratch file.
- Existing UI still renders identically (no consumer change yet).

**Rollback**
- Delete the new files. No other files were touched.

**Commit**
- `feat(<MODULE>): add OpenUI Lang library alongside existing json-render registry`

---

## Phase 3 — Cutover

This is the only phase with a behavior change. Choose `hard-cutover` or `feature-flagged` per the plan.

### Phase 3 — Hard cutover (default)

**Changes** — apply all in one commit so the wire format stays consistent end-to-end:

1. **Wrapper view (`WRAPPER_VIEW_PATH`)** — change props from `{ spec: Spec | null }` to `{ response: string | null; loading?: boolean }`. Keep `memo` semantics (memoize on `response`). Keep the loading skeleton. Keep any animation wrapper class (e.g. stagger).

2. **Renderer wrapper (`<MODULE_DIR>/renderer.tsx`)** — replace the json-render `<Renderer spec=... registry=... />` (with `StateProvider` / `VisibilityProvider` / `ActionProvider`) with `<Renderer response={response} library={newLibrary} isStreaming={loading} />`. Drop the providers — OpenUI's `<Renderer />` manages its own state. Drop any `sanitizeSpec` shim.

3. **Message-parts (`MESSAGE_PARTS_PATH`)** — replace `useJsonRenderMessage(parts)` with a stream-safe text-block extractor:

   ```ts
   function extractSpecBlock(text: string, fence: string): string | null {
     const open = text.match(new RegExp("```" + fence + "\\s*\\n"));
     if (!open) return null;
     const startIdx = open.index! + open[0].length;
     const rest = text.slice(startIdx);
     const closeIdx = rest.indexOf("```");
     return closeIdx >= 0 ? rest.slice(0, closeIdx) : rest;
   }

   function stripSpecBlock(text: string, fence: string): string {
     return text.replace(new RegExp("```" + fence + "\\s*\\n[\\s\\S]*?(?:```|$)", "g"), "").trim();
   }
   ```

   Concatenate all assistant text parts, run `extractSpecBlock` to get the program, pass to the wrapper view as `response`. Run `stripSpecBlock` on the text passed to the markdown renderer so the raw OpenUI Lang doesn't appear above the rendered UI.

   Update the gate that decides "should we render the UI for this message?" to detect the fenced block in text parts (instead of detecting the data-part type). Render only after the **last** assistant text part to avoid double-mounting during streaming.

4. **Stream pipeline (`STREAM_PIPELINE_PATH`)** — drop the `pipeJsonRender(uiMessageStream)` wrapper. Pass the raw `uiMessageStream` to the data stream. OpenUI does not need a server-side spec injector; the LLM's text already contains what `<Renderer />` parses.

5. **System prompt (`SYSTEM_PROMPT_PATH`)** — replace `<catalogName>.prompt({ mode: 'inline', customRules: [...] })` with `<libraryName>.prompt({ inlineMode: true, additionalRules: [...] })`. (Verify the exact option names against the SDK version installed in Phase 1; the project's `openui` skill or `defining-components`/`system-prompts` docs are authoritative.) Move the existing `customRules` array into `additionalRules` **verbatim** — these are framework-agnostic content rules and stay relevant.

   Append one rule that pins the fence name: `"Output your <MODULE> inside a fenced \`\`\`<FENCE_NAME> ... \`\`\` code block containing OpenUI Lang. The fence is REQUIRED so the renderer can find your program."`

   Remove any rule that is json-render-specific (e.g. `"Emit /state patches before the elements that reference them."` — `$state` doesn't exist in OpenUI Lang).

6. **Cleanup deferred.** Leave old imports (`pipeJsonRender`, `SPEC_DATA_PART_TYPE`, `useJsonRenderMessage`, `SpecDataPart`, the old catalog/registry files, the json-render packages) in place. They are dead but harmless. Phase 4 removes them in a separate commit.

**Verify**
- Typecheck passes.
- End-to-end smoke test of one query per component family (chart, table, layout, structural) — confirm:
  - Streaming renders progressively.
  - All components draw with identical styling.
  - The raw OpenUI Lang block does NOT appear in the message text above the rendered UI.
  - The UI does not double-render or flicker during streaming.
- Diff Zod-schema key order against the old catalog for each component (positional-arg mismatches are silent failures).

**Rollback**
- Revert the single Phase 3 commit. The Phase 2 library remains in place but is not wired up — safe.

**Commit**
- `feat(<MODULE>): cut over from json-render to OpenUI Lang`

### Phase 3 — Feature-flagged variant

Only if `ROLLOUT_STRATEGY = feature-flagged`. Splits Phase 3 into 3a/3b/3c, each shippable independently.

**Phase 3a — dual-path behind a flag (default OFF)**
- Add the flag to whatever mechanism the project already uses. Re-use existing patterns; do **not** introduce a new flag system for this migration.
- Wrapper view accepts both `spec?: Spec | null` and `response?: string | null` — branch internally on which is provided (or on the flag).
- Stream pipeline branches: `flag ON` → raw `uiMessageStream`; `flag OFF` → `pipeJsonRender(uiMessageStream)`.
- Message-parts gate detects either the old data-part type (flag OFF) or the new fenced block (flag ON).
- System prompt branches: `flag ON` → `<libraryName>.prompt(...)`; `flag OFF` → `<catalogName>.prompt(...)`.
- Verify both paths in dev — toggle the flag, confirm each renders correctly.
- Commit: `feat(<MODULE>): add flag-gated OpenUI path alongside json-render`.

**Phase 3b — default flag ON**
- Flip the default. No code change beyond the default value.
- Verify in staging/canary. Watch for production smoke-test failures.
- Commit: `chore(<MODULE>): default <FEATURE_FLAG_NAME> to ON`.

**Phase 3c — remove the flag**
- Delete the flag and the json-render branch in each of the four files. The OpenUI path becomes the only path.
- Commit: `refactor(<MODULE>): remove json-render fallback path`.

After Phase 3c, proceed to Phase 4.

---

## Phase 4 — Cleanup

Independent, safe to defer for days/weeks if needed.

**Changes**
- Remove `@json-render/core` and `@json-render/react` from `package.json` and all lockfiles.
- Delete the old catalog and registry source files.
- Remove `pipeJsonRender` import from the stream-pipeline file.
- Remove `SPEC_DATA_PART_TYPE`, `useJsonRenderMessage`, and the dead skip-branch in the message-parts file.
- Remove the `SpecDataPart` import and the `spec` data-type entry in `TYPES_PATH` (if present).
- Search-and-destroy any other dead references: `rg "json-render|pipeJsonRender|SPEC_DATA_PART_TYPE|useJsonRenderMessage|SpecDataPart"` should return zero hits in the module.

**Verify**
- Typecheck passes.
- Re-run the Phase 3 smoke tests — same behavior.
- Bundle size dropped by roughly the size of the json-render packages (sanity check).

**Rollback**
- Revert this commit; reinstall the json-render packages.

**Commit**
- `chore(<MODULE>): remove dead json-render code after OpenUI migration`

---

## Hard invariants — things that must not change

- Component visual styling (CSS classes, chart configs, third-party UI primitives).
- Helper functions used inside renderers (sanitizers, color pickers, formatters).
- The set of components and their public prop shape (the LLM's mental model stays identical).
- The framework-agnostic content rules in the system prompt (chart limits, "no markdown in props", etc.).
- Any module-specific model config (temperature, seed, model selection).
- Anything outside the target module.

If a "while we're in here" change is tempting, defer it to a separate PR after Phase 4 lands.

---

## Risks to watch

1. **Positional-argument silent breakage.** OpenUI Lang maps args to props by Zod key order. Any reorder during the verbatim copy silently breaks the prompt contract. Diff key order against the old catalog for every component before completing Phase 2.
2. **Children unions.** Loose (`z.array(z.any())`) is simpler and works; strict (`z.union([...refs])`) gives better LLM hints but creates a noisy schema. Default to loose; let the user opt into strict if accuracy regresses.
3. **`$state` bindings.** json-render's `$state`-driven data flow has no direct OpenUI equivalent. If the catalog used it, verify whether the LLM was actually inlining data in practice (most modules do) — usually safe to drop the `$state` lines from component descriptions.
4. **Renderer rerender cost.** OpenUI's `<Renderer />` may rerender on every chunk. The wrapper view must memo on the text/`response` prop just as it previously memo'd on `spec`.
5. **Fence-name collisions.** If the chosen `FENCE_NAME` overlaps with a markdown code block the model might emit naturally (e.g. `js`, `sh`), pick something less ambiguous (`spec`, `ui`, `openui`).
6. **Last-text-part gating.** During streaming, the assistant may have multiple in-flight text parts. Render the canvas only after the **last** text part — otherwise the UI mounts/unmounts as new chunks arrive.
7. **Multiple lockfiles.** Projects sometimes carry both `bun.lock` and `pnpm-lock.yaml` (or similar). Phase 1 must update all of them; otherwise CI on a different package manager will fail.

---

## Worked example

For a fully concrete walkthrough — exact files touched, exact commit shape, what the resulting library structure looks like — read [reference-canvas-case-study.md](reference-canvas-case-study.md). Read it only when the general guidance above leaves a step ambiguous.
