import { BlueprintSchema, type Blueprint, type BlueprintVariable, VariableType } from '../types';

/**
 * Validate blueprint definition
 */
export function validateBlueprint(blueprint: unknown): { valid: boolean; errors: string[] } {
  const result = BlueprintSchema.safeParse(blueprint);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
  return { valid: false, errors };
}

/**
 * Validate variable values against blueprint
 */
export function validateVariables(
  blueprint: Blueprint,
  values: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const variable of blueprint.variables) {
    const value = values[variable.key];

    // Check required
    if (variable.required && (value === undefined || value === null || value === '')) {
      errors.push(`Variable "${variable.key}" is required`);
      continue;
    }

    // Skip validation if optional and not provided
    if (!variable.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    if (!validateVariableType(variable, value)) {
      errors.push(`Variable "${variable.key}" has invalid type, expected ${variable.type}`);
      continue;
    }

    // Specific validations
    if (variable.type === VariableType.INTEGER && variable.validation) {
      const numValue = Number(value);
      if (variable.validation.min !== undefined && numValue < variable.validation.min) {
        errors.push(`Variable "${variable.key}" must be at least ${variable.validation.min}`);
      }
      if (variable.validation.max !== undefined && numValue > variable.validation.max) {
        errors.push(`Variable "${variable.key}" must be at most ${variable.validation.max}`);
      }
    }

    if (variable.type === VariableType.STRING && variable.validation?.pattern) {
      const regex = new RegExp(variable.validation.pattern);
      if (!regex.test(String(value))) {
        errors.push(`Variable "${variable.key}" does not match required pattern`);
      }
    }

    if (variable.type === VariableType.SELECT && variable.options) {
      if (!variable.options.includes(String(value))) {
        errors.push(
          `Variable "${variable.key}" must be one of: ${variable.options.join(', ')}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate variable type
 */
function validateVariableType(variable: BlueprintVariable, value: any): boolean {
  switch (variable.type) {
    case VariableType.STRING:
      return typeof value === 'string';
    case VariableType.INTEGER:
      return typeof value === 'number' || !isNaN(Number(value));
    case VariableType.BOOLEAN:
      return typeof value === 'boolean' || value === 'true' || value === 'false';
    case VariableType.SELECT:
      return typeof value === 'string';
    default:
      return false;
  }
}

/**
 * Interpolate variables in template string
 */
export function interpolateTemplate(template: string, values: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}
