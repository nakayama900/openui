import { reactive as arrowReactive, html, type ArrowTemplate } from "@arrow-js/core";
import {
  ACTION_STEPS,
  BuiltinActionType,
  createStore,
  createStreamingParser,
  evaluate,
  evaluateElementProps,
  type ActionEvent,
  type ActionPlan,
  type ElementNode,
  type EvalContext,
  type EvaluationContext,
  type OpenUIError,
  type ParseResult,
  type Store,
} from "@openuidev/lang-core";
import type { ActionConfig, OpenUIContextValue } from "./context.js";
import { withOpenUIContext } from "./context.js";
import type { Library, RenderNodeResult } from "./library.js";

export interface RendererProps {
  /** Raw response text (openui-lang code). */
  response: string | null;
  /** Component library from createLibrary(). */
  library: Library;
  /** Whether the LLM is still streaming (form interactions disabled during streaming). */
  isStreaming?: boolean;
  /** Callback when a component triggers an action. */
  onAction?: (event: ActionEvent) => void;
  /** Called whenever form state or reactive bindings change. */
  onStateUpdate?: (state: Record<string, unknown>) => void;
  /** Initial form state / $binding state to hydrate on load. */
  initialState?: Record<string, any>;
  /** Called whenever the raw parse result changes. */
  onParseResult?: (result: ParseResult | null) => void;
  /** Callback for structured parser/runtime/render errors. */
  onError?: (errors: OpenUIError[]) => void;
}

interface RendererRuntime {
  store: Store;
  version: number;
  lastInitKey: string;
  lastParseKey: string;
  lastErrorKey: string;
  errors: OpenUIError[];
}

/** Unwrap { value, componentType } wrapper from form field entries. */
function unwrapFieldValue(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "value" in (value as Record<string, unknown>)
  ) {
    return (value as Record<string, unknown>).value;
  }
  return value;
}

function resolveProps(node: ElementNode, library: Library): Record<string, unknown> {
  const componentDef = library.components[node.typeName];
  if (!componentDef) return {};
  if (node.props) return node.props;

  const args = (node as any).args as unknown[] | undefined;
  if (!args) return {};

  const fieldNames = Object.keys(componentDef.props.shape);
  const mapped: Record<string, unknown> = {};
  for (let i = 0; i < fieldNames.length && i < args.length; i++) {
    mapped[fieldNames[i]!] = args[i];
  }
  return mapped;
}

function createRenderNode(context: OpenUIContextValue): (value: unknown) => RenderNodeResult {
  return function renderNode(value: unknown): RenderNodeResult {
    if (value == null) return null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => renderNode(item));
    }
    if (typeof value === "object" && (value as any).type === "element") {
      const node = value as ElementNode;
      const componentDef = context.library.components[node.typeName];
      if (!componentDef) return null;

      try {
        const props = resolveProps(node, context.library);
        return withOpenUIContext(context, () =>
          componentDef.component({
            props,
            renderNode,
            statementId: node.statementId,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.reportError?.({
          source: "runtime",
          code: "render-error",
          component: node.typeName,
          message: `Component ${node.typeName} render failed: ${message}`,
        });
        return null;
      }
    }
    return null;
  };
}

function initializeStore(
  runtime: RendererRuntime,
  result: ParseResult | null,
  initialState?: Record<string, any>,
) {
  const key = `${JSON.stringify(result?.stateDeclarations ?? {})}::${JSON.stringify(initialState ?? {})}`;
  if (runtime.lastInitKey === key) return;
  runtime.lastInitKey = key;

  const bindingDefaults: Record<string, unknown> = {};
  if (initialState) {
    for (const [name, value] of Object.entries(initialState)) {
      if (name.startsWith("$")) {
        bindingDefaults[name] = value;
      } else {
        runtime.store.set(name, value);
      }
    }
  }
  runtime.store.initialize(result?.stateDeclarations ?? {}, bindingDefaults);
}

function createEvaluationContext(store: Store): EvaluationContext {
  return {
    getState: (name: string) => unwrapFieldValue(store.get(name)),
    resolveRef: () => undefined,
  };
}

function evaluateResult(
  result: ParseResult | null,
  library: Library,
  store: Store,
  evaluationContext: EvaluationContext,
  errors: OpenUIError[],
): ParseResult | null {
  if (!result?.root) return result;
  const evalCtx: EvalContext = { ctx: evaluationContext, library, store, errors };
  try {
    return { ...result, root: evaluateElementProps(result.root, evalCtx) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      source: "runtime",
      code: "runtime-error",
      message: `Prop evaluation failed: ${message}`,
    });
    return result;
  }
}

function emitParseResult(
  props: RendererProps,
  runtime: RendererRuntime,
  result: ParseResult | null,
): void {
  const key = JSON.stringify(result);
  if (runtime.lastParseKey === key) return;
  runtime.lastParseKey = key;
  props.onParseResult?.(result);
}

function emitErrors(props: RendererProps, runtime: RendererRuntime, errors: OpenUIError[]): void {
  if (props.isStreaming) return;
  const key = JSON.stringify(errors);
  if (runtime.lastErrorKey === key) return;
  runtime.lastErrorKey = key;
  props.onError?.(errors);
  if (!props.onError && errors.length > 0) {
    for (const error of errors) {
      console.warn(`[openui] ${error.source}/${error.code}: ${error.message}`);
    }
  }
}

