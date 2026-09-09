# 09 — 内容盘点与迁移映射草稿

> Type: research · Status: draft（事实盘点 + 映射草稿，不替代 01–07/10 的最终决议）
> 产出目标：给 02/03/04/05/06/07 提供输入；所有数值类「拍板点」均已显式标注，不暗中发明平衡数字。

## 0. 事实源与迁移约定

事实源（本票核对过的真相文件）：

- `src/data/combatZones.ts` — `CombatDropConfig`(4-9)、`CombatZoneBossConfig`(12-20)、`CombatZoneConfig`(22-35)、`COMBAT_ZONES`(39-192)、`COMBAT_ZONE_LIST`(195-196)
- `src/data/enemies.ts` — `ENEMY_CONFIGS`(11-137)，`role` 定义见 `src/data/entityConfig.ts`(19)
- `src/data/realityEvents.ts` — `REALITY_EVENTS`(39-801)、`CATEGORY_WEIGHTS`(803-811)
- `src/data/expeditionLocations.ts` — `EXPEDITION_LOCATIONS`(21-93)
- `src/data/rescueEvents.ts` — `RESCUE_EVENTS`(3-85)、`RESCUE_LOCATION_MAP`(87-97)
- `src/data/survivors.ts` — `SURVIVORS_CONFIG.realityLocationId`(12-104)
- `src/data/gameConstants.ts` — 探索硬编码消耗(6-9)
- `src/data/items/props.ts`(20) — `exp_tome` 每本 `heroExp: 100`
- `src/types/game.ts` — `CombatState`(135-140)、`CombatIdleState`(128-132)、exploration 字段(161-178)
- `src/state/combat.ts` — `zonesCleared`/解锁/挂机/结算(197-763)
- `docs/combat/Level.md`、`docs/combat/readme.md`、`.scratch/combat-level/map.md` — 已敲定方向

### 0.1 Drop 转换规则（草案，需 02 票拍板）

1. `chancePercent = round(chance × 100)`。
2. `count = minQty === maxQty ? minQty : round((minQty + maxQty) / 2)`（四舍五入，1.5→2、12.5→13、21.5→22）。
3. `chancePercent === 100 && minQty === maxQty` → `{kind:'fixed', itemId, count}`。
4. `chancePercent === 100 && minQty !== maxQty` → 三形态无法无损表达「必掉 30–50 个」的范围；本表暂用 `{kind:'fixed', itemId, count: round(avg)}`，**需拍板**（只影响 `equipment_test_zone` 的 `enhance_stone`）。
5. 其余 → `{kind:'chance', itemId, count, chancePercent}`。
6. `soulEchoMin/Max` → `{kind:'fixed', itemId:'soul_echo', count: round((min+max)/2)}`；范围被塌缩成单值，**需拍板**（是否接受固定值，还是未来用 weighted 池逼近范围）。
7. `weighted` 三形态当前内容没有任何用例，仅保留扩展位。

### 0.2 经验转换规则（草案，需 02 票拍板）

- 现有 `exp_tome` 概率掉落条目照常迁移为 `chance` 条目。
- 直发经验 `expReward`（语义为「每位上阵英雄经验」）改为物品掉落：本表额外加一条
  `{kind:'fixed', itemId:'exp_tome', count: max(1, ceil(expReward / 100))}`（1 本 = 100 经验）。
- **这是最大歧义点**：旧 `expReward` 按上阵人数 ×N 发放，改成背包物品后无法按队伍人数动态换算；
  本表用「保底 1 本」作草稿，最终取 `1` 本 / `round(expReward×partySize/100)` / 彻底删掉直发经验只留概率掉落，三选一需拍板。

---

## 1. COMBAT_ZONES → Region / Level 迁移表

建议直接复用旧 zone id 作为 region id（破坏性重构、无旧存档兼容负担），每个 zone 拆 2 个关卡：
`{regionId}_1`（普通战）与 `{regionId}_2`（关底，末位）。BOSS 不是独立关卡，只是 `{regionId}_2` 里的 `role:'boss'` 敌人。

