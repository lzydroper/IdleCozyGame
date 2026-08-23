# 全量归位映射表（config-json-migration 01 交付物）

> 范围：src/data/ 全部 .ts（顶层 31 + items/ 子夹 6 = **37 文件**，另 4 个 *.test.ts 随模块迁移）。
> 法则引用：三分类 / key 化+工厂外置 / 实体细粒度 / 玩法子系统分域 / 命名破坏性重构（均见 map Notes）。
> 引用面说明：各文件迁移时的精确波及清单由实施票逐文件 `grep from '…data/<module>'` 得出；本表「主要消费方」列给出概览。

## A. data/*.json 归位表（内容数据）

| 原文件 | 新位置 | 拆分/处置 | 污染处置 | 主要消费方 |
|---|---|---|---|---|
| heroes.ts | data/entities/heroes/\<id\>/heroInfo.json + duty.json | HeroConfig 拆：基础字段→heroInfo；HeroDutyMeta/DutyBonus/DutyScope→duty.json | HERO_CLASS_LABELS/COLORS、FACTION_LABELS → configs/constants/heroDisplay.ts；STARTER_HERO_ID → configs/seed | state/combat、WildernessTab、PartySlotModal 等 |
| enemies.ts | data/entities/enemies/\<enemyId\>.json（每敌一文件） | 单文件已薄，不拆 | 无 | combat.ts、levelCombat |
| survivors.ts | data/entities/survivors.json | — | 无 | rescue 流程 |
| regions.ts | data/regions/\<NN_name\>/{regionInfo,levels,expedition}.json | 每区域一夹三文件；expedition 缺省无 | 类型 DropEntry/RegionUnlock* /LevelConfig/ExpeditionConfig/RegionConfig/ExplorationMilestone → configs/types/region.types.ts | regionSelectors、WildernessTab、RegionSelectorModal |
| abilities.ts | data/combat/abilities/\<abilityId\>.json（每能力一文件，含 basic_attack.json） | 工厂参数形状化 | strike/aoe/heal 工厂 → configs/factories/abilities.factory.ts；BASIC_ATTACK 同走 json | state/abilityRuntime、combat.ts、entityFactory |
| bonds.ts | data/progression/bonds.json | interface → types/progression.types.ts | 无 | state/bonds |
| awakening.ts | 拆两半：AWAKEN_CONFIG → entities/heroes/\<id\>/awaken.json（每英雄）；STAR_MAX/starUpShardCost/AWAKEN_COST/STAR_STATS_PER_STAR → configs/constants/awakeningConstants.ts | per-hero 拆分示范 | starUpShardCost 公式函数随常量文件（configs 允许） | state/awakening |
| talents.ts | 拆两半：TALENT_TRUNKS → data/progression/talentTrunks.json；HERO_TALENTS → entities/heroes/\<id\>/talent.json | 全局树 vs 英雄专属分离（05 号票细化） | buildTalentTree/formatTalentGate → src/state/talentsTree.ts（运行时构建） | state/talents、HeroTalentPanel |
| heroGrowth.ts | 拆两半：HERO_GROWTH_BY_CLASS → data/progression/growthByClass.json；PRIMARY_STAT_DESCRIPTIONS → configs/constants/heroDisplay.ts | levelMilestones（在 HeroConfig 内）随英雄 growth.json（05 号票定边界） | getHeroGrowth/getLevelMilestoneBonus/getMilestoneModifiers/heroBaseAttributes 公式 → src/state/heroGrowth.ts | state/statSystem、combat、heroGrowth 相关组件 |
| crops.ts | data/farming/crops.json | 种植域独立（J8③） | 无 | greenhouse |
| recipes.ts | data/workshop/recipes.json | 工坊域（J8③） | 无 | workshop |
| autoRecipes.ts | data/workshop/autoRecipes.json | 工坊域 | 无 | tick/facility |
| facilities.ts | data/shelter/facilities.json | 后勤域 | icon: LucideIcon → iconKey 字段 + mappings/iconMap；isFacilityType/FacilityType → types/gameplay.types | GameContext/shelter |
| shelterUpgrades.ts | data/shelter/shelterUpgrades.json | 后勤域 | icon → iconKey | shelter 升级 |
| items/index.ts | （装配层）→ configs/loaders/items.loader.ts | ITEM_CATEGORIES 常量 + 四表合并逻辑归 loader | ITEMS_CONFIG 合并逻辑 = 装配 | 全仓物品查询 |
| items/types.ts | configs/types/item.types.ts | ItemMeta.icon: LucideIcon → iconKey: string | LucideIcon 引用移除 | 全仓 |
| items/equipment.ts | data/items/equipmentItems.json（命名区分装备系统配置） | SLOT_FALLBACK_ICONS → iconMap | LucideIcon → key | items.loader |
| items/resources.ts | data/items/resources.json | — | icon → key | items.loader |
| items/shards.ts | data/items/shards.json | — | icon → key | items.loader |
| items/props.ts | data/items/consumables.json | 破坏性重命名：props→consumables（对齐 CONTEXT 道具术语） | icon → key | items.loader |

