## ADDED Requirements

### Requirement: New items in expedition loot tables

The system SHALL add new material/supply items to existing `EXPEDITION_LOCATIONS` loot tables for `radar_station`, `subway_station`, `bio_lab`.

#### Scenario: radar_station drops crystal_silicon

- **WHEN** scavenging at `radar_station`
- **THEN** lootTable includes `crystal_silicon` at 0.05 chance
- **THEN** original loot items remain unchanged

#### Scenario: subway_station drops rusted_spring

- **WHEN** scavenging at `subway_station`
- **THEN** lootTable includes `rusted_spring` at 0.1 chance

#### Scenario: bio_lab drops nanite_slurry

- **WHEN** scavenging at `bio_lab`
- **THEN** lootTable includes `nanite_slurry` at 0.15 chance

### Requirement: New items in reality event rewards

The system SHALL add new material/supply items to selected reality event reward pools, in both existing and new events.

#### Scenario: ruined_truck can drop crystal_silicon

- **WHEN** player searches the ruined_truck B choice (魔能超频)
- **THEN** reward includes `crystal_silicon: 1` alongside existing items

#### Scenario: abandoned_train drops new items

- **WHEN** player searches abandoned_train (已有事件)
- **THEN** choice A reward includes `rusted_spring: 1` added to existing `alloy_plate`, `scrap_metal`
- **THEN** choice B reward includes `crystal_silicon: 1` added to existing `plasma_cell`, `scrap_metal`

#### Scenario: fungus_nest drops nanite_slurry

- **WHEN** player searches fungus_nest choice B (魔能焚烧)
- **THEN** reward includes `nanite_slurry: 1` added to existing `mana_dust`, `scrap_metal`

#### Scenario: abandoned_lab drops new items

- **WHEN** player searches abandoned_lab (遗迹类事件)
- **THEN** choice A reward includes `aether_ingot: 1` alongside `seed_void_lotus`, `void_essence`
- **THEN** choice B reward includes `nanite_slurry: 1` alongside `alloy_plate`

#### Scenario: wasteland_bandits drops stimpack

- **WHEN** player defeats wasteland_bandits choice A
- **THEN** reward includes `stimpack: 1` added to existing `scrap_metal`, `ration`, `mana_dust`

#### Scenario: sandstorm drops geiger_counter

- **WHEN** player endures sandstorm choice B (护盾)
- **THEN** reward includes `geiger_counter: 1` alongside `dream_shard`, `mana_dust`