### 1.1 汇总

| 旧 zone id | 建议 region id | 建议 levelIds | enemyPool | 主线顺序 |
|---|---|---|---|---|
| `wasteland_entrance` (combatZones.ts:82) | `wasteland_entrance` | `wasteland_entrance_1`, `wasteland_entrance_2` | `wasteland_hound`, `mutant_rat`, `wasteland_hound_king` | 1 |
| `old_town_ruins` (combatZones.ts:116) | `old_town_ruins` | `old_town_ruins_1`, `old_town_ruins_2` | `ruin_scavenger`, `mutant_rat_elite`, `ruin_overlord` | 2 |
| `radiated_workshop` (combatZones.ts:153) | `radiated_workshop` | `radiated_workshop_1`, `radiated_workshop_2` | `radiation_mutant`, `rogue_machine`, `aberrant_subject`, `workshop_abomination` | 3 |
| `equipment_test_zone` (combatZones.ts:40) | `equipment_test_zone` | `equipment_test_zone_1`, `equipment_test_zone_2` | `test_dummy`, `test_boss` | 不进主线（`isTestZone`） |

### 1.2 wasteland_entrance → region `wasteland_entrance`

- `wasteland_entrance_1` enemies: `['wasteland_hound','mutant_rat']`（均为 normal，enemies.ts:33/42）
- `wasteland_entrance_2` enemies: `['wasteland_hound_king']`（`role:'boss'`，enemies.ts:60）

`wasteland_entrance_1`：

| 旧配置 | 旧值 | 新 DropEntry |
|---|---|---|
| drops scrap_metal | 0.6, 1–2 | `{kind:'chance', itemId:'scrap_metal', count:2, chancePercent:60}` |
| drops glow_fiber | 0.4, 1–2 | `{kind:'chance', itemId:'glow_fiber', count:2, chancePercent:40}` |
| drops enhance_stone | 0.5, 1–2 | `{kind:'chance', itemId:'enhance_stone', count:2, chancePercent:50}` |
| drops exp_tome | 0.35, 1–1 | `{kind:'chance', itemId:'exp_tome', count:1, chancePercent:35}` |
| soulEcho 2–4 | 范围 | `{kind:'fixed', itemId:'soul_echo', count:3}`（塌缩，需拍板） |
| expReward 20 | 每英雄直发 | `{kind:'fixed', itemId:'exp_tome', count:1}`（保底 1 本，需拍板） |

`wasteland_entrance_2`（BOSS 关，旧 `zone.boss`，combatZones.ts:99-114）：

| 旧配置 | 旧值 | 新 DropEntry |
|---|---|---|
| scrap_metal | 0.8, 2–4 | `{kind:'chance', itemId:'scrap_metal', count:3, chancePercent:80}` |
| glow_fiber | 0.5, 1–3 | `{kind:'chance', itemId:'glow_fiber', count:2, chancePercent:50}` |
| mana_dust | 0.3, 1–2 | `{kind:'chance', itemId:'mana_dust', count:2, chancePercent:30}` |
| enhance_stone | 0.7, 1–3 | `{kind:'chance', itemId:'enhance_stone', count:2, chancePercent:70}` |
| exp_tome | 0.6, 1–2 | `{kind:'chance', itemId:'exp_tome', count:2, chancePercent:60}` |
| soulEcho 5–8 | 范围 | `{kind:'fixed', itemId:'soul_echo', count:7}`（需拍板） |
| expReward 30 | 每英雄直发 | `{kind:'fixed', itemId:'exp_tome', count:1}`（需拍板） |

`firstClearDrops`：建议 `undefined`（当前无首通额外掉落）。

### 1.3 old_town_ruins → region `old_town_ruins`

- `old_town_ruins_1` enemies: `['ruin_scavenger','mutant_rat_elite']`（normal，enemies.ts:71/51）
- `old_town_ruins_2` enemies: `['ruin_overlord','mutant_rat_elite']`（`ruin_overlord` 为 boss，enemies.ts:80；`mutant_rat_elite` 为护卫）

