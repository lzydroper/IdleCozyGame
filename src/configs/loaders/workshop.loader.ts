/**
 * workshop 域装配（config-json-migration 批次② 2.2）。
 * Recipe 形状沿用 types/config.ts（类型仅引用，批次④随 configs/types 收口）。
 * 分表双形态：键控 map 或行数组均可（devGuardKeyed 归一），json 迁移零代码改动。
 */
import recipesJson from '../../data/workshop/recipes.json';
import autoRecipesJson from '../../data/workshop/autoRecipes.json';
import type { Recipe } from '../../types/config';
import { devGuardKeyed } from './devGuard';

export const RECIPES_CONFIG: Record<string, Recipe> = Object.fromEntries(
  devGuardKeyed('workshop/recipes', recipesJson as unknown as Record<string, Recipe> | Recipe[])
);

export const AUTO_RECIPES: Record<string, Recipe> = Object.fromEntries(
  devGuardKeyed(
    'workshop/autoRecipes',
    autoRecipesJson as unknown as Record<string, Recipe> | Recipe[]
  )
);
