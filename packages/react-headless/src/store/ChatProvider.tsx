import { useEffect, useState, type FC } from "react";
import { ChatContext } from "./ChatContext";
import { createChatStore } from "./createChatStore";
import { createDetailedViewStore } from "./createDetailedViewStore";
import { createThreadContextStore } from "./createThreadContextStore";
import { DetailedViewContext } from "./DetailedViewContext";
import { ThreadContextContext } from "./ThreadContextContext";
import type { ChatProviderProps } from "./types";

export const ChatProvider: FC<ChatProviderProps> = ({ children, ...config }) => {
  const [chatStore] = useState(() => createChatStore(config));
  const [detailedViewStore] = useState(() => createDetailedViewStore());
  const [threadContextStore] = useState(() => createThreadContextStore());

  // Cross-store subscription: reset detailed-view + thread-context state when the active thread changes.
  // useEffect (not inline) so the cleanup function unsubscribes on unmount.
  useEffect(() => {
    const unsubscribe = chatStore.subscribe(
      (state) => state.selectedThreadId,
      () => {
        detailedViewStore.getState().reset();
        threadContextStore.getState().reset();
      },
    );
    return unsubscribe;
  }, [chatStore, detailedViewStore, threadContextStore]);

  return (
    <ChatContext.Provider value={chatStore}>
      <DetailedViewContext.Provider value={detailedViewStore}>
        <ThreadContextContext.Provider value={threadContextStore}>
          {children}
        </ThreadContextContext.Provider>
      </DetailedViewContext.Provider>
    </ChatContext.Provider>
  );
};