`old_town_ruins_1`：

| 旧配置 | 旧值 | 新 DropEntry |
|---|---|---|
| scrap_metal | 0.7, 1–3 | `{kind:'chance', itemId:'scrap_metal', count:2, chancePercent:70}` |
| alloy_plate | 0.3, 1–1 | `{kind:'chance', itemId:'alloy_plate', count:1, chancePercent:30}` |
| mana_dust | 0.3, 1–2 | `{kind:'chance', itemId:'mana_dust', count:2, chancePercent:30}` |
| enhance_stone | 0.6, 1–3 | `{kind:'chance', itemId:'enhance_stone', count:2, chancePercent:60}` |
| exp_tome | 0.35, 1–1 | `{kind:'chance', itemId:'exp_tome', count:1, chancePercent:35}` |
| soulEcho 4–7 | 范围 | `{kind:'fixed', itemId:'soul_echo', count:6}`（需拍板） |
| expReward 35 | 每英雄直发 | `{kind:'fixed', itemId:'exp_tome', count:1}`（需拍板） |

`old_town_ruins_2`（BOSS 关，combatZones.ts:134-150）：

| 旧配置 | 旧值 | 新 DropEntry |
|---|---|---|
| alloy_plate | 0.6, 1–2 | `{kind:'chance', itemId:'alloy_plate', count:2, chancePercent:60}` |
| ember_weapon | 0.15, 1–1 | `{kind:'chance', itemId:'ember_weapon', count:1, chancePercent:15}` |
| ember_armor | 0.1, 1–1 | `{kind:'chance', itemId:'ember_armor', count:1, chancePercent:10}` |
| ember_trinket | 0.1, 1–1 | `{kind:'chance', itemId:'ember_trinket', count:1, chancePercent:10}` |
| blueprint_ember_armory | 0.25, 1–1 | `{kind:'chance', itemId:'blueprint_ember_armory', count:1, chancePercent:25}`（或移入 firstClearDrops，需拍板） |
| enhance_stone | 0.8, 2–4 | `{kind:'chance', itemId:'enhance_stone', count:3, chancePercent:80}` |
| exp_tome | 0.6, 1–2 | `{kind:'chance', itemId:'exp_tome', count:2, chancePercent:60}` |
| soulEcho 10–15 | 范围 | `{kind:'fixed', itemId:'soul_echo', count:13}`（需拍板） |
| expReward 50 | 每英雄直发 | `{kind:'fixed', itemId:'exp_tome', count:1}`（需拍板） |

### 1.4 radiated_workshop → region `radiated_workshop`

- `radiated_workshop_1` enemies: `['radiation_mutant','rogue_machine','aberrant_subject']`（normal，enemies.ts:91/100/109）
- `radiated_workshop_2` enemies: `['workshop_abomination','rogue_machine']`（`workshop_abomination` 为 boss，enemies.ts:118；`rogue_machine` 为护卫）

`radiated_workshop_1`：

| 旧配置 | 旧值 | 新 DropEntry |
|---|---|---|
| alloy_plate | 0.6, 1–2 | `{kind:'chance', itemId:'alloy_plate', count:2, chancePercent:60}` |
| rusted_spring | 0.4, 1–2 | `{kind:'chance', itemId:'rusted_spring', count:2, chancePercent:40}` |
| plasma_cell | 0.25, 1–1 | `{kind:'chance', itemId:'plasma_cell', count:1, chancePercent:25}` |
| nanite_slurry | 0.2, 1–1 | `{kind:'chance', itemId:'nanite_slurry', count:1, chancePercent:20}` |
| enhance_stone | 0.7, 2–4 | `{kind:'chance', itemId:'enhance_stone', count:3, chancePercent:70}` |
| exp_tome | 0.35, 1–1 | `{kind:'chance', itemId:'exp_tome', count:1, chancePercent:35}` |
| soulEcho 8–12 | 范围 | `{kind:'fixed', itemId:'soul_echo', count:10}`（需拍板） |
| expReward 60 | 每英雄直发 | `{kind:'fixed', itemId:'exp_tome', count:1}`（需拍板） |

