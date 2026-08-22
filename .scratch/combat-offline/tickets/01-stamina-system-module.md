# 01 — 体力系统独立模块与标准 API 服务化

**What to build:** 创建独立的体力模块 `src/state/stamina.ts`，封装 `getStamina`、`getMaxStamina`、`recoverStaminaByTime`、`tryConsumeStamina`、`grantStamina` 纯函数服务。将 `tick.ts`、`offline.ts`、`levelCombat.ts` 及探索战斗遭遇中的体力读写与恢复计算统一收敛至该模块，删除 `combat.ts` 中的散装 `recoverStamina` 与散落算术。提供完整的单元测试覆盖。

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] 新增 `src/state/stamina.ts`，提供标准纯函数 API：`getStamina`（整型读取）、`getMaxStamina`、`recoverStaminaByTime`（按流逝秒数自然恢复并封顶上限）、`tryConsumeStamina`（不足返回 `ok: false`，充足扣除返回新 state）、`grantStamina`（道具增补，可选突破上限）。
- [x] `GameState` 中体力状态保留 `stamina: number`（浮点精度）与 `maxStamina: number`，外部业务逻辑严禁直接增减 `state.stamina`。
- [x] `src/state/tick.ts`（在线恢复）、`src/state/offline.ts`（离线恢复）、`src/state/levelCombat.ts`（主动/挂机开战扣体）全面收敛改用新体力 API。
- [x] 删除 `combat.ts` 中散落的 `recoverStamina` 旧函数与冗余算术。
- [x] 编写 `src/state/stamina.test.ts` 覆盖自然恢复、扣除成功/失败、溢出奖励等用例，测试全绿。
