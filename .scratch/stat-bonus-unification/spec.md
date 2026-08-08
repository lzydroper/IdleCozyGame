# 统一属性加成修饰符模型规范（stat-bonus-unification）

Status: ready-for-agent

> 本规范由 wayfinder 地图（`.scratch/stat-bonus-unification/map.md`）的 5 个决策 ticket 汇编而成，各章节标注决议来源，可回溯详情。**交付形态为规范，实施为独立 effort（to-tickets）。**

## Problem Statement

属性加成体系存在四套并存的表达，位置混乱且难以扩展（玩家与开发者均受影响）：

1. **四套属性表达并存**：`CombatBonus`（仅攻击/防御/生命 3 个百分比字段，被羁绊、装备、天赋、觉醒四个来源共用，且每个来源各自手写一份聚合 if 链）、`EquipmentStats`（装备平值）、`ModifiableStat`/`StatModifier`（buff 系统专用）、`calculateEntityStats`（三层属性引擎）——互不通用。
2. **CombatBonus 写死百分比加算**：无数值（flat）加算，选项只覆盖 3 个基础属性，不能对魔力、暴击、元属性、特殊属性做任何改动——扩展一个新加成目标就要改多处 if 链与映射表。
3. **statSystem 三层引擎写了但没真正用上**：战斗路径（英雄 → 战斗单位）手工拼 attackFactor/defenseFactor/hpFactor，绕过 `calculateEntityStats`——**面板与战斗数值口径不一致**（面板含元属性换算但不含来源加成，战斗反之），且战斗不含暴击/元属性/减伤。
4. **孤儿系统**：buff 状态机与战斗引擎（含统一减伤公式）零生产引用，仅测试存活；其计算语义与战斗路径互相冲突。
5. **升级里程碑死配置**：`levelMilestones` 配置的暴击率/暴击倍率/魔力加成从未生效（详情面板硬编码默认值），现有配置里已有 2 处暴击率里程碑写了但无效果。
6. **展示层缺陷**：装备套装/神话百分比加成在 UI 不显示数值；装备属性行存在手写重复公式；加成文案由 3 字段硬编码映射表驱动。

## Solution

将全部加成统一为**单一修饰符模型**，收敛到 statSystem 唯一计算路径：

1. **统一表达**：所有加成来源（羁绊、装备、天赋、觉醒、buff）统一产出 `StatModifier[]`（`{ stat, kind: 'flat'|'percent', value }`），`CombatBonus`/`EquipmentStats` 类型退役。
2. **统一计算**：`calculateEntityStats` 接收修饰符数组，内部先聚合（percent 加算、flat 先加 percent 后乘、元属性按系数折算、最终级 clamp），战斗、展示、buff 消费同一计算结果。
3. **统一展示**：`formatModifiers` 生成加成文案（同属性 flat/percent 合并），补齐装备套装/神话百分比展示，消除手写重复公式。
4. **升级里程碑三层全覆盖**：`levelMilestones` 可配置元属性/基础/特殊全部 21 项属性，修掉暴击率/魔力死配置。
5. **buff 并入同一管道**：临时 buff 与常驻加成同为修饰符，`applyBuffsToStats` 退役、其 debuff 意志减免逻辑并入聚合步骤。
6. **战斗单位改造**：`heroToCombatant` 改为「收集修饰符 → 面板快照 → 战斗单位」（当前血量按比例缩放）。

## User Stories