`radiated_workshop_2`（BOSS 关，combatZones.ts:172-189）：

| 旧配置 | 旧值 | 新 DropEntry |
|---|---|---|
| plasma_cell | 0.5, 1–2 | `{kind:'chance', itemId:'plasma_cell', count:2, chancePercent:50}` |
| nanite_slurry | 0.4, 1–2 | `{kind:'chance', itemId:'nanite_slurry', count:2, chancePercent:40}` |
| starcore_weapon | 0.15, 1–1 | `{kind:'chance', itemId:'starcore_weapon', count:1, chancePercent:15}` |
| starcore_armor | 0.1, 1–1 | `{kind:'chance', itemId:'starcore_armor', count:1, chancePercent:10}` |
| starcore_trinket | 0.1, 1–1 | `{kind:'chance', itemId:'starcore_trinket', count:1, chancePercent:10}` |
| arcane_orb | 0.12, 1–1 | `{kind:'chance', itemId:'arcane_orb', count:1, chancePercent:12}` |
| enhance_stone | 0.9, 3–5 | `{kind:'chance', itemId:'enhance_stone', count:4, chancePercent:90}` |
| exp_tome | 0.6, 1–2 | `{kind:'chance', itemId:'exp_tome', count:2, chancePercent:60}` |
| soulEcho 18–25 | 范围 | `{kind:'fixed', itemId:'soul_echo', count:22}`（需拍板） |
| expReward 80 | 每英雄直发 | `{kind:'fixed', itemId:'exp_tome', count:1}`（需拍板） |

### 1.5 equipment_test_zone → region `equipment_test_zone`（测试区）

- `equipment_test_zone_1` enemies: `['test_dummy']`（normal，enemies.ts:13）
- `equipment_test_zone_2` enemies: `['test_boss']`（`role:'boss'`，enemies.ts:22）

`equipment_test_zone_1`：

| 旧配置 | 旧值 | 新 DropEntry |
|---|---|---|
| wasteland_weapon/armor/trinket | 1.0, 1–1 | 各 `{kind:'fixed', itemId:..., count:1}` |
| dreamveil_weapon/armor/trinket | 1.0, 1–1 | 各 `{kind:'fixed', itemId:..., count:1}` |
| enhance_stone | 1.0, 30–50 | `{kind:'fixed', itemId:'enhance_stone', count:40}`（**100% 范围无法无损表达，需拍板**） |
| blueprint_ember_armory | 1.0, 1–1 | `{kind:'fixed', itemId:'blueprint_ember_armory', count:1}` |
| soulEcho 20–50 | 范围 | `{kind:'fixed', itemId:'soul_echo', count:35}`（需拍板） |
| expReward 50 | 每英雄直发 | `{kind:'fixed', itemId:'exp_tome', count:1}`（需拍板） |

`equipment_test_zone_2`（BOSS 关，combatZones.ts:62-79）：

| 旧配置 | 旧值 | 新 DropEntry |
|---|---|---|
| ember_weapon/armor/trinket | 1.0, 1–1 | 各 `{kind:'fixed', itemId:..., count:1}` |
| starcore_weapon/armor/trinket | 1.0, 1–1 | 各 `{kind:'fixed', itemId:..., count:1}` |
| arcane_orb | 1.0, 1–1 | `{kind:'fixed', itemId:'arcane_orb', count:1}` |
| enhance_stone | 1.0, 100–100 | `{kind:'fixed', itemId:'enhance_stone', count:100}` |
| soulEcho 50–100 | 范围 | `{kind:'fixed', itemId:'soul_echo', count:75}`（需拍板） |
| expReward 100 | 每英雄直发 | `{kind:'fixed', itemId:'exp_tome', count:1}`（需拍板） |

---

## 2. REALITY_EVENTS → 区域 explorationEvents 池

