## ADDED Requirements

### Requirement: 21 new items added to ITEMS_CONFIG

The `ITEMS_CONFIG` in `src/data/items.ts` SHALL include 21 new items corresponding to the unused spritesheet slots:

**Seeds (9):**
- `seed_echo_shroom`: 回音真菌孢子, category: 'seed'
- `seed_magnetic_clover`: 磁力三叶草种子, category: 'seed'
- `seed_solar_cactus`: 烈阳仙人掌球, category: 'seed'
- `seed_stellar_rose`: 星辰玫瑰种子, category: 'seed'
- `seed_nebula_moss`: 星云苔藓孢子, category: 'seed'
- `seed_storm_sprout`: 雷暴幼芽种子, category: 'seed'
- `seed_crystal_reed`: 水晶芦苇根茎, category: 'seed'
- `seed_shadow_fern`: 暗影蕨孢子, category: 'seed'
- `seed_chrono_vine`: 时光藤蔓种子, category: 'seed'

**Materials (6):**
- `aether_ingot`: 以太魔导合金锭, category: 'material'
- `crystal_silicon`: 晶体硅面板, category: 'material'
- `nanite_slurry`: 纳米修复泥, category: 'material'
- `nightmare_tear`: 梦魇之泪, category: 'special'
- `rusted_spring`: 生锈弹簧零件, category: 'material'
- `plasma_arc`: 等离子弧能核心, category: 'material'

**Supplies (6):**
- `ration_deluxe`: 高级生存罐头, category: 'food', useEffect: { stats: { food: 45, hp: 10 } }
- `stimpack`: 废土肾上腺素, category: 'equipment', useEffect: { stats: { hp: 35, energy: 15 } }
- `geiger_counter`: 盖革探测仪, category: 'equipment'
- `canteen`: 军用水壶, category: 'equipment', useEffect: { stats: { food: 15 } }
- `deflective_lens`: 偏光魔导镜片, category: 'special'
- `dream_lantern`: 引梦魔灯, category: 'special', useEffect: { stats: { sanity: 10 } }

#### Scenario: All items accessible by ID
- **WHEN** calling `ITEMS_CONFIG['seed_echo_shroom']`
- **THEN** it SHALL return an object with `id`, `name`, `emoji`, `description`, `category`

### Requirement: ICON_CONFIG updated for all new items

`ICON_CONFIG` in `src/components/GameIcon.tsx` SHALL map all 21 new items to their correct sprite sheet and grid index:

- seeds sheet: indices 7–15 for `seed_echo_shroom` through `seed_chrono_vine`
- materials sheet: indices 10–15 for `aether_ingot` through `plasma_arc`
- supplies sheet: indices 10–15 for `ration_deluxe` through `dream_lantern`

#### Scenario: Each new item renders an icon
- **WHEN** `<GameIcon id="seed_echo_shroom" type="item" />` renders
- **THEN** it SHALL display the correct sprite from the seeds sheet at index 7

### Requirement: void_core added to ITEMS_CONFIG

The item `void_core` (虚空核心, category: 'special') SHALL be added to `ITEMS_CONFIG` and `ICON_CONFIG` (supplies sheet, index - or a reasonable next index). This item is referenced in `nightmareConfig.ts` as a turret reward but has no metadata.

#### Scenario: void_core has metadata
- **WHEN** accessing `ITEMS_CONFIG['void_core']`
- **THEN** it SHALL return a valid `ItemMeta` object
