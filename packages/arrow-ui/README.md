# @openuidev/arrow-ui

ArrowJS component library for OpenUI Lang.

This initial package provides a small Arrow-native component set (`TextContent`,
`Button`, `Stack`, `Card`) and an `openuiLibrary` that can be rendered by
`@openuidev/arrow-lang`.

```ts
import { Renderer, openuiLibrary } from "@openuidev/arrow-ui";

Renderer({
  library: openuiLibrary,
  response: 'root = Card("Hello", [TextContent("Rendered with Arrow")])',
})(document.getElementById("app")!);
```

The package also re-exports `createArrowChatStore()` from
`@openuidev/arrow-headless` for chat state integrations.
