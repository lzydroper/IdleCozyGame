/**
 * workshop 域装配（config-json-migration 批次② 2.2）。
 * Recipe 形状沿用 types/config.ts（类型仅引用，批次④随 configs/types 收口）。
 */
import recipesJson from '../../data/workshop/recipes.json';
import autoRecipesJson from '../../data/workshop/autoRecipes.json';
import type { Recipe } from '../../types/config';
import { devGuardTable } from './devGuard';

export const RECIPES_CONFIG = devGuardTable(
  'workshop/recipes',
  recipesJson as unknown as Record<string, Recipe>
);

export const AUTO_RECIPES = autoRecipesJson as unknown as Record<string, Recipe>;
