// ─── Component definition ───

export { tagSchemaId } from "@openuidev/lang-core";
export { createLibrary, defineComponent } from "./library.js";
export type {
  ComponentGroup,
  ComponentRenderProps,
  ComponentRenderer,
  DefinedComponent,
  Library,
  LibraryDefinition,
  PromptOptions,
  RenderNodeResult,
  SubComponentOf,
  ToolDescriptor,
} from "./library.js";

// ─── Renderer ───

export { Renderer } from "./Renderer.js";
export type { RendererProps } from "./Renderer.js";

// ─── Context helpers ───

export {
  getFormName,
  getGetFieldValue,
  getIsStreaming,
  getOpenUIContext,
  getRenderNode,
  getSetFieldValue,
  getTriggerAction,
  setDefaultValue,
  setFormName,
  setOpenUIContext,
  withFormName,
  withOpenUIContext,
} from "./context.js";
export type { ActionConfig, OpenUIContextValue } from "./context.js";

// ─── Form validation ───

export { createFormValidation, getFormValidation, setFormValidationContext } from "./validation.js";
export type { FormValidationContextValue } from "./validation.js";

export { builtInValidators, parseRules, parseStructuredRules, validate } from "./validation.js";
export type { ParsedRule, ValidatorFn } from "./validation.js";

// ─── Re-exports from lang-core (parser, types) ───

export { BuiltinActionType } from "@openuidev/lang-core";
export type { ActionEvent, ElementNode, OpenUIError, ParseResult } from "@openuidev/lang-core";

export { createParser, createStreamingParser, type LibraryJSONSchema } from "@openuidev/lang-core";

// ─── Arrow conveniences ───

export { html, reactive, svg } from "@arrow-js/core";
export type { ArrowRenderable, ArrowTemplate } from "@arrow-js/core";
