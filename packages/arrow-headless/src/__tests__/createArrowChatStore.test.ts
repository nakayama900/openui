import { describe, expect, it } from "vitest";
import { createArrowChatStore } from "../createArrowChatStore.js";
import type { Thread, UserMessage } from "../store/types.js";

const firstMessage: UserMessage = {
  id: "m1",
  role: "user",
  content: "Hello",
};

function createConfig() {
  const thread: Thread = {
    id: "t1",
    title: "Test thread",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  return {
    processMessage: async () => new Response(""),
    fetchThreadList: async () => ({ threads: [thread] }),
    createThread: async () => thread,
    deleteThread: async () => {},
    updateThread: async (updated: Thread) => updated,
    loadThread: async () => [firstMessage],
  };
}

describe("createArrowChatStore", () => {
  it("bridges Zustand state into an Arrow reactive snapshot", async () => {
    const chat = createArrowChatStore(createConfig());

    expect(chat.getSnapshot().messages).toEqual([]);

    chat.store.getState().appendMessages(firstMessage);

    expect(chat.state.current.messages).toEqual([firstMessage]);
    expect(chat.thread().messages).toEqual([firstMessage]);

    chat.destroy();
  });

  it("exposes the thread-list selector", async () => {
    const chat = createArrowChatStore(createConfig());
    await chat.threadList().createThread(firstMessage);

    expect(chat.threadList().threads).toHaveLength(1);
    expect(chat.threadList().threads[0]?.id).toBe("t1");

    chat.destroy();
  });
});