1. 作为玩家，我想让羁绊/装备/天赋/觉醒的加成在战斗中与英雄详情面板显示一致，以便准确评估英雄强度、不被两套数值误导。
2. 作为玩家，我想在装备界面看到套装特效与神话装备的百分比加成数值，以便知道穿上这套装备实际提升了多少。
3. 作为玩家，我想让英雄详情面板的暴击率/暴击倍率/魔力显示真实的里程碑加成，以便升级成长符合我看到的配置。
4. 作为玩家，我想让升级里程碑也能提升力量/体质/智慧等元属性，以便英雄差异化不限于攻击/防御/生命三项。
5. 作为玩家，我想让升级里程碑也能提升奥术增幅/虚无灵体等特殊属性，以便阵营特色随等级成长。
6. 作为玩家，我想让所有界面（羁绊面板、天赋树、装备弹窗）的加成文案格式统一（如「攻击 +5、+10%」），以便跨界面阅读一致、不困惑。
7. 作为玩家，我想让一个来源同时提供数值与百分比加成（如装备既加 +15 攻击又加 +8% 生命），以便数值设计更丰富。
8. 作为玩家，我想让战斗入场时当前血量按已损比例缩放（生命上限提高时保持已损比例），以便战斗中体验不被加成改变。
9. 作为开发者，我想让所有加成来源统一输出 `StatModifier[]`，以便新增属性只需扩展一个 `StatKey` 枚举与一张元数据表。
10. 作为开发者，我想让聚合逻辑收敛到 `aggregateModifiers` 一处，以便消除四个来源各自手写的加法 if 链。
11. 作为开发者，我想让 `calculateEntityStats` 直接接收修饰符数组，以便面板/战斗/展示共享同一计算管道、不再维护两套口径。
12. 作为开发者，我想让 buff 与常驻加成共用同一修饰符管道，以便不再维护两套加算语义（并修掉元属性 buff 不生效的缺陷）。
13. 作为开发者，我想让 `CombatBonus`/`EquipmentStats` 类型真正删除，以便不留双形态、不新增转换层。
14. 作为开发者，我想让百分比的叠加语义明确为「多来源加算、clamp 在最终级」，以便数值可预期、可测试。
15. 作为开发者，我想让元属性修饰符（如力量 +5）自动按系数折算为基础属性，以便加成目标与英雄自带元属性走同一映射。
16. 作为开发者，我想让旧存档（英雄天赋投入、装备实例等字段结构）完全不变，以便改造不破坏已有玩家进度。
17. 作为开发者，我想让加成文案函数消费聚合后的修饰符，以便展示层与计算层共享同一聚合结果、不重复实现。
18. 作为开发者，我想让 `formatModifiers` 正确处理百分比型属性（暴击率/特殊属性按 ×100 显示 %），以便展示单位正确。
19. 作为开发者，我想让装备属性行（基础/每级强化/穿戴实例）统一数据源，以便消除手写重复公式。
20. 作为开发者，我想让测试集中在「聚合+计算管道」与「战斗单位转换」两个 seam，以便一套测试覆盖任意来源组合的数值正确性。

## Implementation Decisions

（各决策详情与讨论见对应 ticket，以下为结论摘要。）

### 1. 修饰符数据模型（来源：修饰符数据模型形态原型）

- 统一形态为 `StatModifier[]`，与 buff 系统现有 `StatModifier` 完全同构，buff 可直接并入同一数组。`source` 字段暂不加，未来需要交叉来源分解时以可选字段追加。原型产出的核心类型形状（原型 `prototype-archive/01-modifier-model-shape.html`）：

```ts
type StatKey = 'attack' | 'defense' | 'maxHp' | 'maxMp' | 'critRate' | 'critDmg'        // Base 6
            | 'strength' | 'constitution' | 'agility' | 'intelligence'                  // Primary 6
            | 'willpower' | 'transcendence'
            | 'arcaneBoost' | 'arcaneResistance' | 'mechanicalLoad' | 'mechanicalEvolution'
            | 'nightmareErosion' | 'voidSpirit' | 'spiritInspire'                       // Special 9
            | 'astralGuidance' | 'soulsealDrive';
interface StatModifier {
  stat: StatKey;                 // 三层输入属性之一（元/基础/特殊），派生属性不可直接修饰
  kind: 'flat' | 'percent';      // flat 绝对值；percent 小数（0.10 = +10%）
  value: number;
}
```

