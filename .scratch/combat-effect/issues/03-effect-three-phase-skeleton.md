# 03 — Effect 三阶段骨架与 resolveEffect 接口（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 01, 02

## Question

Effect 是具体行为的最小执行单位，不保存时机，由 Ability/Buff 创建后落地执行。三阶段为：作用前（拦截 / `effect.*` 修正）、作用中（目标自行计算实际影响）、作用后（完成回调）。在 BattleContext 与统一 Modifier 之上，Effect 模块的外部 seam 与管线骨架如何定？

候选：

- **A)** 单一 seam `resolveEffect(ctx: BattleContext, effect: EffectInstance): EffectResult`；内部按固定 `EffectKind` discriminated union 分派 executor（推荐）。
- **B)** Effect 暴露 `registerEffectKind` 注册表，调用方自定义 executor。
- **C)** 不设统一 seam，每种效果各自独立函数（`applyDamageEffect` / `applyHealEffect` ...）。

子问题：

1. `EffectInstance` 字段：`id` / `effectId` / `sourceId` / `targetId` / `params` / `origin`（`{ kind: 'ability' | 'buff', id }`）是否够？召唤等无目标效果 `targetId` 是否允许 `null`？
2. `EffectResult` 字段：`applied` / `interrupted` / `values` / `targetDied` 是否够？`events` 是返回还是由 `ctx.turn` 直接写入事件流？
3. `before` 阶段：如何查询 `effect.*` Modifier（`ctx.getModifiers(targetId, 'effect')`）；审核（抵抗/无效化）由 Effect 模块内置还是注入 `audit` 谓词？
4. `during` 阶段：伤害/治疗是否复用 `ctx.turn.dealDamage/applyHeal`（它们已派发 `damageTaken` / `healingTaken` / `death`），还是 Effect 直接改 hp 后自己派事件？
5. `after` 阶段：完成回调统一为 `ctx.turn.dispatchEvent('effectApplied', payload)` 订阅，还是给 Effect 另挂 callback 列表？
6. 递归防环：`origin` + 可选 `chainKey` 的 guard 放在 `resolveEffect` 入口还是 executor 内？反伤效果如何标记为不进入伤害递归？
7. 基础 `EffectKind` 联合：`damage` / `heal` / `statModify` / `stun` / `dispel` / `immunityElement` / `immunityBuff` / `taunt` / `summon` / `applyBuff` 是否为首批固定集合？

产出：`src/state/effectSystem.ts` 的类型与 `resolveEffect` 骨架（三阶段伪代码 + executor 表 + 测试 seam），作为后续效果种类实现的入口。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 EffectInstance**：`{ id, effectId, sourceId, targetId, params, origin, chainKey? }`；`targetId: string` **必填**，多目标由 Ability/Buff 拆成多个 EffectInstance（单效果单目标）。
- **D2 EffectResult**：返回 `{ applied, interrupted?, values, targetDied? }`；事件由 `ctx.turn` 直接写入事件流，`resolveEffect` 不返回事件数组。
- **D3 before**：Effect 模块内置——先 `applyEffectModifiers(ctx, effect)` 查询并应用 `effect.*` Modifier，再按 EffectKind 读审核配置判定抵抗/无效化；不注入 Ability/Buff 谓词。
- **D4 during**：伤害/治疗复用 `ctx.turn.dealDamage/applyHeal`（已 clamp 并派发 `damageTaken` / `healingTaken` / `death`），Effect 只在其外包裹 before/after。
- **D5 after**：统一派发 `ctx.turn.dispatchEvent('effectApplied', payload)`；完成回调订阅该事件，不另建 callback 列表。
- **D6 递归防环**：guard 放在 `resolveEffect` 入口，按可选 `chainKey` 判活；反伤使用独立 `effectId`/不进入伤害递归，不复用伤害效果。
- **D7 首批 EffectKind**：固定 `damage | heal | statModify | stun | dispel | immunityElement | immunityBuff | taunt | summon | applyBuff`，不采用注册表扩展。
