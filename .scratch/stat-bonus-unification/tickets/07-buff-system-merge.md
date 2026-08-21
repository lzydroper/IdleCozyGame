# 07 — buff 并入同一管道

**What to build:** 临时 buff 与常驻加成共用同一修饰符管道：`applyBuffsToStats` 退役，其 debuff 意志减免逻辑并入聚合步骤；buff 修饰符与常驻修饰符汇总后一次计算；回合递减逻辑（tickBuffs）保留。

**Blocked by:** 01 — 修饰符核心类型与计算管道（Expand）

**Status:** ready-for-agent

- [ ] debuff 意志减免（effectReduction）作为聚合阶段的数值调整并入（上限沿用 0.80/0.00）。
- [ ] `applyBuffsToStats` 退役、语义并入管道；元属性 buff 修饰符经折算生效（修掉现状「元属性累积不生效」缺陷）。
- [ ] `tickBuffs` 回合递减保留。
- [ ] 聚合/减免测试：buff 与常驻混合叠加、debuff 减免、元属性 buff 生效。
