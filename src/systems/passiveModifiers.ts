import type { GameState } from '../types/game';
import { SURVIVORS_CONFIG } from '../data/survivors';

export type ModifierKey =
  | 'exploration_food_cost'
  | 'exploration_energy_cost'
  | 'craft_energy_cost'
  | 'growth_speed'
  | 'scavenge_interval'
  | 'defense_energy_cost'
  | 'defense_damage_taken'
  | 'max_hp'
  | 'max_energy'
  | 'stat_cost_hp'
  | 'stat_cost_food'
  | `item_yield:${string}`;

export function getAdjustment(state: GameState, key: ModifierKey, assignedSurvivorId?: string): number {
  let total = 0;

  for (const survivorId of Object.keys(state.survivors)) {
    const config = SURVIVORS_CONFIG.find(c => c.id === survivorId);
    if (!config) continue;

    for (const p of config.passives) {
      if (p.modifier !== key) continue;
      if (p.condition === 'assigned' && survivorId !== assignedSurvivorId) continue;

      total += p.adjustment;
    }
  }

  return total;
}
