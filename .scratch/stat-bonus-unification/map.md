# 统一属性加成修饰符模型（stat-bonus-unification）— Wayfinder Map

## Destination

锁定「单一修饰符模型」的设计决策集，并产出一份可直接交给 to-tickets 的迁移规范：羁绊 / 装备 / 天赋 / 觉醒（及 buff）等所有加成来源统一输出 `{stat, flat/percent, value}` 形态的修饰符，聚合与面板计算收敛到 statSystem 单一路径（`CombatBonus` 退役），战斗、展示与 buff 消费同一计算结果；同时建立「修饰符」等领域术语（CONTEXT.md）。

## Notes

- **领域**：三层属性引擎（ADR-0009）、加成/修饰符统一、战斗面板计算、数据驱动配置。
- **技能**：`grill-with-docs`（grilling）、`domain-modeling`、`prototype`、`research`。
- **既定约束（不可推翻）**：
  - ADR-0009：英雄与怪物统一由 `calculateEntityStats` 驱动；buff 含百分比增幅 + 固定值加成。
  - 本 effort 只出**决策与规范**，不产实现 ticket（实现交给 to-tickets）。
- **已确认的用户决策（chart 阶段）**：
  - 目的地形态 = 决策锁定 + 迁移规范。
  - 统一模型方向 = **单一修饰符模型，`CombatBonus` 退役**。
  - Out of scope = **战斗伤害公式本身**（`calculateDamage` 的元素加成/暴击/减伤/豁免逻辑不动）。
  - CONTEXT.md 术语建立纳入本 effort。
- **现状断层（chart 侦察结论，05 号审计 ticket 将出权威清单）**：
  - 四套并存的属性表达：`CombatBonus`（bonds.ts，仅攻击/防御/生命 3 个百分比字段）、`EquipmentStats`（装备平值）、`ModifiableStat`/`StatModifier`（buffSystem.ts，flat/percent × 14 属性）、`calculateEntityStats`（statSystem.ts 三层引擎）。
  - `heroToCombatant`（战斗路径）手工拼 attackFactor/defenseFactor/hpFactor，未用 `calculateEntityStats`；羁绊/装备/天赋/觉醒四来源各自手写聚合 if 链（addBonus 风格）。
  - `applyBuffsToStats` 的 `(base+flat)*(1+percent)` 与战斗路径的 `base*(1+percentSum)` 语义不一致。
- **关键文件**：`src/data/bonds.ts`、`src/data/{equipment,statConfig,heroGrowth}.ts`、`src/state/{bonds,equipment,talents,awakening,combat,buffSystem,statSystem,combatEngine}.ts`、`src/components/{HeroDetailModal,DetailedStatsModal}.tsx` 及羁绊/天赋/装备相关组件。
- **测试**：组件测试需 `GameProvider` + `ToastProvider` 包裹；`npm run build` 先 `tsc -b`；lint 用 `oxlint`。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [加成体系全仓审计（研究）](issues/05-bonus-consumers-audit.md) — 全仓 4 套属性表达已穷举：CombatBonus 仅战斗+展示真正接入（4 来源各自手写 if 链、heroToCombatant 手工拼 factor）；EquipmentStats 仅战斗生效、UI 部分手写重复公式；**buffSystem（ModifiableStat）与 combatEngine 是零生产引用的孤儿系统**（且 applyBuffsToStats 的元属性 modifier 有累积不生效缺陷）；calculateEntityStats 生产调用仅 HeroDetailModal 展示面板 —— **面板与战斗数值口径不一致**（面板含元属性不含来源百分比，战斗反之）。战斗伤害公式 max(1, atk-def) 与 combatEngine 减伤公式冲突（后者 scope 外，仅记录）。
- [修饰符数据模型形态（原型）](issues/01-modifier-model-shape.md) — HITL 拍板：**D1 形态 = `StatModifier[]`（{stat, kind: flat|percent, value}）**，与 buffSystem 同构、buff 直接并入，source 字段暂不加（04 需要时以可选字段追加）；**D2 StatKey = Base+Primary+Special 三层输入全集 21 项**，派生属性不可直接修饰；**D3 percent 加算、final = (base+Σflat)×(1+Σpercent)、clamp 最终级**，元属性先按 statConfig 系数折算。原型归档 prototype-archive/。已解锁 02/03。
- [修饰符聚合与面板计算管道（决策）](issues/02-aggregation-pipeline.md) — HITL grilling 全确认：**D1** `calculateEntityStats(params, modifiers?: StatModifier[])` 收数组、内部先聚合，导出 `aggregateModifiers` 供 04/测试；**D2** 元属性修饰符折算为 base flat 统一计算（percent 型按 (1+Σpercent) 放大折算值），一次 clamp；**D3** buff 与常驻修饰符同一管道，`applyBuffsToStats` 退役（debuff 意志减免并入聚合步骤），`tickBuffs` 保留；**D4** maxHp 当前血量缩放 = 战斗入场快照职责，计算层只出面板；**D5** heroToCombatant 改「面板快照 + 战斗单位转换」，`CombatBonus` 参数退役。buff 功能实际接入毕业到 Not yet specified。
- [加成来源迁移边界（决策）](issues/03-source-migration-boundary.md) — HITL grilling 全确认：**D1** 数据层直接改 `StatModifier[]`（BONDS/TALENT/AWAKEN/SET 四处），`CombatBonus` 类型删除，无转换层（机械映射 attackPercent:10 → [{stat:'attack',kind:'percent',value:0.10}]）；**D2** EquipmentStats 并入统一修饰符（flat 型输出），`{flat,percent}` 拼接消失；**D3** levelMilestones 保持 base 组成部分，不进修饰符管道；**D4** 旧存档格式不变、无缝兼容；**D5** 敌人路径不动（修正前提：combatEngine 生产未接入，怪物是配置直取）。已解锁 04。**D3 修正**：levelMilestones 类型扩为 `Partial<BaseAttributes & PrimaryAttributes & SpecialAttributes>`（21 项全覆盖，仍不进管道、不作加成展示）；顺带修死配置（critRate/critDmg/maxMp 里程碑现未生效，HeroDetailModal 硬编码 50/0.05/1.50）。**D2 收尾修正**（用户反馈）：EquipmentStats 类型彻底删除，装备配置（baseStats/statPerEnhance）与全部输出统一 StatModifier[]——新增装备平值属性零代码改动。
- [加成展示层统一（决策）](issues/04-bonus-display-unification.md) — HITL grilling 全确认：**D1** `STAT_META`（21 StatKey → label/percentDisplay，critRate/critDmg/9 Special 按 ×100 显 %）+ `formatModifiers`（内部走 aggregateModifiers，同 stat flat/percent 合并为「攻击 +5、+10%」），formatBonus/COMBAT_BONUS_META/formatTalentEffect 删除；**D2** 加成文案（羁绊面板/天赋节点/装备套装神话 percent——补上不显示数值的现状缺陷）统一切 formatModifiers，装备属性行统一数据源（消 renderStatRow 手写重复）、单件装备行仅类型适配；**D3** 不做交叉来源分解，source 字段不加（维持 01），留作未来可选项。

