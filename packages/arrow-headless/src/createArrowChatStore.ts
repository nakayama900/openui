import { reactive } from "@arrow-js/core";
import type { StoreApi } from "zustand";
import { selectThread, selectThreadList } from "./selectors.js";
import { createChatStore } from "./store/createChatStore.js";
import type { ChatProviderProps, ChatStore } from "./store/types.js";

type ArrowChatStoreConfig = ChatProviderProps;

export interface ArrowChatStore {
  /** The underlying Zustand vanilla store, for advanced integrations. */
  store: StoreApi<ChatStore>;
  /** Arrow reactive box. Read `state.current` inside Arrow templates/effects. */
  state: { current: ChatStore };
  /** Current full store snapshot. */
  getSnapshot: () => ChatStore;
  /** Subscribe to underlying store changes. */
  subscribe: StoreApi<ChatStore>["subscribe"];
  /** Dispose the Arrow bridge subscription created by this helper. */
  destroy: () => void;
  /** Convenience selector for the active thread slice. */
  thread: () => ReturnType<typeof selectThread>;
  /** Convenience selector for the thread-list slice. */
  threadList: () => ReturnType<typeof selectThreadList>;
}

export function createArrowChatStore(config: ArrowChatStoreConfig): ArrowChatStore {
  const store = createChatStore(config);
  const state = reactive({ current: store.getState() }) as { current: ChatStore };

  const destroy = store.subscribe((next) => {
    state.current = next;
  });

  return {
    store,
    state,
    getSnapshot: () => state.current,
    subscribe: store.subscribe,
    destroy,
    thread: () => selectThread(state.current),
    threadList: () => selectThreadList(state.current),
  };
}
