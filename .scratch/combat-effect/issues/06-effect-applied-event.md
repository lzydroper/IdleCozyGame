# 06 — effectApplied 事件载荷与 presenter（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 03

## Question

完成回调统一走 `ctx.turn.dispatchEvent('effectApplied', payload)`。该事件的 payload 契约与展示 presenter 如何定？

候选：

- **A)** 仅成功效果派发 `effectApplied`，payload = `{ effectId, kind, sourceId, targetId, values, targetDied }`；presenter 在 battleEventPresentation 注册（推荐）。
- **B)** 成功与失败都派发 `effectApplied`，payload 带 `applied` 标记。
- **C)** 成功派 `effectApplied`，失败另派 `effectBlocked`。

子问题：

1. `interrupted` 效果是否需要事件（用于战斗信息展示「被抵抗/被免疫」）？
2. payload 是扁平 `{...values}` 还是嵌套 `{ kind, values }`？
3. presenter 是否按 `kind` 分派（`effect.damage` / `effect.heal` ...），还是统一模板 + fallback？
4. `effectApplied` 是否纳入 `BATTLE_EVENT_KEYS` 标准键，还是继续用 string 扩展键？

产出：`effectApplied` 事件契约 + presenter 注册约定，供 Effect 模块与 UI 事件消费端实现。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 派发条件**：仅成功效果派发 `effectApplied`；`interrupted` 效果不派发该事件，只由 `EffectResult.interrupted` 返回原因（后续若需展示再另立事件）。
- **D2 payload**：扁平 + 显式 kind：
  ```ts
  {
    effectId: string;
    kind: EffectKind;
    sourceId: string;
    targetId: string;
    values: Record<string, number>;
    targetDied: boolean;
  }
  ```
- **D3 标准键**：`effectApplied` 纳入 `BATTLE_EVENT_KEYS` 标准键（Turn.md 已列「效果生效」为细粒度事件）。
- **D4 presenter**：按 `kind` 分派 presenter，未注册 kind 走 fallback（沿用 battleEventPresentation 的注册表机制）。
