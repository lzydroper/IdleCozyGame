# 15b — Buff/Debuff 状态机与临时/持续增益驱动

**What to build:**
实现回合制 Buff/Debuff 状态机与多类型增益计算驱动。支持固定值加成、百分比增幅、持续回合递减与意志属性对负面效果持续回合及数值的减免计算。

**Blocked by:** 15a — 三层属性基础数据模型与元属性加成映射引擎.

**Status:** resolved

- [x] 实现 `applyBuffEffects` 增益叠加与衰减状态更新
- [x] 支持固定值 (Flat) 与百分比 (Percent) 增幅混合拆算
- [x] 结合意志 (Willpower) 元属性计算负面效果的回合数与数值减免
- [x] 编写 Buff 叠加与消逝的单元测试