## B. configs/** 归位表（接口/常量/装配/种子）

| 原文件 | 新位置 | 说明 |
|---|---|---|
| gameConstants.ts | configs/constants/gameConstants.ts | 数值常量（J2 法则） |
| combatConfig.ts | configs/constants/combatConfig.ts | 接口随文件 |
| statConfig.ts | configs/constants/statConfig.ts | DEFAULT_*/SCALING/BUFF_LIMIT/DAMAGE_CONFIG/BaseStatsSeed |
| explorationConfig.ts | configs/constants/explorationConfig.ts | — |
| uiConstants.ts | configs/constants/uiConstants.ts | UI_TOKENS |
| summonConfig.ts | configs/constants/summonConfig.ts | 召唤机制数值常量 |
| nightmareConfig.ts | configs/constants/nightmareConfig.ts | 梦魇防御数值常量（非事件内容表） |
| heroLore.ts | configs/constants/heroLore.ts | 共享 lore（用户裁决①）；COLORS 并入 heroDisplay |
| workshopCategories.ts | configs/constants/workshopCategories.ts | 常量配置（用户裁决②）；icon → key + iconMap |
| equipment.ts 常量段 | configs/constants/equipmentConstants.ts | ENHANCE_MAX/MYTHIC_*/FACTION_*/FORGE_COST/SLOTS/LABELS/enhanceCost() |
| awakening.ts 常量段 | configs/constants/awakeningConstants.ts | 见 A 表 |
| entityConfig.ts | configs/types/entity.types.ts | EntityKind/EnemyRole/AbilityRef/EntityConfigBase/EnemyConfig/OtherConfig |
| initialState.ts | configs/seed/initialState.ts | createInitialHero/INITIAL_* 整体迁入（「赋值相关」归 configs） |

## C. 迁出 data/ → src/state/（运行时逻辑）

| 原文件 | 新位置 | 说明 |
|---|---|---|
| regionSelectors.ts | src/state/regionSelectors.ts | 选择器查询逻辑整体迁移，import 面全量改 |
| talents.ts 构建段 | src/state/talentsTree.ts | buildTalentTree/formatTalentGate |
| heroGrowth.ts 公式段 | src/state/heroGrowth.ts | 四个成长公式函数（消费 json 常量表） |

## D. 破坏性重命名对照

| 旧名 | 新名 | 理由 |
|---|---|---|
| items/props.ts | items/consumables.json | 对齐 CONTEXT「道具」术语 |
| items/equipment.ts（ItemMeta 表） | items/equipmentItems.json | 与装备系统 equipment.ts 区分 |
| gameplay/（草案域） | farming/ + workshop/ + shelter/ 三域 | J8③ 子系统分离 |
| heroLore（拟入英雄文件） | configs/constants/heroLore.ts | 用户裁决① 共享常量 |
| nightmareConfig（拟入 events） | configs/constants/nightmareConfig.ts | 内容为机制数值而非事件表 |

## E. 测试文件去向

| 原测试 | 去向 |
|---|---|
| heroes.test.ts / heroesDuty.test.ts | 随英雄域改造 → entities loader/装配测试（合并或拆分实施时定） |
| abilities.test.ts | 随 abilities json 化 → combat 域测试 |
| regions.test.ts | 随 regions 重组织 → regions loader 测试 |

## F. 待 02–05 号票细化的开口

- loader 形态（glob vs 显式）与断言规范 → 02 号票
- iconKey 词表与 GameIcon 兼容 → 03 号票
- abilities json 三类形状样例 → 04 号票
- 英雄五文件的字段级边界（talent/duty/awaken/growth）与敌人单文件确认 → 05 号票