- **percent 语义**：多来源加算；叠加顺序 `final = (base + Σflat) × (1 + Σpercent)`；clamp 在最终级（critRate ∈ [0,1]、critDmg ≥ 1、maxHp ≥ 1、其余 ≥ 0，沿用 BUFF_LIMIT_CONFIG）。
- **StatKey 覆盖**：三层输入全集 21 项；派生属性（critResist/damageReduction/durationReduction/effectReduction/cooldownReduction）不可直接修饰，由计算产生。

### 2. 聚合与计算管道（来源：修饰符聚合与面板计算管道决策）

- `calculateEntityStats(params, modifiers?: StatModifier[])`：签名直接收修饰符数组，内部先聚合再计算；导出 `aggregateModifiers(mods): ModifierMap`（每 stat 的 {flat, percent} 总和，含元属性折算）供展示层与测试复用。现有调用点不受破坏。
- **元属性修饰符**：flat 按 statConfig 系数折算成对应基础属性 flat（strength +5 → attack +10、critDmg +0.025），与基础属性修饰符合并；percent 型按 (1+Σpercent) 放大折算值。全管道一次 clamp。
- **buff 关系**：同一管道。buff 修饰符与常驻修饰符汇总后一次计算；debuff 的意志减免（effectReduction）作为聚合阶段的数值调整保留；`applyBuffsToStats` 退役、`tickBuffs`（回合递减）保留。
- **maxHp 语义**：百分比加生命的「当前血量按同比例缩放」= 战斗入场快照职责，statSystem 纯函数只出面板、不接收当前血量。

### 3. 来源迁移（来源：加成来源迁移边界决策）

- **数据层直接改修饰符形状**：羁绊、天赋（每级效果）、觉醒（星级/被动）、装备（套装特效/神话词条）四处配置全部改为 `StatModifier[]`，`CombatBonus` 类型删除，无转换层。机械映射：`attackPercent: 10 → [{ stat: 'attack', kind: 'percent', value: 0.10 }]`（percent 统一转小数）；天赋聚合的 ×等级逻辑保留。
- **装备平值并入（D2 收尾：EquipmentStats 彻底删除）**：装备平值（含每级强化、神话 ×1.5、阵营 ×1.3 折算）输出 flat 型修饰符，与套装百分比合并为装备来源的完整修饰符数组；装备配置（baseStats/statPerEnhance）与全部输出统一为 `StatModifier[]`，**新增装备可加属性只需在配置追加一行修饰符，零代码改动**（无类型/遍历代码需要同步）。
- **升级里程碑三层全覆盖**：`levelMilestones` 类型扩展为 `Partial<BaseAttributes & PrimaryAttributes & SpecialAttributes>`（21 项），仍作为三层输入直接叠加、不进修饰符管道、不作为加成展示（升级成长是永久基础而非可触发加成）。顺带修复现状死配置：暴击率/暴击倍率/魔力里程碑未生效（详情面板硬编码默认值），扩展后须接通；现有配置中 2 处暴击率里程碑将真正生效（面板数值变化属预期修复）。primary 里程碑经 `calculateEntityStats` 自动折算。
- **旧存档**：格式不变、无缝兼容（全部为配置层/计算层改动，存档字段结构不动）。

### 4. 战斗单位改造（来源：修饰符聚合与面板计算管道决策）

- `heroToCombatant` 改为「面板快照 + 战斗单位转换」：内部收集该英雄全部修饰符（羁绊/装备/天赋/觉醒）→ `calculateEntityStats` 出 `CalculatedEntityStats` → 转战斗单位（hp 按 hero.hp/hero.maxHp 比例缩放，attack/defense/maxHp 取自面板）；`CombatBonus` 参数退役，5 处调用点适配。

### 5. 展示层统一（来源：加成展示层统一决策）

