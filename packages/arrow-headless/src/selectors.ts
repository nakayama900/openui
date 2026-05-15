import type {
  ChatStore,
  ThreadActions,
  ThreadListActions,
  ThreadListState,
  ThreadState,
} from "./store/types.js";

export type ThreadSlice = ThreadState & ThreadActions;
export type ThreadListSlice = ThreadListState & ThreadListActions;

export const selectThread = (state: ChatStore): ThreadSlice => ({
  messages: state.messages,
  isRunning: state.isRunning,
  isLoadingMessages: state.isLoadingMessages,
  threadError: state.threadError,
  processMessage: state.processMessage,
  appendMessages: state.appendMessages,
  updateMessage: state.updateMessage,
  setMessages: state.setMessages,
  deleteMessage: state.deleteMessage,
  cancelMessage: state.cancelMessage,
});

export const selectThreadList = (state: ChatStore): ThreadListSlice => ({
  threads: state.threads,
  isLoadingThreads: state.isLoadingThreads,
  threadListError: state.threadListError,
  selectedThreadId: state.selectedThreadId,
  hasMoreThreads: state.hasMoreThreads,
  loadThreads: state.loadThreads,
  loadMoreThreads: state.loadMoreThreads,
  switchToNewThread: state.switchToNewThread,
  createThread: state.createThread,
  selectThread: state.selectThread,
  updateThread: state.updateThread,
  deleteThread: state.deleteThread,
});
