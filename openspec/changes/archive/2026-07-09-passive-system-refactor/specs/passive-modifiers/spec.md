## ADDED Requirements

### Requirement: ModifierKey defines all mutable game parameters

The system SHALL define a `ModifierKey` string union type covering all game parameters that can be modified by survivor passives. Each key SHALL represent exactly one parameter (fine-grained, no compound keys).

Keys with prefix `item_yield:` SHALL accept a suffix indicating the target item ID (template literal type `item_yield:${string}`).

#### Scenario: ModifierKey includes all passive keys
- **WHEN** the system is initialized
- **THEN** ModifierKey SHALL include `exploration_food_cost`, `exploration_energy_cost`, `craft_energy_cost`, `growth_speed`, `scavenge_interval`, `defense_energy_cost`, `defense_damage_taken`, `max_hp`, `max_energy`, `stat_cost_hp`, `stat_cost_food`, and `item_yield:<itemId>`

### Requirement: getAdjustment returns additive aggregation

The `getAdjustment(state, key)` function SHALL:
1. Iterate all rescued survivors in `state.survivors`
2. Look up each survivor's config in `SURVIVORS_CONFIG`
3. Filter passives where `p.modifier === key`
4. For `operator: 'add'`: add `p.adjustment` to total
5. For `operator: 'mul'`: add `p.adjustment` to total (deviation from 1)
6. Return the sum total

#### Scenario: Two survivors with same mul key stack additively
- **WHEN** survivor A has passive `{modifier:'scavenge_interval', adjustment:-0.25, operator:'mul'}` and survivor B has passive `{modifier:'scavenge_interval', adjustment:-0.10, operator:'mul'}`
- **AND** both are rescued
- **THEN** `getAdjustment(state, 'scavenge_interval')` SHALL return `-0.35`

#### Scenario: No matching passives returns 0
- **WHEN** no rescued survivor has a passive matching the given key
- **THEN** `getAdjustment(state, key)` SHALL return `0`

#### Scenario: add and mul keys aggregate separately
- **WHEN** survivor has passive `{modifier:'max_hp', adjustment:20, operator:'add'}` and another passive `{modifier:'max_energy', adjustment:10, operator:'add'}`
- **THEN** `getAdjustment(state, 'max_hp')` SHALL return `20`
- **AND** `getAdjustment(state, 'max_energy')` SHALL return `10`

### Requirement: PassiveEffect interface uses new data model

`PassiveEffect` SHALL use `{ modifier: ModifierKey; adjustment: number; operator: 'add' | 'mul'; condition?: 'rescued' | 'assigned' }`.

The old `type`/`target`/`multiplier`/`flatBonus` fields SHALL be removed.

#### Scenario: config type compiles
- **WHEN** TypeScript compiles `src/data/survivors.ts`
- **THEN** no error about missing fields in `PassiveEffect`

### Requirement: Consumer code uses getAdjustment instead of hardcoded lookups

The following locations SHALL use `getAdjustment` instead of survivor ID checks:
- `WildernessTab.tsx`: `exploration_food_cost` and `exploration_energy_cost` for exploration cost calculation; `stat_cost_hp`/`stat_cost_food` for stat cost reduction; `item_yield:X` for item yield bonuses
- `SwipeCard.tsx`: `stat_cost_hp`/`stat_cost_food` for stat preview; `item_yield:X` for item quantity preview
- `WorkshopTab.tsx`: `defense_energy_cost` for nightmare overload energy cost
- `GameContext.tsx`: `max_energy` for max energy cap in offline tick; `growth_speed` for crop growth in offline/online tick; `craft_energy_cost` for workshop energy consumption
- `FacilityCard.tsx`: role-based speed bonuses remain based on survivor role (not passives)

#### Scenario: All hardcoded survivor ID lookups are removed
- **WHEN** searching for patterns `s.id ===`, `state.survivors.nova`, `state.survivors.mei`, `state.survivors.catherine`, `state.survivors.buster` in `GameContext.tsx`, `SwipeCard.tsx`, `WorkshopTab.tsx`
- **THEN** no matches SHALL exist in non-test files

### Requirement: Module lives at src/systems/passiveModifiers.ts

The `getAdjustment` function SHALL be exported from a new file at `src/systems/passiveModifiers.ts`. It SHALL import `SURVIVORS_CONFIG` from `src/data/survivors.ts` and `GameState` from `src/types/game.ts`. It SHALL NOT import any React or context modules.

#### Scenario: Module is self-contained
- **WHEN** running unit tests on `passiveModifiers.ts`
- **THEN** no React or jsdom environment SHALL be required