## Not yet specified

- **buff 功能实际接入**（02 毕业）：当前 `buffSystem` 零生产引用、无 buff 生产方；本 effort 只把 `applyBuffsToStats` 语义并进管道，游戏中实际产生/结算 buff 属未来功能。
- **数值重标定**：本 effort 不改加成数值，仅 03 D3 修正中 critRate 里程碑修复带来的面板预期变化；若模型落地后需整体重标定，属未来独立 effort。

## 🏁 地图完成

统一属性加成修饰符模型（stat-bonus-unification）全部 5 张 tickets 已解决，决策集完整（01 模型 / 02 管道 / 03 来源迁移 / 04 展示层 / 05 审计），way 到 destination 已清晰，可交给 to-tickets 生成实施蓝图。

**Destination 达成**：单一修饰符模型（`StatModifier[]`、21 StatKey、percent 加算 / clamp 最终级）；聚合与面板计算收敛到 statSystem（`calculateEntityStats` 收 modifiers + 导出 `aggregateModifiers`）；四来源数据层直接改修饰符形状（`CombatBonus` 退役）；展示层统一（`STAT_META` + `formatModifiers`）；levelMilestones 三层全覆盖；buff 并入同一管道（`applyBuffsToStats` 退役）；术语建立（修饰符等）待 CONTEXT.md 更新收尾。

**迁移实施要点（to-tickets 输入）**：

1. `statSystem.ts`：新增 `StatKey`（21 项）/ `StatModifier` / `aggregateModifiers`；`calculateEntityStats` 增加 `modifiers?: StatModifier[]` 参数（内部聚合 + primary 折算 + 一次 clamp）。
2. 数据层四来源改 `StatModifier[]`：`bonds.ts`（BONDS.bonus）、`talents.ts`（node.effect）、`awakening.ts`（STAR_STATS_PER_STAR/passive）、`equipment.ts`（tierEffects/mythicAffix + `getEquippedFlatStats` 输出 flat 修饰符）；`CombatBonus` / `COMBAT_BONUS_META` 删除。
3. 聚合收敛：bonds/equipment/talents/awakening 各自手写 if 链删除，来源只负责「产出修饰符」，聚合归 `aggregateModifiers`。
4. `combat.ts`：`heroToCombatant` 改「收集修饰符 → 面板快照 → 战斗单位」（hp 按 hero.hp/hero.maxHp 比例缩放）；`CombatBonus` 参数退役；5 处调用点适配。
5. `buffSystem.ts`：`applyBuffsToStats` 退役（debuff 意志减免并入聚合步骤），`tickBuffs` 保留。
6. `heroGrowth.ts` / `heroes.ts`：`levelMilestones` 扩为三层 Partial，`getLevelMilestoneBonus` 返回三层；`HeroDetailModal` 三层并入（修 critRate/critDmg/maxMp 死配置，现有 2 处 critRate 里程碑将生效）。
7. 展示层：新增 `STAT_META` + `formatModifiers`；羁绊面板（HeroTab/WildernessTab）/ 天赋节点（HeroTalentPanel）/ 装备弹窗切到 `formatModifiers`（补套装 percent 展示）；`EquipmentDetailModal.renderStatRow` 消重。
8. 测试：bonds/equipment/talents/awakening/combat/statSystem/combatEngine/buffSystem 各测试按新语义改写 + 新增 `aggregateModifiers`/`formatModifiers`/管道测试。
9. 旧存档：格式不变、无缝兼容。
10. 不动：敌人路径（配置直取）、战斗伤害公式（scope 外）、数值重标定（除 critRate 里程碑修复的预期变化）。
- **修饰符来源明细的呈现深度**：UI 是否需要「某属性由哪些来源贡献」的分解（依赖 01 是否带 source 字段、04 展示层）。
- **数值重标定**：模型语义变化（如 percent 叠加顺序、clamp 时机）是否要求现有加成数值重标定（用户未排除数值平衡，但具体数值属数据层活）。
- **敌人/怪物路径**：怪物已走 `calculateEntityStats`（15c），是否需要修饰符来源（大概率不需要，03 迁移面复核）。

## Out of scope

- **战斗伤害公式本身**（`calculateDamage` 的元素加成 / 暴击 / 减伤 / 豁免逻辑）——用户明确排除。
