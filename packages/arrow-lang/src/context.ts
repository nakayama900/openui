import type { ArrowRenderable } from "@arrow-js/core";
import type { ActionPlan, EvaluationContext, OpenUIError, Store } from "@openuidev/lang-core";
import type { Library, RenderNodeResult } from "./library.js";

// ─── Action config ───

export interface ActionConfig {
  type?: string;
  params?: Record<string, any>;
}

// ─── OpenUI context ───

/**
 * Shared context available while Arrow component renderers are created by Renderer().
 *
 * Arrow does not have a built-in context API. Renderer scopes this value while it
 * invokes user component renderer functions, so helpers such as getTriggerAction()
 * can be called during component setup and closed over by event handlers.
 */
export interface OpenUIContextValue {
  /** The active component library (schema + renderers). */
  library: Library;

  /** Render any parsed value into Arrow renderables. */
  renderNode: (value: unknown) => RenderNodeResult;

  /** Trigger a structured action event. */
  triggerAction: (
    userMessage: string,
    formName?: string,
    action?: ActionPlan | ActionConfig,
  ) => void | Promise<void>;

  /** Whether the LLM is currently streaming content. */
  isStreaming: boolean;

  /** Get a field value. Top-level for $bindings, nested under formName for form fields. */
  getFieldValue: (formName: string | undefined, name: string) => any;

  /** Set a form field value. */
  setFieldValue: (
    formName: string | undefined,
    componentType: string | undefined,
    name: string,
    value: unknown,
    shouldTriggerSaveCallback?: boolean,
  ) => void;

  /** Reactive binding store for $variables and form data. */
  store: Store;

  /** AST evaluation context used by runtime expression evaluation. */
  evaluationContext: EvaluationContext;

  /** Report a structured error. */
  reportError?: (error: OpenUIError) => void;
}

let currentContext: OpenUIContextValue | null = null;
let currentFormName: string | undefined;

export function withOpenUIContext<T>(value: OpenUIContextValue, run: () => T): T {
  const previous = currentContext;
  currentContext = value;
  try {
    return run();
  } finally {
    currentContext = previous;
  }
}

export function setOpenUIContext(value: OpenUIContextValue | null): void {
  currentContext = value;
}

export function getOpenUIContext(): OpenUIContextValue {
  if (!currentContext) {
    throw new Error("getOpenUIContext must be used while rendering inside Renderer().");
  }
  return currentContext;
}

export function withFormName<T>(formName: string | undefined, run: () => T): T {
  const previous = currentFormName;
  currentFormName = formName;
  try {
    return run();
  } finally {
    currentFormName = previous;
  }
}

export function setFormName(formName: string | undefined): void {
  currentFormName = formName;
}

export function getFormName(): string | undefined {
  return currentFormName;
}

export function getRenderNode(): (value: unknown) => ArrowRenderable | RenderNodeResult {
  return getOpenUIContext().renderNode;
}

export function getTriggerAction() {
  return getOpenUIContext().triggerAction;
}

export function getIsStreaming(): boolean {
  return getOpenUIContext().isStreaming;
}

export function getGetFieldValue() {
  return getOpenUIContext().getFieldValue;
}

export function getSetFieldValue() {
  return getOpenUIContext().setFieldValue;
}

export function setDefaultValue({
  formName,
  componentType,
  name,
  defaultValue,
  shouldTriggerSaveCallback = false,
}: {
  formName?: string;
  componentType?: string;
  name: string;
  defaultValue: unknown;
  shouldTriggerSaveCallback?: boolean;
}): void {
  const ctx = getOpenUIContext();
  const existing = ctx.getFieldValue(formName, name);
  if (!ctx.isStreaming && existing === undefined && defaultValue !== undefined) {
    ctx.setFieldValue(formName, componentType, name, defaultValue, shouldTriggerSaveCallback);
  }
}
