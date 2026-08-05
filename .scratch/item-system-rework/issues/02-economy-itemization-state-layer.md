# 02 — 经济实体物品化：状态层迁移

**What to build:** 召唤货币（灵魂残响）与两种升星碎片（共鸣碎片、英雄专属灵魂碎片）从 `GameState` 顶层隐藏字段迁入背包：召唤、升星、觉醒、战斗掉落、离线结算全部按背包口径读写，存档持久化适配新结构；旧存档按新默认初始化，无兼容代码。数值规则不变。

**Blocked by:** 01 — 物品注册表单一真相源与四分类落地

**Status:** resolved

- [x] `GameState` 不再包含灵魂残响/共鸣碎片/灵魂碎片顶层字段；`inventory` 初始含 `soul_echo: 500`、`resonance_shard: 0`、`shard_<heroId>: 0`（9 位英雄各一，随 `HEROES_CONFIG` 动态生成）
- [x] 召唤从背包扣除灵魂残响（单抽/十抽、余额不足判定）；重复英雄转化为对应 `shard_<hero>` 入背包；未中奖 +1 共鸣碎片入背包；满星英雄溢出碎片 1:1 转共鸣碎片（数值与规则不变）
- [x] 升星消耗先扣英雄专属碎片再扣通用共鸣碎片（含 1:1 混用补齐逻辑），均走背包；觉醒消耗奥术星体不受影响
- [x] 战斗胜利与离线挂机结算的灵魂残响落账进背包（结算报告字段保留，仅落账路径变更）
- [x] 存档持久化合并适配新结构（仅补经济条目默认值，防初始物品复活）；旧存档经济余额按 ADR-0014 alpha 决策舍弃，无迁移代码
- [x] 状态层测试（召唤/升星/战斗/离线/持久化合并）断言路径改为背包条目，数值断言与重构前一致，全绿

## Answer

已在分支 `hero-ehco` 完成（commit `01fb4d9`），全量 324 测试通过、tsc/vite build 绿、oxlint 与基线一致（零新增）。

**实施要点（逐模块 TDD：先改测试红 → 迁移实现绿）**：
- `GameState` 删除 `soulEchoes` / `resonanceShards` / `soulShards` 三个顶层字段；`initialState.inventory` 含 `soul_echo: 500`、`resonance_shard: 0`、`shard_<heroId>: 0`（随 `HEROES_CONFIG` 动态生成）；
- `state/summon.ts`：单抽/十抽余额校验与扣款、重复英雄转化 `shard_<hero>`、未中奖 +1 `resonance_shard`、满星溢出 1:1 转共鸣——全按背包口径，数值规则逐行等价；
- `state/awakening.ts`：升星先扣专属再扣通用（1:1 补齐）、满星溢出转换保留；觉醒消耗 `arcane_orb` 不受影响；
- `state/combat.ts` / `state/offline.ts`：战斗、挂机、区域 BOSS 战灵魂残响直接累加进 `inventory.soul_echo`，`CombatSettlement.soulEchoes` 报告字段保留；
- `state/persistence.ts`：`mergeSavedState` 对 inventory **仅补经济条目默认值**（`soul_echo`/`resonance_shard`/`shard_*`），其余物品以存档为准——避免全量合并导致精简/空背包存档"复活"初始物品（该缺陷在 WildernessTab 战败测试中暴露并修正）；旧存档经济余额按 ADR-0014 alpha 决策舍弃不迁移；
- UI 最小适配（保证 tsc/全量测试绿）：`SummonTab` 货币显示与扣款校验、`HeroDetailModal` 碎片数显示改读背包；完整 UI 交互完善属票据 03；
- 测试迁移：summon/awakening/combat/idle/zone/heroes 持久化断言路径全部改 inventory（数值断言不变），组件测试 fixture 同步；`LogTab.test` 的 `renderWithSave` 改为清零初始键以保持"背包=传入物品"语义。
