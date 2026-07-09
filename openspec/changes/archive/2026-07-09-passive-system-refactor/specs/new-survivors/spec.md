## ADDED Requirements

### Requirement: Survivor role type extended

The `role` field in both `SurvivorConfig` (`src/data/survivors.ts`) and `Survivor` (`src/types/game.ts`) SHALL be extended from `'farmer' | 'engineer' | 'scout'` to include `'guard'`, `'chemist'`, and `'scavenger'`.

#### Scenario: New roles accepted by type system
- **WHEN** creating a `SurvivorConfig` with `role: 'guard'`
- **THEN** TypeScript SHALL NOT raise a type error

### Requirement: Three new survivors added to SURVIVORS_CONFIG

**soldier (铁卫):**
- role: 'guard'
- Display in survivor selectors with correct Chinese label
- realityLocationId: placeholder (no active rescue event yet)
- Passive: `{ modifier: 'max_hp', adjustment: 20, operator: 'add' }`

**healer (艾拉):**
- role: 'chemist'
- Passive: `{ modifier: 'item_yield:purifying_serum', adjustment: 0.3, operator: 'mul' }`

**apprentice (小米):**
- role: 'scavenger'
- Passive: `{ modifier: 'scavenge_interval', adjustment: -0.25, operator: 'mul' }`

#### Scenario: New survivor appears in ShelterTab survivor list
- **WHEN** rendering ShelterTab
- **THEN** the survivor list SHALL include 铁卫, 艾拉, 小米 with correct role labels

### Requirement: Role display labels updated

All components with role→Chinese label mappings SHALL handle the three new roles:

| Component | Location | Guard | Chemist | Scavenger |
|---|---|---|---|---|
| ShelterTab.tsx | lines 611, 805 | 卫兵 | 药剂师 | 拾荒者 |
| FacilityCard.tsx | line 95 | 卫兵 | 药剂师 | 拾荒者 |
| LogTab.tsx | line 187 | 卫兵 | 药剂师 | 拾荒者 |

#### Scenario: New survivors show correct role label
- **WHEN** a survivor with `role: 'guard'` is displayed in any component
- **THEN** the label SHALL read `卫兵` instead of falling through to the else branch