现状：`WildernessTab.drawEvent()` 在**全部** `REALITY_EVENTS` 里按 `CATEGORY_WEIGHTS` 抽（WildernessTab.tsx:59-91），没有任何区域概念；
救援事件在 `RESCUE_EVENTS` 单独触发（WildernessTab.tsx:52-56）。因此下面全部为**新分配草案**。

### 2.1 建议分组（含 3 个 encounter 与 4 个 combat 选择型事件）

| Region | explorationEvents（事件 id） |
|---|---|
| `wasteland_entrance` | `ruined_truck`, `rusty_safe`, `toxic_swamp`, `military_caches`, `mutant_beast`(combat 选择型), `cozy_hotspring`, `abandoned_camp`, `mysterious_capsule`, `acid_rain_storm`, `radiation_leak`, `encounter_wasteland_pack` |
| `old_town_ruins` | `abandoned_train`, `abandoned_cart`, `waste_pool`, `thorn_thicket`, `wasteland_bandits`(combat 选择型), `bat_swarm`(combat 选择型), `hydrological_station`, `wild_fruit`, `ancient_library`, `sandstorm`, `magnetic_storm`, `encounter_ruin_raiders` |
| `radiated_workshop` | `broken_greenhouse`, `supply_crate`, `fungus_nest`, `giant_worm`(combat 选择型), `abandoned_lab`, `old_bunker`, `hail_storm`, `encounter_workshop_horror` |

依据与备注：

- 3 个 encounter 与 3 个主线 zone 的普通敌人一一对应：`encounter_wasteland_pack`(realityEvents.ts:754) ↔ `wasteland_entrance`；`encounter_ruin_raiders`(769) ↔ `old_town_ruins`；`encounter_workshop_horror`(785) ↔ `radiated_workshop`。
- `mutant_beast`(143) 是荒野犬，归 `wasteland_entrance`；`wasteland_bandits`(527)/`bat_swarm`(502) 是城市废墟，归 `old_town_ruins`；`giant_worm`(552) 是高危巨兽，归 `radiated_workshop`。
- welfare 事件只有 4 个且按主题分给了前两区，`radiated_workshop` 没有 welfare：**可接受**（后期区可少安全网），也可把 `wild_fruit` 挪过去；需拍板。
- `ancient_library`(218，relic 事件) 与远征地点 `ancient_library`(expeditionLocations.ts:82) 撞 id：两个注册表当前可共存，但 Region/Level 单表化后建议给 region 加前缀或改名，**需拍板**。

### 2.2 救援事件（单列，不进 explorationEvents 池）

| 救援事件 | 地点 key（RESCUE_LOCATION_MAP:87-97） | 对应 EXPEDITION_LOCATIONS id | 备注 |
|---|---|---|---|
| `rescue_roy` | `radar_station` | `radar_station` | 一致 |
| `rescue_mei` | `green_ruins` | — | 救援专用地点，无远征地点 |
| `rescue_zero` | `signal_tower` | — | 救援专用地点，无远征地点 |
| `rescue_catherine` | `bio_lab` | `bio_lab` | 一致 |
| `rescue_buster` | `collapsed_subway` | `subway_station` | **id 不一致**：survivors.ts:61 也是 `collapsed_subway`，但远征地点是 `subway_station`(expeditionLocations.ts:34) |
| `rescue_nova` | `military_depot` | — | 救援专用地点，无远征地点 |
| `rescue_soldier` | `poison_factory` | `poison_factory` | 一致 |
| `rescue_healer` | `ruined_armory` | `ruined_armory` | 一致 |
| `rescue_apprentice` | `ancient_library` | `ancient_library` | 一致 |

要点：

- 救援按目标特殊触发、不进普通事件池（ticket 05 方向），因此不需要放进 `explorationEvents`。
- `realityLocationId` 与 region id 的收敛关系未定：4 个救援专用地点（`green_ruins`/`signal_tower`/`military_depot`/`collapsed_subway`）没有对应远征地点，是否也建 region 或保留为坐标别名，**需 05 拍板**。
- `collapsed_subway` vs `subway_station` 的 id 不一致是当前事实 bug 级不一致，迁移时应统一。