- 新增 `STAT_META: Record<StatKey, { label; percentDisplay?: boolean }>`（21 项；critRate/critDmg/9 个特殊属性 `percentDisplay: true`，值按 ×100 显示 %；其余显示原值）与 `formatModifiers(mods: StatModifier[]): string`（内部走 `aggregateModifiers`，同属性 flat 与 percent 合并为一条「攻击 +5、+10%」，正数加 +、负数显示 -）。
- 加成文案消费点（羁绊面板、天赋节点、装备弹窗）统一切 `formatModifiers`；补齐装备套装/神话百分比不显示数值的现状缺陷；装备属性行统一数据源、消除手写重复公式；单件装备属性行保留数值行形态、仅类型适配。
- **不做交叉来源分解**：各来源 UI 按来源分组展示自身贡献，面板显示最终值；`source` 字段不加，交叉来源分解留作未来可选项。

## Testing Decisions

- **什么构成好测试**：只测外部行为（输入修饰符组合 → 输出面板/战斗单位数值），不测实现细节（如聚合内部循环、clamp 的具体写法）。数值断言优先用明确的输入/输出对，覆盖边界（clamp 上下限、percent 加算、flat 与 percent 共存、元属性折算、debuff 意志减免）。
- **测试 seam（双 seam，用户已确认）**：
  - **Seam 1（主）**：statSystem 管道纯函数 —— `aggregateModifiers` + `calculateEntityStats(params, modifiers)`。一条测试覆盖任意来源组合（羁绊+装备+天赋+觉醒+buff 混合）的数值正确性：percent 加算、flat 先加 percent 后乘、最终级 clamp、元属性折算。这是唯一汇聚点，来源组合的数值断言集中于此。
  - **Seam 2**：`heroToCombatant` 端到端 —— 面板快照 → 战斗单位（当前血量按比例缩放、attack/defense/maxHp 取自面板、加成不泄漏到战斗结算写回）。
- **受测模块**：
  - `statSystem` 管道（主 seam，扩展现有 `statSystem.test.ts`）；
  - `heroToCombatant`（端到端，扩展现有 `combat.test.ts`）；
  - 来源产出薄测试（羁绊/天赋/觉醒/装备配置 → 正确 `StatModifier[]`，各自扩展现有测试文件）；
  - `formatModifiers`/`STAT_META` 文案薄测试（格式、百分比型属性单位）；
  - 展示层组件测试维持现有模式（`GameProvider` + `ToastProvider` 包裹，验证文案渲染）。
- **Prior art**：现有 `statSystem.test.ts`（`calculateEntityStats` 多组断言）、`combat.test.ts`（`heroToCombatant` 端到端含满星觉醒）、`bonds.test.ts`（聚合 + 战斗真实链路）即本规范的测试范式；迁移时按新语义改写各来源测试并新增管道测试。

## Out of Scope

- **战斗伤害公式本身**（元素加成/暴击/减伤/豁免逻辑）——用户明确排除，现状 `max(1, atk - def)` 与统一减伤公式的冲突仅记录不处理。
- **敌人/怪物路径**——`combatEngine` 生产未接入，怪物为配置直取，维持原状。
- **buff 功能实际接入**——当前无 buff 生产方，本 effort 只把 `applyBuffsToStats` 语义并进管道；游戏中实际产生/结算 buff 属未来功能。
- **数值平衡重标定**——不改加成数值，仅暴击率里程碑修复带来的面板预期变化；整体重标定属未来独立 effort。
- **交叉来源分解 UI**（「攻击 +15% = 羁绊 10% + 天赋 5%」）——留作未来可选项。
- **新增内容**（新羁绊/装备/天赋/英雄）——本 effort 只重构既有体系。

## Further Notes

- **领域术语**：CONTEXT.md 属性系统段落已新增「修饰符 (Modifier)」与「加成来源 (Bonus Source)」术语；后续实施与新增内容须遵循。
- **原型归档**：`prototype-archive/01-modifier-model-shape.html`（三候选签名 + 交互演示）保留作决策依据，浏览器双击可玩。
- **测试 seam 确认**：双 seam 方案（管道纯函数 + heroToCombatant 端到端）已经用户确认。
- **实施入口**：map.md「🏁 地图完成」段的 10 条迁移实施要点为本规范的落地清单，供 to-tickets 拆分实施 ticket 时引用。
