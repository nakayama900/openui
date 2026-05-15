# @openuidev/arrow-lang

ArrowJS runtime bindings for OpenUI Lang.

Use this package to define OpenUI component libraries with Arrow renderer
functions, generate prompts/schemas for LLMs, and mount streamed OpenUI Lang
responses as Arrow templates.

```ts
import { Renderer, createLibrary, defineComponent, html } from "@openuidev/arrow-lang";
import { z } from "zod/v4";

const TextContent = defineComponent({
  name: "TextContent",
  props: z.object({ text: z.string() }),
  description: "Displays text content",
  component: ({ props }) => html`<p>${props.text}</p>`,
});

const library = createLibrary({ components: [TextContent], root: "TextContent" });

Renderer({
  response: 'root = TextContent("Hello Arrow")',
  library,
})(document.getElementById("app")!);
```

Pass a reactive props object or accessors backed by `reactive()` when mounted
renderers should update as a streamed response changes.

## Compatibility notes

- `@arrow-js/core` is a peer dependency using the `^1.0.0` range. The package is tested and developed with `^1.0.6`, but consumers can use any compatible ArrowJS 1.x release.
- `Renderer()` mirrors the public surface of the other OpenUI Lang runtimes where ArrowJS has an equivalent concept: `response`, `library`, `isStreaming`, `onAction`, `onStateUpdate`, `initialState`, `onParseResult`, and `onError`.
- During streaming, parse/runtime errors are reported through `onError` when possible and the renderer returns `null` for the invalid subtree. A subsequent valid `response` re-runs parsing/evaluation, so the mounted template can recover as the stream becomes valid. Explicit retry/backoff hooks are not part of the initial API.