---

## 3. EXPEDITION_LOCATIONS → region.expedition 映射

结论草案：**6 个远征地点各自成为独立 region（expedition-only region，`levelIds: []`）**，理由是
`RegionConfig.expedition?` 是单一块（map.md 已定），且 `levels` 只表达战斗；若并入 3 个战斗 region 会出现「一个 region 多块 expedition」或「远征没有独立区域」的模型冲突。
（替代方案：把 `radar_station` 并入 `wasteland_entrance`、`subway_station` 并入 `old_town_ruins`，其余 4 个各自成区——但会更不规则，**需 03/07 拍板**。）

| 旧 id | 建议 region id | region 类型 | expedition 块（原样映射字段） | 备注 |
|---|---|---|---|---|
| `radar_station`(22) | `radar_station` | expedition-only | interval 300; rationCost 1; rate 0; lootTable 4 条(0-1 chance) | 早期废土；也是 `rescue_roy` 坐标 |
| `subway_station`(34) | `subway_station` | expedition-only | `requiredFaction:'soulseal'`; interval 240; rationCost 1; rate 600; lootTable 4 条 | 救援侧引用 `collapsed_subway`，需统一 |
| `bio_lab`(46) | `bio_lab` | expedition-only | `requiredFaction:'mechanical'`; interval 360; rate 600; lootTable 4 条 | `rescue_catherine` |
| `poison_factory`(58) | `poison_factory` | expedition-only | `requiredFaction:'mechanical'`; interval 420; rate 600; lootTable 4 条 | `rescue_soldier` |
| `ruined_armory`(70) | `ruined_armory` | expedition-only | `requiredHeroClass:'guardian'`; interval 360; rate 600; lootTable 4 条 | `rescue_healer` |
| `ancient_library`(82) | `ancient_library` | expedition-only | interval 300; rate 600; lootTable 4 条 | `rescue_apprentice`；与 relic 事件 `ancient_library` 撞 id |

需要拍板：

1. **expedition.lootTable 是否也迁到新 DropEntry 三形态**：目标只说「映射当前字段」，但当前 `lootTable` 仍是 `chance 0-1 / minQty / maxQty`，与新掉落模型不一致；建议统一，否则两套掉落模型并存。
2. **expedition-only region 是否允许 `levelIds: []`**（当前 01 票的 `levelIds` 是否可空）。
3. **expedition 区域的解锁顺序**：作为独立 region 后，是插进主线顺序还是挂在对应战斗 region 之后。
4. 远征地点 `lootTable` 数值未在本票重平衡（仅原样搬运）。

---

## 4. 主线 region 顺序与 explorationStepsToClear 初值

建议主线 = 3 个战斗 region（测试区不进主线），顺序沿用现有 `recommendedLevel` 升序（combatZones.ts:195-196）：

| 顺序 | region id | 依据 | explorationStepsToClear 初值 |
|---|---|---|---|
| 1 | `wasteland_entrance` | recommendedLevel 1（combatZones.ts:87） | 10 |
| 2 | `old_town_ruins` | recommendedLevel 3（combatZones.ts:123） | 15 |
| 3 | `radiated_workshop` | recommendedLevel 6（combatZones.ts:159） | 20 |
| — | `equipment_test_zone` | recommendedLevel 99 + `isTestZone`(combatZones.ts:45/48) | 不适用（测试区） |

`explorationStepsToClear` 依据与拍板点：

- 现状唯一步数锚点是**救援 5 步**（`realitySteps >= 4` 触发救援，WildernessTab.tsx:52）；普通探索无终点。
- 因此 10/15/20 是按「约 2–4 个救援长度 + 难度递增」拟的初值，**纯草案，需 04 票定**。
- `map.md` 另提到数据层 `minRunSteps`（暂定 7）与里程碑 `{atPercent, eventId}`；`explorationStepsToClear` 需与其配套，避免 10 步内塞不下里程碑。

---

## 5. 旧字段删除 / 新增字段 / 开放问题

### 5.1 建议删除（数据层）

