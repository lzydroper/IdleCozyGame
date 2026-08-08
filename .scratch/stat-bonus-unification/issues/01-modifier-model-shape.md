# 01 — 修饰符数据模型形态（原型）

**Type:** prototype
**Status:** resolved
**Blocked by:** None

## Question

统一修饰符采用什么数据形状？候选：

- **A)** `StatModifier[]`（`{ stat, kind: 'flat'|'percent', value }`，buffSystem 现有形态推广到所有来源）；
- **B)** `Partial<Record<StatKey, { flat?: number; percent?: number }>>`（按属性聚合的对象形态）；
- **C)** 带来源/顺序的修饰符列表（`{ source, stat, kind, value }`，为 UI 来源分解留口）。

子问题：

1. **StatKey 枚举覆盖范围**：仅 Base 6 属性（attack/defense/maxHp/maxMp/critRate/critDmg）？还是含 Primary（strength 等 6 项）与 Special（arcaneBoost 等 9 项）与 Derived（critResist/damageReduction/cooldownReduction 等）？
2. **percent 语义**：多来源加算还是乘算？与 flat 的叠加顺序是否统一为 `(base + flat) * (1 + percent)`？clamp（`BUFF_LIMIT_CONFIG` 的暴击率/暴击倍率上下限）在来源级还是最终级？
3. **source 字段**：修饰符是否携带来源标识/顺序（UI 来源明细、将来优先级系统是否需要）？
4. **`CombatBonus` 退役的形态约束**：`formatBonus`/`COMBAT_BONUS_META` 的替代文案函数需要什么形状约束（具体文案设计在 04 细化）。

产出：2-3 个候选类型签名 + 真实场景示例（羁绊+装备+天赋+觉醒+buff 混合叠加于同一英雄），由用户拍板一个。原型按 prototype skill 归档到 `.scratch/stat-bonus-unification/prototype-archive/`。

## Answer

（HITL：用户在交互式原型 `prototype-archive/01-modifier-model-shape.html` 上拍板）

- **D1 形态 = 候选 A `StatModifier[]`**：`{ stat: StatKey; kind: 'flat' | 'percent'; value: number }`。与 buffSystem 现有 `StatModifier` 完全同构，buff 可直接并入同一数组。**source 字段暂不加**——04 需要来源分解时以可选字段 `source?: string` 追加（成本极低），不预设来源枚举。
- **D2 StatKey = 三层输入全集（21 项）**：Base 6（attack/defense/maxHp/maxMp/critRate/critDmg）+ Primary 6（strength/constitution/agility/intelligence/willpower/transcendence）+ Special 9（arcaneBoost/arcaneResistance/mechanicalLoad/mechanicalEvolution/nightmareErosion/voidSpirit/spiritInspire/astralGuidance/soulsealDrive）。与 `CalculateStatsParams` 输入结构对齐；**派生属性（critResist/damageReduction/durationReduction/effectReduction/cooldownReduction）不可直接修饰**，由计算产生。
- **D3 percent 语义**：多来源**加算**；叠加顺序 `final = (base + Σflat) × (1 + Σpercent)`（flat 先加、percent 后乘）；**clamp 在最终级**（critRate ∈ [0,1]、critDmg ≥ 1、maxHp ≥ 1、其余 ≥ 0，沿用 BUFF_LIMIT_CONFIG）。元属性修饰符按 statConfig 系数先折算为基础属性 flat，再参与叠加（02 细化管道）。
- **D4 formatBonus 约束（供 04）**：替代函数消费 `StatModifier[]`（内部可先聚合再渲染），文案需同时呈现 flat 与 percent（如「攻击 +5、+10%」）；`COMBAT_BONUS_META` 以 StatKey 为 key 重建。
- 原型归档于 `prototype-archive/`（含 README 说明运行方式），三候选签名与交互演示保留作决策依据。
