# 03 — 在线挂机连续战斗与中断状态机收敛

**What to build:** 在 `levelCombat.ts` 与 `tick.ts` 中规范在线挂机连续战斗逻辑：每场开战扣除体力并创建全新满血满蓝战斗实体快照；完善中断状态机（体力不足保持挂机等待恢复、小队战败全员重伤自动停止置空、主动停止返回 summary 统计摘要），并扩充单测覆盖各种在线循环与中断分支。

**Blocked by:** 01 — 体力系统独立模块与标准 API 服务化

**Status:** ready-for-agent

- [ ] 保持每场战斗前调用 `tryConsumeStamina` 扣除体力，克隆当前小队生成满血满蓝初始状态实体快照，每场战斗独立模拟并实时入账掉落与累计数据。
- [ ] 在线 Tick 时若 `getStamina(state) < level.staminaCost`，挂机保持开启（不自动停止），保留累计秒数；体力自然恢复够一场后自动开战。
- [ ] 挂机遭遇战败（`battle.partyWiped`）时，小队全员进入重伤状态（`wounded = true`），挂机立即中断，`combat.idle` 自动重置为 `EMPTY_IDLE_STATE` 终止挂机；重伤未治愈前禁止再次开启。
- [ ] 调用 `stopLevelIdleUpdate` 时置空 `combat.idle` 并返回挂机时长、总场次、胜平负与掉落物统计的 `summary` 摘要。
- [ ] 单元测试覆盖在线连续战斗、缺体等待、战败重伤停止、主动停止等各种边界用例。
