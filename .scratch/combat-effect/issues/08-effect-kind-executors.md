# 08 — 基础效果种类 executor 清单与落地点（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 04, 05, 07

## Question

首批 10 个 EffectKind 的 executor 各自如何落地到 BattleContext / TurnRuntime？

候选：

- **A)** 每 kind 固定一个 executor：damage→伤害公式；heal→applyHeal；statModify→add/remove Modifier；stun→applyBuff(stun)；dispel→removeBuff；immunity/taunt→setFlag/getFlag；summon→summonUnit×count；applyBuff→ctx.applyBuff（推荐）。
- **B)** 只实现 damage/heal/applyBuff，其余后续补。
- **C)** executor 可注册覆盖，内置只做默认。

子问题：

1. damage executor 是否迁移 `combatEngine.calculateDamage`（`DEF/(100+DEF)` + 元素 + 暴击 + 虚无豁免），并删除 `combat.ts` 的 `dealDamage = max(1, atk-def)`？
2. `BattleUnitStats` 是否需要收敛为完整面板（含特殊/派生属性），供 damage executor 读元素/虚无？
3. statModify 是否只调 `ctx.addModifier/removeModifier`，duration 归 Buff 包装、Effect 不管理时间？
4. stun 是否落地为 applyBuff(stun Buff)，canAct 由 Buff 模块汇总？
5. dispel 是否按 `params.buffKind` 调 `ctx.removeBuff`？
6. immunityElement / immunityBuff / taunt 是否用 BattleFlag（setFlag/getFlag）落地，持续时间由 Buff 包装？
7. summon 是否作为唯一多目标例外：单 EffectInstance 按 `params.count` 创建 count 个单位（其余效果保持单目标单实例）？

产出：10 个 executor 的落地映射表，作为 effectSystem 实现与测试的输入。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 damage**：迁移 `combatEngine.calculateDamage`（`DEF/(100+DEF)` + 元素 + 暴击 + 虚无豁免）为 damage executor；删除 `combat.ts` 的 `dealDamage = max(1, atk-def)`。
- **D2 面板**：`BattleUnitStats` 收敛为完整面板（含特殊/派生属性），由快照传入；damage executor 直接读，不再动态查询。
- **D3 statModify**：Effect 只调 `ctx.addModifier/removeModifier`；duration 归 Buff 包装，Effect 不管理时间。
- **D4 stun**：落地为 `applyBuff(stun Buff)`；canAct 由 Buff 模块汇总，Effect 不直接改单位状态。
- **D5 dispel**：按 `params.buffKind` 调 `ctx.removeBuff`。
- **D6 immunity/taunt**：用 `BattleFlag`（`setFlag/getFlag`）落地；持续时间由 Buff 包装，Effect 自身不管理时间。
- **D7 summon**：唯一多目标例外——单 EffectInstance 按 `params.count` 创建 count 个单位，`targetId` 记首个/主单位；其余效果保持单目标单实例。

## 落地映射速览

| EffectKind | executor 落地点 |
|---|---|
| damage | 迁移后的 damage 公式 → `ctx.turn.dealDamage` |
| heal | `ctx.turn.applyHeal` |
| statModify | `ctx.addModifier` / `ctx.removeModifier` |
| stun | `ctx.applyBuff(stun Buff)` |
| dispel | `ctx.removeBuff(targetId, buffKind)` |
| immunityElement | `ctx.setFlag`（元素免疫标记） |
| immunityBuff | `ctx.setFlag`（Buff 免疫标记） |
| taunt | `ctx.setFlag`（嘲讽优先级标记） |
| summon | `ctx.turn.summonUnit × count` |
| applyBuff | `ctx.applyBuff` |
