# 07 — applyBuff 链与递归防环契约（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 03

## Question

`applyBuff` 是链条 `Ability → Effect(applyBuff) → Buff → Effect` 的枢纽。Effect 侧的 applyBuff executor 与 chainKey guard 如何定契约？

候选：

- **A)** `applyBuff` executor 调用 `ctx.applyBuff(targetId, buffInstance)`；不立即结算 buff 触发效果，触发由 Buff 模块注册到时机后发生；`chainKey` 缺省 `origin.id:effectId:sourceId->targetId`（推荐）。
- **B)** `applyBuff` 立即结算 buff 的首个触发效果。
- **C)** `applyBuff` 不进入 EffectKind，Buff 直接处理。

子问题：

1. `chainKey` 是必填还是可选；缺省生成规则是什么？
2. 反伤/触发类效果如何设置独立 chainKey，保证不进入伤害递归？
3. `ctx.applyBuff` 返回什么（buff 实例 / 是否刷新 / 是否堆叠），applyBuff effect 的 `EffectResult.values` 如何填？
4. Buff 实例由谁创建：Ability 在派发 applyBuff 前创建，还是 applyBuff executor 内创建？

产出：applyBuff executor 与 chainKey guard 的契约，供 Buff 模块对接。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 applyBuff executor**：调用 `ctx.applyBuff(targetId, buffInstance)`，**不立即结算** buff 触发效果；触发由 Buff 模块在时机订阅后发生。
- **D2 chainKey**：可选；缺省生成 `origin.id:effectId:sourceId->targetId`。反伤/触发类效果设置独立 `chainKey`（或独立 effectId），保证不进入伤害递归。
- **D3 ctx.applyBuff 返回**：`{ instance, refreshed, stacks }`；applyBuff effect 的 `EffectResult.values` 填 `{ stacks }`（其余信息由 Buff 模块负责展示）。
- **D4 Buff 实例创建**：由 Ability/Buff 在派发 applyBuff **之前**创建；Effect 只落地，不创建。
