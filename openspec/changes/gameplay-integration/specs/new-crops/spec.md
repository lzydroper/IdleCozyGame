## ADDED Requirements

### Requirement: Echo Shroom crop

The system SHALL include an `echo_shroom` entry in `CROPS_CONFIG` with growthTime 90s, yields `{ mana_dust: 2, glow_fiber: 1 }`, seedCost `{ seed_echo_shroom: 1 }`.

#### Scenario: Can plant and harvest echo shroom

- **WHEN** player has `seed_echo_shroom` and plants it in a greenhouse slot
- **THEN** the slot shows a growing echo shroom that matures in 90 seconds
- **THEN** harvesting yields 2 mana_dust and 1 glow_fiber

### Requirement: Magnetic Clover crop

The system SHALL include a `magnetic_clover` entry in `CROPS_CONFIG` with growthTime 180s, yields `{ rusted_spring: 1, scrap_metal: 2 }`, seedCost `{ seed_magnetic_clover: 1 }`.

#### Scenario: Can plant and harvest magnetic clover

- **WHEN** player has `seed_magnetic_clover` and plants it
- **THEN** it matures in 180 seconds and yields rusted_spring x1 + scrap_metal x2

### Requirement: Solar Cactus crop

The system SHALL include a `solar_cactus` entry with growthTime 360s, yields `{ plasma_cell: 1, glow_fiber: 2 }`, seedCost `{ seed_solar_cactus: 1 }`.

#### Scenario: Can plant and harvest solar cactus

- **WHEN** player plants `seed_solar_cactus`
- **THEN** harvest yields 1 plasma_cell and 2 glow_fiber after 360s

### Requirement: Stellar Rose crop

The system SHALL include a `stellar_rose` entry with growthTime 540s, yields `{ dream_shard: 2, mana_dust: 2 }`, seedCost `{ seed_stellar_rose: 1 }`.

#### Scenario: Can plant and harvest stellar rose

- **WHEN** player plants `seed_stellar_rose`
- **THEN** harvest yields 2 dream_shard and 2 mana_dust after 540s

### Requirement: Nebula Moss crop

The system SHALL include a `nebula_moss` entry with growthTime 660s, yields `{ nightmare_tear: 1, aether_pulp: 2 }`, seedCost `{ seed_nebula_moss: 1 }`.

#### Scenario: Can plant and harvest nebula moss

- **WHEN** player plants `seed_nebula_moss`
- **THEN** harvest yields 1 nightmare_tear and 2 aether_pulp after 660s

### Requirement: Storm Sprout crop

The system SHALL include a `storm_sprout` entry with growthTime 840s, yields `{ plasma_arc: 1, plasma_cell: 1 }`, seedCost `{ seed_storm_sprout: 1 }`.

#### Scenario: Can plant and harvest storm sprout

- **WHEN** player plants `seed_storm_sprout`
- **THEN** harvest yields 1 plasma_arc and 1 plasma_cell after 840s

### Requirement: Crystal Reed crop

The system SHALL include a `crystal_reed` entry with growthTime 300s, yields `{ crystal_silicon: 1, steel_petal: 2 }`, seedCost `{ seed_crystal_reed: 1 }`.

#### Scenario: Can plant and harvest crystal reed

- **WHEN** player plants `seed_crystal_reed`
- **THEN** harvest yields 1 crystal_silicon and 2 steel_petal after 300s

### Requirement: Shadow Fern crop

The system SHALL include a `shadow_fern` entry with growthTime 1080s, yields `{ void_essence: 2, dream_shard: 1 }`, seedCost `{ seed_shadow_fern: 1 }`.

#### Scenario: Can plant and harvest shadow fern

- **WHEN** player plants `seed_shadow_fern`
- **THEN** harvest yields 2 void_essence and 1 dream_shard after 1080s

### Requirement: Chrono Vine crop

The system SHALL include a `chrono_vine` entry with growthTime 1500s, yields `{ aether_ingot: 1, void_essence: 2 }`, seedCost `{ seed_chrono_vine: 1 }`.

#### Scenario: Can plant and harvest chrono vine

- **WHEN** player plants `seed_chrono_vine`
- **THEN** harvest yields 1 aether_ingot and 2 void_essence after 1500s

### Requirement: Crop images gracefully fall back

The system SHALL gracefully render new crops when no `image` property is set, falling back to displaying crop name and associated seed emoji.

#### Scenario: No image does not crash rendering

- **WHEN** a crop has `image: undefined` in `CROPS_CONFIG`
- **THEN** the greenhouse tab shows the crop name and seed emoji without error
