# 配置 JSON 化迁移蓝图（config-json-migration 06 终点交付物）

> 输入：[mapping.md](mapping.md)（37 文件归位表）+ 02 号票（混合制分载/DEV 守卫/五项 seam）+ 03 号票（icon key 装配注入）+ 04 号票（直存展开/description 模板）+ 05 号票（英雄五文件/敌人单文件/归并三语义）+ 07 号票（buff 数据驱动词表与物化器）。
> 总验收口径：**src/data 下仅存在 .json**；configs 七类职责目录就位；全量 build + 测试绿；玩家可见数据模型（GameState）零变化。

## 前置全局项（随批次①首张工单执行）

- `tsconfig.app.json` 追加 `"resolveJsonModule": true`；
- `types/game.ts` 的 `FacilityType` 引用切换至 `configs/types/gameplay.types.ts`（types→configs 单向依赖合法化）。

---

## 批次① 管线验证（configs 骨架 + 常量域 + json 试点）

**目标**：加载管线端到端打通，常量域全部归位 configs。

| 工单 | 内容 |
|---|---|
| 1.1 | configs 目录骨架七夹落位（types/constants/loaders/mappings/seed）；types 七文件从各源抽类型定型（entity.types 吸收 entityConfig.ts 全量、region.types 吸收 regions.ts 类型段、item.types 吸收 items/types.ts…） |
| 1.2 | constants 域 12 文件归位：gameConstants / combatConfig / statConfig / explorationConfig / uiConstants / summonConfig / nightmareConfig / heroLore / workshopCategories（icon→key）/ equipmentConstants / awakeningConstants / heroDisplay——纯移动 + 全仓 import 面修正 |
| 1.3 | loader 工具骨架：devGuard.ts（DEV 必填检查）、glob 包装器（eager + as 断言单点）、显式包装器；integrity 测试样板（五项检查参考实现） |
| 1.4 | json 试点端到端：`data/farming/crops.json` + gameplay.loader（crops 段）+ farming.integrity.test——首个「ts 删、json 上、消费方只改 import 路径」完整闭环 |

依赖：无。**验收**：build + 全量测试绿；crops 数据源为 json 且温室流程不变。

## 批次② 固定集合内容表批量迁移

**目标**：显式域六表组全部 json 化，iconMap 初版就位。

| 工单 | 内容 |
|---|---|
| 2.1 | items 域：equipmentItems/resources/shards/consumables 四 json + items.loader（四表合并逻辑迁入，ITEM_CATEGORIES 随行）；iconMap 初版登记现存全部 lucide key |
| 2.2 | workshop 域：recipes.json / autoRecipes.json + loader 段 |
| 2.3 | shelter 域：facilities.json / shelterUpgrades.json（icon → iconKey，loader 注入后 GameIcon('upgrade')/FacilityCard 零改动） |
| 2.4 | events 域：realityEvents（按类别可拆多文件）/ dreamEvents / rescueEvents / rescueLocations 四 json + event.loader；CATEGORY_WEIGHTS → constants/eventWeights.ts |
| 2.5 | progression 域：bonds.json / talentTrunks.json / growthByClass.json + progression.loader；talents 构建函数移 state/talentsTree.ts、heroGrowth 公式移 state/heroGrowth.ts |

依赖：批次①。**验收**：对应 data/*.ts 清零；各域 integrity 测试就位。

## 批次③ 开放集合与复杂域

**目标**：glob 三域上线，函数字段清零。

| 工单 | 内容 |
|---|---|
| 3.1 | abilities json 化：`combat/abilities/<id>.json`（含 basic_attack，description 用模板 token）+ combat.loader 出口（getAbilityConfig/BASIC_ATTACK）+ description 插值器 |
| 3.2 | buff 数据驱动：公式三原子（perStack/livingEnemies + values 覆盖）+ materializer + `combat/buffs/<id>.json` ×4 + createEffects 退役 + 被动编译链统一（EFFECT_EXECUTORS 注册表不动） |
| 3.3 | 英雄拆分：9 × `<id>/{heroInfo,duty,awaken,talent,growth}.json` + heroes.loader（五 glob 归并，缺省段语义）+ heroDisplay/icon 接线 |
| 3.4 | 敌人拆分：`enemies/<enemyId>.json` ×N + enemies glob |
| 3.5 | regions NN_ 重组织：每区域 `{regionInfo,levels,expedition}.json` + regions.loader（glob）+ regionSelectors 移 src/state/ + 「身份内容化」校验 |

依赖：批次①②（iconMap/devGuard/类型层就绪）。**验收**：开放集合域新增或改名文件夹零代码改动（演示测试）；data 内无函数字段残留。

## 批次④ 收尾

| 工单 | 内容 |
|---|---|
| 4.1 | configs/seed/initialState.ts 归位（createInitialHero/INITIAL_* 整体迁移） |
| 4.2 | data/*.test.ts ×4 随域改造迁移；data/*.ts 残留清零 |
| 4.3 | 终检：全仓 grep 确认 data 引用仅剩 loaders 与 json；AGENTS.md 架构描述与 docs/project_architecture 同步更新 |

依赖：①②③。**验收**：总口径达成。

---

## 批次间关系

```
① ──→ ② ──→ ③ ──→ ④
└───────┴────────────────╮
     （②③内部工单可并行；④必须最后）
```

## 各批 chart 起点

- 批次①②：本蓝图 + [mapping.md](mapping.md) B 表 + 02 号票 Answer；
- 批次③：另需精读 [03](../config-json-migration/tickets/03-icon-keys.md)/[04](tickets/04-ability-shapes.md)/[05](tickets/05-entity-split.md)/[07](tickets/07-buff-data-driven.md) 四票样例与规范；
- 每批开工沿用仓库节奏：spec → tickets → 实施 → build/测试/lint 三绿验收。
