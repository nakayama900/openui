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
