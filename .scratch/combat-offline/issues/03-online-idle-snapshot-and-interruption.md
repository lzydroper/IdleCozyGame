# 03 — 在线挂机连续战斗快照与中断状态机

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

如何规范在线挂机战斗的状态快照、连续战斗循环与各种中断条件（体力不足、小队重伤、主动停止）的处理契约？

具体需要决策：
1. 连续战斗快照契约：每场挂机战斗开始时扣除体力并创建全新参战实体快照（初始满血满蓝进入），确保每场战斗独立、不产生战后残留异常。
2. 异常与中断处理状态机：
   - 体力不足一场时：挂机保持开启，等待体力自然恢复达标后自动开启下一场（不自动停止）。
   - 小队全灭（战败）时：小队英雄进入重伤状态（Heavy Wound），挂机状态机自动停止并置空 `combat.idle`。
   - 主动停止时：调用 `stopLevelIdleUpdate`，返回本次挂机战斗累计统计摘要（胜/负/平/掉落等）。
3. 在线 Tick 中与体力解耦 API（ticket 02）的精确对接契约。

## Answer

1. **快照生成与连续战斗契约**：
   - 保持既有 `levelCombat.ts` 的快照机制：每场战斗开战前调用 `tryConsumeStamina` 扣除 `level.staminaCost`，克隆当前小队生成满血满蓝初始状态的战斗实体快照，每场战斗独立运行并实时入账掉落与累计数据。
2. **状态机中断处理规则**：
   - **体力不足**：在线 Tick 时，若 `getStamina(state) < level.staminaCost`，挂机状态保持激活（不自动停止），保留累计秒数；体力随时间恢复达到一场消耗后，下一次 Tick 自动开战。
   - **战败全灭**：小队全员标记为 `wounded = true`（重伤），挂机循环立即中断，`combat.idle` 自动重置为 `EMPTY_IDLE_STATE`（挂机自动停止），输出战败重伤日志；重伤未治愈前禁止再次开启。
   - **主动停止**：调用 `stopLevelIdleUpdate`，将 `combat.idle` 重置为 `EMPTY_IDLE_STATE`，并返回本次挂机时长、总场次、胜平负、掉落物与灵魂残响的 `summary` 统计摘要。
   - **防御性熔断**：若检测到队伍为空、关卡缺失或成员重伤，静默重置 `combat.idle` 为初始空状态。
3. **体力 API 对接**：
   - 开战与循环结算全量调用 `src/state/stamina.ts` 的 `getStamina` 与 `tryConsumeStamina`，消灭直接的 state 属性修改。