/**
 * Create an Arrow template that renders OpenUI Lang with an Arrow component library.
 *
 * Pass a reactive props object from `@arrow-js/core` if `response`, `isStreaming`,
 * or other values should update an already mounted template.
 */
export function Renderer(props: RendererProps): ArrowTemplate {
  const parser = createStreamingParser(props.library.toJSONSchema(), props.library.root);
  const runtime: RendererRuntime = {
    store: createStore(),
    version: 0,
    lastInitKey: "",
    lastParseKey: "",
    lastErrorKey: "",
    errors: [],
  };
  const changeSignal = arrowReactive({ version: 0 });

  runtime.store.subscribe(() => {
    runtime.version += 1;
    changeSignal.version += 1;
    props.onStateUpdate?.(runtime.store.getSnapshot());
  });

  function render(): RenderNodeResult {
    // Establish a reactive dependency on store updates.
    void changeSignal.version;

    let parseResult: ParseResult | null = null;
    const errors: OpenUIError[] = [];

    if (props.response) {
      try {
        parseResult = parser.set(props.response);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({
          source: "parser",
          code: "parse-exception",
          message: `Parser crashed: ${message}`,
          hint: "The response may contain syntax the parser cannot handle",
        });
      }
    }

    emitParseResult(props, runtime, parseResult);
    initializeStore(runtime, parseResult, props.initialState);

    if (props.response && !parseResult?.root && errors.length === 0) {
      errors.push({
        source: "parser",
        code: "parse-failed",
        message: parseResult
          ? "Code parsed but produced no renderable root component"
          : "Response could not be parsed as valid openui-lang",
        hint: `The entire response must be valid openui-lang code starting with root = ${props.library.root ?? "Root"}(...)`,
      });
    }

    const evaluationContext = createEvaluationContext(runtime.store);

    const context: OpenUIContextValue = {
      library: props.library,
      renderNode: () => null,
      triggerAction: async (
        userMessage: string,
        formName?: string,
        action?: ActionPlan | ActionConfig,
      ) => {
        const formState = formName
          ? { [formName]: runtime.store.get(formName) }
          : runtime.store.getSnapshot();

        if (action && "steps" in action) {
          for (const step of action.steps) {
            if (step.type === ACTION_STEPS.Set && step.valueAST) {
              runtime.store.set(step.target, evaluate(step.valueAST, evaluationContext));
            } else if (step.type === ACTION_STEPS.Reset) {
              const declarations = parseResult?.stateDeclarations ?? {};
              for (const target of step.targets) {
                runtime.store.set(target, declarations[target] ?? null);
              }
            } else if (step.type === ACTION_STEPS.ToAssistant) {
              props.onAction?.({
                type: BuiltinActionType.ContinueConversation,
                params: step.context ? { context: step.context } : {},
                humanFriendlyMessage: step.message,
                formState,
                formName,
              });
            } else if (step.type === ACTION_STEPS.OpenUrl) {
              props.onAction?.({
                type: BuiltinActionType.OpenUrl,
                params: { url: step.url },
                humanFriendlyMessage: "",
                formState,
                formName,
              });
            }
          }
          return;
        }

        const actionType = action && !("steps" in action) ? action.type : undefined;
        const params = action && !("steps" in action) ? action.params : undefined;
        props.onAction?.({
          type: actionType || BuiltinActionType.ContinueConversation,
          params: params || {},
          humanFriendlyMessage: userMessage,
          formState,
          formName,
        });
      },
      isStreaming: props.isStreaming ?? false,
      getFieldValue: (formName: string | undefined, name: string) => {
        if (!formName) return unwrapFieldValue(runtime.store.get(name));
        const formData = runtime.store.get(formName);
        if (!formData || typeof formData !== "object" || Array.isArray(formData)) return undefined;
        return unwrapFieldValue((formData as Record<string, unknown>)[name]);
      },
      setFieldValue: (
        formName: string | undefined,
        componentType: string | undefined,
        name: string,
        value: unknown,
        shouldTriggerSaveCallback: boolean = true,
      ) => {
        const wrapped = { value, componentType };
        if (!formName) {
          runtime.store.set(name, wrapped);
        } else {
          const raw = runtime.store.get(formName);
          const formData =
            raw && typeof raw === "object" && !Array.isArray(raw)
              ? (raw as Record<string, unknown>)
              : {};
          runtime.store.set(formName, { ...formData, [name]: wrapped });
        }
        if (shouldTriggerSaveCallback) {
          props.onStateUpdate?.(runtime.store.getSnapshot());
        }
      },
      store: runtime.store,
      evaluationContext,
      reportError: (error) => {
        runtime.errors = [...runtime.errors, error];
      },
    };

    context.renderNode = createRenderNode(context);

    const evaluatedResult = evaluateResult(
      parseResult,
      props.library,
      runtime.store,
      evaluationContext,
      errors,
    );

    const allErrors = [...errors, ...runtime.errors];
    runtime.errors = [];
    emitErrors(props, runtime, allErrors);

    if (!evaluatedResult?.root) return null;
    return withOpenUIContext(context, () => context.renderNode(evaluatedResult.root));
  }

  return html`${() => render()}`;
}
