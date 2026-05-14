import {
  builtInValidators,
  parseRules,
  parseStructuredRules,
  validate,
  type ParsedRule,
  type ValidatorFn,
} from "@openuidev/lang-core";

// ─── Re-exports from lang-core ───

export { builtInValidators, parseRules, parseStructuredRules, validate };
export type { ParsedRule, ValidatorFn };

// ─── Form validation context ───

export interface FormValidationContextValue {
  errors: Record<string, string | undefined>;
  validateField: (name: string, value: unknown, rules: ParsedRule[]) => boolean;
  registerField: (name: string, rules: ParsedRule[], getValue: () => unknown) => void;
  unregisterField: (name: string) => void;
  validateForm: () => boolean;
  clearFieldError: (name: string) => void;
}

let currentValidation: FormValidationContextValue | null = null;

export function createFormValidation(): FormValidationContextValue {
  const errors: Record<string, string | undefined> = {};
  const fields: Record<string, { rules: ParsedRule[]; getValue: () => unknown }> = {};

  function validateField(name: string, value: unknown, rules: ParsedRule[]): boolean {
    const error = validate(value, rules);
    errors[name] = error;
    return !error;
  }

  function registerField(name: string, rules: ParsedRule[], getValue: () => unknown): void {
    fields[name] = { rules, getValue };
  }

  function unregisterField(name: string): void {
    delete fields[name];
  }

  function validateForm(): boolean {
    let allValid = true;
    for (const [name, field] of Object.entries(fields)) {
      const error = validate(field.getValue(), field.rules);
      errors[name] = error;
      if (error) allValid = false;
    }
    return allValid;
  }

  function clearFieldError(name: string): void {
    errors[name] = undefined;
  }

  return {
    errors,
    validateField,
    registerField,
    unregisterField,
    validateForm,
    clearFieldError,
  };
}

export function setFormValidationContext(value: FormValidationContextValue | null): void {
  currentValidation = value;
}

export function getFormValidation(): FormValidationContextValue | null {
  return currentValidation;
}
