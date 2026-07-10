## ADDED Requirements

### Requirement: Rescue event for soldier

The system SHALL include a `rescue_soldier` entry in `RESCUE_EVENTS` set at `poison_factory` location, described as a combat-type rescue from a collapsed biochemical lab.

#### Scenario: Rescue soldier at poison_factory

- **WHEN** player reaches `poison_factory` location
- **THEN** `rescue_soldier` event is presented with two choices
- **THEN** choice A costs `{ defensive_turret: 1 }` and causes `{ hp: -10 }`, with log text confirming rescue
- **THEN** choice B costs `{ hp: -25, energy: -20 }`, with log text confirming rescue

### Requirement: Rescue event for healer

The system SHALL include a `rescue_healer` entry in `RESCUE_EVENTS` set at `ruined_armory` location, described as a danger-type rescue from collapsed weapon racks.

#### Scenario: Rescue healer at ruined_armory

- **WHEN** player reaches `ruined_armory` location
- **THEN** `rescue_healer` event is presented with two choices
- **THEN** choice A costs `{ nanite_injector: 1 }`, with log text confirming rescue
- **THEN** choice B costs `{ hp: -15, energy: -25 }`, with log text confirming rescue

### Requirement: Rescue event for apprentice

The system SHALL include a `rescue_apprentice` entry in `RESCUE_EVENTS` set at `ancient_library` location, described as a danger-type rescue from collapsing bookshelves.

#### Scenario: Rescue apprentice at ancient_library

- **WHEN** player reaches `ancient_library` location
- **THEN** `rescue_apprentice` event is presented with two choices
- **THEN** choice A costs `{ ration: 3 }`, with log text confirming rescue
- **THEN** choice B costs `{ energy: -30 }`, with log text confirming rescue

### Requirement: RESCUE_LOCATION_MAP for new locations

The system SHALL include mappings in `RESCUE_LOCATION_MAP`: `poison_factory -> rescue_soldier`, `ruined_armory -> rescue_healer`, `ancient_library -> rescue_apprentice`.

#### Scenario: New locations trigger correct rescue events

- **WHEN** player first visits `poison_factory`
- **THEN** `rescue_soldier` event triggers
- **WHEN** player first visits `ruined_armory`
- **THEN** `rescue_healer` event triggers
- **WHEN** player first visits `ancient_library`
- **THEN** `rescue_apprentice` event triggers

### Requirement: Dream signal event for soldier

The system SHALL include a `soldier_signal` entry in `DREAM_EVENTS` of type `signal`, with A choice granting `resonance: 50` targeting soldier and B choice granting `sanity: -1`.

#### Scenario: Dream signal for soldier appears

- **WHEN** player enters a dream
- **THEN** `soldier_signal` may appear as a signal-type dream event
- **THEN** the event title describes a steel forging sound and battle cry

### Requirement: Dream signal event for healer

The system SHALL include a `healer_signal` entry in `DREAM_EVENTS` of type `signal`, with A choice granting `resonance: 50` targeting healer and B choice granting `sanity: -1`.

#### Scenario: Dream signal for healer appears

- **WHEN** player enters a dream
- **THEN** `healer_signal` may appear as a signal-type dream event
- **THEN** the event title describes herb scent and medical broadcast

### Requirement: Dream signal event for apprentice

The system SHALL include a `apprentice_signal` entry in `DREAM_EVENTS` of type `signal`, with A choice granting `resonance: 50` targeting apprentice and B choice granting `sanity: -1`.

#### Scenario: Dream signal for apprentice appears

- **WHEN** player enters a dream
- **THEN** `apprentice_signal` may appear as a signal-type dream event
- **THEN** the event title describes book rustling and radio static

### Requirement: Expedition locations for survivor rescue

The system SHALL include three new expedition locations in `EXPEDITION_LOCATIONS`: `poison_factory`, `ruined_armory`, `ancient_library`, each with unique loot tables and scavenge intervals.

#### Scenario: poison_factory location exists

- **WHEN** player views the expedition map
- **THEN** `poison_factory` is listed with displayName "废弃制药厂", requiredRole `engineer`, scavengeInterval 420s
- **THEN** its lootTable includes crystal_silicon(0.4), nanite_slurry(0.2), scrap_metal(0.6), ration(0.2)

#### Scenario: ruined_armory location exists

- **WHEN** player views the expedition map
- **THEN** `ruined_armory` is listed with displayName "坍塌军械库", requiredRole `guard`, scavengeInterval 360s
- **THEN** its lootTable includes rusted_spring(0.5), alloy_plate(0.3), mana_dust(0.4), seed_crystal_reed(0.15)

#### Scenario: ancient_library location exists

- **WHEN** player views the expedition map
- **THEN** `ancient_library` is listed with displayName "旧世大图书馆", requiredRole `null`, scavengeInterval 300s
- **THEN** its lootTable includes dream_shard(0.3), mana_dust(0.5), nightmare_tear(0.05), seed_stellar_rose(0.1)
