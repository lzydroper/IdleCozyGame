## ADDED Requirements

### Requirement: Ration Deluxe recipe

The system SHALL include a `ration_deluxe_recipe` in `RECIPES_CONFIG` costing `{ ration: 2, aether_pulp: 1 }` and rewarding `{ ration_deluxe: 1 }`.

#### Scenario: Can craft ration_deluxe

- **WHEN** player has 2 ration and 1 aether_pulp in inventory
- **THEN** crafting consumes them and produces 1 ration_deluxe

### Requirement: Stimpack recipe

The system SHALL include a `stimpack_recipe` in `RECIPES_CONFIG` costing `{ nanite_injector: 1, glow_fiber: 2 }` and rewarding `{ stimpack: 1 }`.

#### Scenario: Can craft stimpack

- **WHEN** player has 1 nanite_injector and 2 glow_fiber
- **THEN** crafting consumes them and produces 1 stimpack

### Requirement: Geiger Counter recipe

The system SHALL include a `geiger_counter_recipe` in `RECIPES_CONFIG` costing `{ crystal_silicon: 1, scrap_metal: 2 }` and rewarding `{ geiger_counter: 1 }`.

#### Scenario: Can craft geiger_counter

- **WHEN** player has 1 crystal_silicon and 2 scrap_metal
- **THEN** crafting produces 1 geiger_counter

### Requirement: Canteen recipe

The system SHALL include a `canteen_recipe` in `RECIPES_CONFIG` costing `{ alloy_plate: 1, scrap_metal: 1 }` and rewarding `{ canteen: 1 }`.

#### Scenario: Can craft canteen

- **WHEN** player has 1 alloy_plate and 1 scrap_metal
- **THEN** crafting produces 1 canteen

### Requirement: Deflective Lens recipe

The system SHALL include a `deflective_lens_recipe` in `RECIPES_CONFIG` costing `{ crystal_silicon: 1, mana_dust: 3 }` and rewarding `{ deflective_lens: 1 }`.

#### Scenario: Can craft deflective_lens

- **WHEN** player has 1 crystal_silicon and 3 mana_dust
- **THEN** crafting produces 1 deflective_lens

### Requirement: Dream Lantern recipe

The system SHALL include a `dream_lantern_recipe` in `RECIPES_CONFIG` costing `{ dream_shard: 3, void_essence: 1 }` and rewarding `{ dream_lantern: 1 }`.

#### Scenario: Can craft dream_lantern

- **WHEN** player has 3 dream_shard and 1 void_essence
- **THEN** crafting produces 1 dream_lantern

### Requirement: Nanite Slurry recipe

The system SHALL include a `nanite_slurry_recipe` in `RECIPES_CONFIG` costing `{ mana_dust: 3, glow_fiber: 2 }` and rewarding `{ nanite_slurry: 1 }`.

#### Scenario: Can craft nanite_slurry

- **WHEN** player has 3 mana_dust and 2 glow_fiber
- **THEN** crafting produces 1 nanite_slurry

### Requirement: Plasma Arc craft recipe

The system SHALL include a `plasma_arc_craft` in `RECIPES_CONFIG` costing `{ plasma_cell: 2, alloy_plate: 1 }` and rewarding `{ plasma_arc: 1 }`.

#### Scenario: Can craft plasma_arc

- **WHEN** player has 2 plasma_cell and 1 alloy_plate
- **THEN** crafting produces 1 plasma_arc

### Requirement: Rusted Spring craft recipe

The system SHALL include a `rusted_spring_craft` in `RECIPES_CONFIG` costing `{ scrap_metal: 3 }` and rewarding `{ rusted_spring: 2 }`.

#### Scenario: Can craft rusted_spring

- **WHEN** player has 3 scrap_metal
- **THEN** crafting produces 2 rusted_spring

### Requirement: Aether Ingot smelt recipe

The system SHALL include an `aether_ingot_smelt` in `RECIPES_CONFIG` costing `{ aether_pulp: 3, scrap_metal: 2 }` and rewarding `{ aether_ingot: 1 }`.

#### Scenario: Can smelt aether_ingot

- **WHEN** player has 3 aether_pulp and 2 scrap_metal
- **THEN** crafting produces 1 aether_ingot

### Requirement: Auto-recipe for rusted_spring

The system SHALL include a `craft_rusted_spring` auto-recipe costing `{ scrap_metal: 3 }` producing `{ rusted_spring: 2 }` with duration 25s, facility `assembler`.

#### Scenario: Auto-craft rusted_spring

- **WHEN** assembler is assigned and has 3 scrap_metal
- **THEN** after 25s it produces 2 rusted_spring

### Requirement: Auto-recipe for nanite_slurry

The system SHALL include a `craft_nanite_slurry` auto-recipe costing `{ mana_dust: 3, glow_fiber: 2 }` producing `{ nanite_slurry: 1 }` with duration 35s, facility `smelter`.

#### Scenario: Auto-craft nanite_slurry

- **WHEN** smelter is assigned and has required materials
- **THEN** after 35s it produces 1 nanite_slurry

### Requirement: Auto-recipe for crystal_silicon

The system SHALL include a `craft_crystal_silicon` auto-recipe costing `{ steel_petal: 3, mana_dust: 1 }` producing `{ crystal_silicon: 1 }` with duration 40s, facility `smelter`.

#### Scenario: Auto-craft crystal_silicon

- **WHEN** smelter is assigned and has required materials
- **THEN** after 40s it produces 1 crystal_silicon

### Requirement: Auto-recipe for aether_ingot

The system SHALL include a `craft_aether_ingot` auto-recipe costing `{ aether_pulp: 4, scrap_metal: 2 }` producing `{ aether_ingot: 1 }` with duration 50s, facility `smelter`.

#### Scenario: Auto-craft aether_ingot

- **WHEN** smelter is assigned and has required materials
- **THEN** after 50s it produces 1 aether_ingot

### Requirement: Auto-recipe for plasma_arc

The system SHALL include a `craft_plasma_arc` auto-recipe costing `{ plasma_cell: 2, alloy_plate: 1 }` producing `{ plasma_arc: 1 }` with duration 45s, facility `assembler`.

#### Scenario: Auto-craft plasma_arc

- **WHEN** assembler is assigned and has required materials
- **THEN** after 45s it produces 1 plasma_arc

### Requirement: Auto-recipe for ration_deluxe

The system SHALL include a `craft_ration_deluxe` auto-recipe costing `{ ration: 2, aether_pulp: 1 }` producing `{ ration_deluxe: 1 }` with duration 30s, facility `assembler`.

#### Scenario: Auto-craft ration_deluxe

- **WHEN** assembler is assigned and has required materials
- **THEN** after 30s it produces 1 ration_deluxe
