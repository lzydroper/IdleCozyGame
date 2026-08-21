# 01 — 修饰符核心类型与计算管道（Expand）

**What to build:** 属性加成统一模型的基石落地：statSystem 新增三层输入全集 21 项的 `StatKey` 枚举、`StatModifier`（`{stat, kind: 'flat'|'percent', value}`）与 `aggregateModifiers` 聚合函数；`calculateEntityStats` 增加可选修饰符数组参数（内部聚合 + 元属性按系数折算 + 最终级 clamp）；新增 `STAT_META`（StatKey → label/percentDisplay）与 `formatModifiers` 文案函数（同属性 flat/percent 合并为「攻击 +5、+10%」）；提供 `CombatBonus → StatModifier[]` 的兼容转换。**纯新增，旧路径（CombatBonus/手写 if 链/手工 factor）零破坏、行为不变。**

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `StatKey`（Base 6 + Primary 6 + Special 9，共 21 项）与 `StatModifier` 类型落地；派生属性（critResist/damageReduction 等）不在 `StatKey` 内、不可直接修饰。
- [ ] `aggregateModifiers`：同属性 flat/percent 分别求和；percent 加算语义；元属性修饰符（含 percent 型按 (1+Σpercent) 放大）按系数折算为基础属性 flat。
- [ ] `calculateEntityStats` 收可选修饰符数组：`final = (base + Σflat) × (1 + Σpercent)`，clamp 在最终级（critRate ∈ [0,1]、critDmg ≥ 1、maxHp ≥ 1、其余 ≥ 0）；现有无修饰符调用结果不变。
- [ ] `STAT_META` + `formatModifiers`：critRate/critDmg/9 个 Special 按 ×100 显示 %，其余显示原值；正数加 +、负数显示 -。
- [ ] `CombatBonus → StatModifier[]` 兼容转换（供未迁移来源临时使用，Contract 时删除）。
- [ ] 管道纯函数测试（测试 seam 1）：任意来源组合（羁绊+装备+天赋+觉醒+buff 混合）的 percent 加算、flat/percent 叠加顺序、clamp 边界、元属性折算、debuff 意志减免；`formatModifiers` 文案格式测试。
