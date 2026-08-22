# 02 — 体力系统解耦与标准服务化 API

Type: grilling
Status: resolved
Blocked by: none

## Question

如何将体力的自然恢复、消耗校验与外部修改从各处业务散落的代码中解耦，形成独立的体力模块与统一 API？

具体需要决策：
1. 体力模块的独立位置（如 `src/state/stamina.ts`）与数据模型契约（当前值、上限、恢复配置 `staminaRegenSeconds`）。
2. 纯函数 API 定义：
   - 查询/恢复：根据时间流逝纯函数计算恢复后的体力值（上限 clamp）。
   - 扣除：`tryConsumeStamina(state, amount)` 验证并扣除，返回成功与否及新状态。
   - 增加：`gainStamina(state, amount)` 道具/奖励加体力的边界规则（是否允许溢出上限）。
3. 在线 Tick（`src/state/tick.ts`）与离线结算（`src/state/offline.ts`）如何统一接入该体力内核，消除散落各处的 `recoverStamina` 与手动加减。

## Answer

1. **独立体力模块定位与数据契约**：
   - 提炼 `src/state/stamina.ts` 为体力系统的唯一数据与逻辑管理模块。
   - `GameState` 保留 `stamina: number`（内部维持浮点精度避免 1 秒级时间片截断损失）与 `maxStamina: number`（默认 `COMBAT_CONFIG.maxStamina`）。
   - 业务模块禁止直接修改 `state.stamina`，统一经由 `stamina.ts` 纯函数接口操作。
2. **标准服务化纯函数 API**：
   - `getStamina(state: GameState): number`：返回当前可用整型体力（`Math.floor(state.stamina || 0)`）。
   - `getMaxStamina(state: GameState): number`：返回当前体力上限。
   - `recoverStaminaByTime(state: GameState, elapsedSeconds: number): { state: GameState; recoveredInt: number }`：按时间自然恢复，封顶 `maxStamina`，返回更新后的 state 与本次跨整点恢复的整数点数 `recoveredInt`。
   - `tryConsumeStamina(state: GameState, cost: number): { ok: boolean; state: GameState }`：扣除体力；不足返回 `{ ok: false, state }`，充足则扣除并返回 `{ ok: true, state: nextState }`。
   - `grantStamina(state: GameState, amount: number, allowOverflow = false): GameState`：道具/奖励增补体力，支持可选溢出上限。
3. **全链路统一收敛**：
   - `src/state/tick.ts`、`src/state/offline.ts`、`src/state/levelCombat.ts` 以及探索遭遇战斗全面改用上述 API。
   - 删除 `combat.ts` 中的散装 `recoverStamina` 与业务散落的手动算术。
