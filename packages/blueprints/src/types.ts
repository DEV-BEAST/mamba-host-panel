import { z } from 'zod';

/**
 * Variable types for blueprints
 */
export enum VariableType {
  STRING = 'string',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  SELECT = 'select',
}

/**
 * Blueprint variable definition
 */
export const BlueprintVariableSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.nativeEnum(VariableType),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For SELECT type
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

export type BlueprintVariable = z.infer<typeof BlueprintVariableSchema>;

/**
 * Port requirement
 */
export const PortRequirementSchema = z.object({
  protocol: z.enum(['tcp', 'udp']),
  count: z.number().default(1),
  description: z.string().optional(),
});

export type PortRequirement = z.infer<typeof PortRequirementSchema>;

/**
 * Config file template
 */
export const ConfigFileSchema = z.object({
  path: z.string(),
  content: z.string(), // Template with variable interpolation
  mode: z.string().optional(), // File permissions (e.g., '0644')
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

/**
 * Blueprint schema
 */
export const BlueprintSchema = z.object({
  gameSlug: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  dockerImage: z.string(),
  startupCommand: z.string(),
  stopCommand: z.string().optional(),
  variables: z.array(BlueprintVariableSchema).default([]),
  configFiles: z.array(ConfigFileSchema).default([]),
  ports: z.array(PortRequirementSchema).default([]),
  requiresAllocation: z.boolean().default(true),
  installScript: z.string().optional(),
  minCpu: z.number().optional(), // Millicores
  minMemory: z.number().optional(), // MB
  minDisk: z.number().optional(), // GB
});

export type Blueprint = z.infer<typeof BlueprintSchema>;
