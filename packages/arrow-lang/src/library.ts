import type { ArrowRenderable, ArrowTemplate } from "@arrow-js/core";
import {
  createLibrary as coreCreateLibrary,
  defineComponent as coreDefineComponent,
  type DefinedComponent as CoreDefinedComponent,
  type Library as CoreLibrary,
  type LibraryDefinition as CoreLibraryDefinition,
  type ComponentRenderProps as CoreRenderProps,
} from "@openuidev/lang-core";
import type { z } from "zod/v4";
import type { $ZodObject } from "zod/v4/core";

// Re-export framework-agnostic types unchanged
export type {
  ComponentGroup,
  LibraryJSONSchema,
  PromptOptions,
  SubComponentOf,
  ToolDescriptor,
} from "@openuidev/lang-core";

// ─── Arrow-specific types ───────────────────────────────────────────────────

export type RenderNodeResult = ArrowRenderable | ArrowTemplate | RenderNodeResult[];

export interface ComponentRenderProps<P = Record<string, unknown>>
  extends CoreRenderProps<P, RenderNodeResult> {}

export type ComponentRenderer<P = Record<string, unknown>> = (
  props: ComponentRenderProps<P>,
) => RenderNodeResult;

export type DefinedComponent<T extends $ZodObject = $ZodObject> = CoreDefinedComponent<
  T,
  ComponentRenderer<z.infer<T>>
>;

export type Library = CoreLibrary<ComponentRenderer<any>>;

export type LibraryDefinition = CoreLibraryDefinition<ComponentRenderer<any>>;

// ─── defineComponent (Arrow) ────────────────────────────────────────────────

export function defineComponent<T extends $ZodObject>(config: {
  name: string;
  props: T;
  description: string;
  component: ComponentRenderer<z.infer<T>>;
}): DefinedComponent<T> {
  return coreDefineComponent<T, ComponentRenderer<z.infer<T>>>(config);
}

// ─── createLibrary (Arrow) ──────────────────────────────────────────────────

export function createLibrary(input: LibraryDefinition): Library {
  return coreCreateLibrary<ComponentRenderer<any>>(input) as Library;
}
