import { minecraftVanilla } from './minecraft-vanilla';
import { minecraftPaper } from './minecraft-paper';
import { valheim } from './valheim';
import type { Blueprint } from '../types';

/**
 * Built-in blueprint templates
 */
export const BLUEPRINTS: Record<string, Blueprint> = {
  'minecraft-vanilla': minecraftVanilla,
  'minecraft-paper': minecraftPaper,
  'valheim': valheim,
};

/**
 * Get blueprint by key
 */
export function getBlueprint(key: string): Blueprint | undefined {
  return BLUEPRINTS[key];
}

/**
 * Get all blueprints for a game
 */
export function getBlueprintsByGame(gameSlug: string): Blueprint[] {
  return Object.values(BLUEPRINTS).filter((bp) => bp.gameSlug === gameSlug);
}

/**
 * Get all blueprints
 */
export function getAllBlueprints(): Blueprint[] {
  return Object.values(BLUEPRINTS);
}