- `CombatDropConfig { itemId, chance, minQty, maxQty }`（combatZones.ts:4-9）→ `DropEntry` 三形态。
- `CombatZoneBossConfig`（combatZones.ts:12-20）与 `CombatZoneConfig`（22-35）→ `RegionConfig`/`LevelConfig`。
- `COMBAT_ZONES` / `COMBAT_ZONE_LIST` / `ALL_COMBAT_ZONES`（39-198）→ `REGIONS` / `LEVEL_CONFIGS` + 派生索引。
- zone 上的 `recommendedLevel`、`staminaCost`、`expReward`、`enemies`、`drops`、`soulEchoMin/Max`、`boss`（含 `boss.name/staminaCost/expReward/drops/soulEchoMin/Max`）→ 落到 `LevelConfig` 或区域字段。
- `EXPEDITION_LOCATIONS` 与 `ExpeditionLocation`（expeditionLocations.ts:3-21）→ `RegionConfig.expedition?`。
- `GAME_CONSTANTS.EXPLORATION_BASE_FOOD_COST / EXPLORATION_BASE_ENERGY_COST / EXPLORATION_RESCUE_FOOD_COST / EXPLORATION_RESCUE_ENERGY_COST`（gameConstants.ts:6-9）→ `RegionConfig.initialCost`（救援是否单列由 05 定）。

### 5.2 建议新增

- `DropEntry` 可辨识联合：`{kind:'fixed',itemId,count} | {kind:'chance',itemId,count,chancePercent} | {kind:'weighted',pool:[{itemId,count,weight}]}`。
- `RegionConfig`：`id/name/description/enemyPool/explorationEvents/explorationStepsToClear/explorationMilestones/levelIds/unlock?/expedition?/initialCost?/isTestZone?`。
- `LevelConfig`：`id/regionId/name/enemies/drops/firstClearDrops?`（`staminaCost`/`recommendedLevel` 是否入 Level 由 01 定）。
- 关卡通关记录改为 `levelIdsCleared: string[]`（替代 `zonesCleared`，见 readme.md 决策）。
- `regionProgress`（累计完成步数）与区域解锁状态（map.md）。
- 若救援坐标收敛：`realityLocationId` 指向 region id 的映射/别名表。

### 5.3 需要人类拍板的数值/规则（Top 5）

1. **数量范围塌缩规则**：旧 `minQty/maxQty` 到单值 `count` 取「四舍五入平均值」是否可接受；`100% 概率 + 范围数量`（测试区 `enhance_stone` 30–50）三形态无法无损表达。
2. **灵魂残响固定值**：每个 `soulEchoMin/Max` 塌缩成固定 `soul_echo` 的取值（本表取四舍五入均值）；是否接受失去随机区间。
3. **经验物品化换算**：`expReward`（每英雄直发）→ 掉落 `exp_tome` 的册数；本表暂用保底 1 册，是否要按队伍人数换算或只留概率掉落。
4. **远征区域模型**：6 个远征地点各自成 expedition-only region 是否成立；`levelIds` 是否允许为空；expedition.lootTable 是否也迁到整数百分比三形态；解锁顺序如何插入主线。
5. **主线步数与里程碑**：`explorationStepsToClear` 的 10/15/20 初值、`minRunSteps` 与里程碑 `atPercent/eventId` 的配合；测试区在 Region 模型中的最终表达（`isTestZone` 还是独立列表）。

### 5.4 其他开放问题

- `blueprint_ember_armory` 是否从 BOSS 可重复掉落改为 `firstClearDrops` 首通保底。
- 事件 `ancient_library`（relic 事件）与远征地点 `ancient_library` 的 id 冲突如何改名/前缀。
- 救援地点 `collapsed_subway` vs 远征 `subway_station` 的 id 统一。
- `green_ruins`/`signal_tower`/`military_depot` 三个救援专用地点是否建 region。
- `encounter` 事件的 `battle.drops/expReward` 是否改为引用关卡掉落表（ticket 06 Q3），本票未展开。
