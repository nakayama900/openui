import { describe, expect, it, vi } from "vitest";
import { createChatStore } from "../createChatStore";
import { createThreadContextStore } from "../createThreadContextStore";

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

describe("thread-context thread-switch cleanup", () => {
  const setupStores = () => {
    const chatStore = createChatStore({ processMessage: vi.fn() });
    const threadContextStore = createThreadContextStore();

    const unsubscribe = chatStore.subscribe(
      (state) => state.selectedThreadId,
      () => threadContextStore.getState().reset(),
    );

    return { chatStore, threadContextStore, unsubscribe };
  };

  const populate = (store: ReturnType<typeof createThreadContextStore>) => {
    store.getState().registerApp({ id: "app-1", version: 1, heading: "App" });
    store.getState().registerArtifact({ id: "art-1", version: 1, heading: "Artifact" });
  };

  const expectEmpty = (store: ReturnType<typeof createThreadContextStore>) => {
    expect(store.getState().apps).toEqual({});
    expect(store.getState().artifacts).toEqual({});
  };

  it("clears thread context when selectThread is called", async () => {
    const { chatStore, threadContextStore, unsubscribe } = setupStores();

    populate(threadContextStore);

    chatStore.getState().selectThread("thread-2");
    await flushPromises();

    expectEmpty(threadContextStore);

    unsubscribe();
  });

  it("clears thread context when switchToNewThread is called", async () => {
    const { chatStore, threadContextStore, unsubscribe } = setupStores();

    chatStore.setState({ selectedThreadId: "thread-1" });
    populate(threadContextStore);

    chatStore.getState().switchToNewThread();
    await flushPromises();

    expectEmpty(threadContextStore);

    unsubscribe();
  });

  it("clears thread context when active thread is deleted", async () => {
    const deleteThread = vi.fn().mockResolvedValue(undefined);
    const chatStore = createChatStore({ deleteThread, processMessage: vi.fn() });
    const threadContextStore = createThreadContextStore();

    const unsubscribe = chatStore.subscribe(
      (state) => state.selectedThreadId,
      () => threadContextStore.getState().reset(),
    );

    chatStore.setState({
      selectedThreadId: "thread-1",
      threads: [
        {
          id: "thread-1",
          title: "Test",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    populate(threadContextStore);

    chatStore.getState().deleteThread("thread-1");
    await flushPromises();

    expectEmpty(threadContextStore);

    unsubscribe();
  });

  it("does not clear thread context when re-selecting the same thread", async () => {
    const { chatStore, threadContextStore, unsubscribe } = setupStores();

    chatStore.setState({ selectedThreadId: "thread-1" });
    await flushPromises();

    populate(threadContextStore);

    chatStore.getState().selectThread("thread-1");
    await flushPromises();

    expect(threadContextStore.getState().apps["app-1"]?.length).toBe(1);
    expect(threadContextStore.getState().artifacts["art-1"]?.length).toBe(1);

    unsubscribe();
  });

  it("handles rapid thread switches cleanly", async () => {
    const loadThread = vi.fn().mockResolvedValue([]);
    const chatStore = createChatStore({ loadThread, processMessage: vi.fn() });
    const threadContextStore = createThreadContextStore();

    const unsubscribe = chatStore.subscribe(
      (state) => state.selectedThreadId,
      () => threadContextStore.getState().reset(),
    );

    populate(threadContextStore);

    chatStore.getState().selectThread("thread-1");
    chatStore.getState().selectThread("thread-2");
    chatStore.getState().selectThread("thread-3");
    await flushPromises();

    expectEmpty(threadContextStore);
    expect(chatStore.getState().selectedThreadId).toBe("thread-3");

    unsubscribe();
  });
});
