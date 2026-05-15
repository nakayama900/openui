# @openuidev/arrow-headless

Headless ArrowJS primitives for OpenUI chat apps.

This package mirrors the framework-agnostic pieces of `@openuidev/react-headless`
without React providers/hooks. It exposes the same chat store, streaming adapters,
and message formats, plus `createArrowChatStore()` for Arrow reactive templates.

```ts
import { createArrowChatStore } from "@openuidev/arrow-headless";
import { html } from "@arrow-js/core";

const chat = createArrowChatStore({
  apiUrl: "/api/chat",
  fetchThreadList: async () => ({ threads: [] }),
  createThread: async (firstMessage) => ({
    id: crypto.randomUUID(),
    title: firstMessage.content,
    createdAt: new Date().toISOString(),
  }),
  deleteThread: async () => {},
  updateThread: async (thread) => thread,
  loadThread: async () => [],
});

html`<div>${() => chat.thread().messages.length} messages</div>`(document.body);
```
