# 08 — 确认式离线挂机

**What to build:** 战斗离线挂机为**玩家确认制**：在某战斗区域主动点"开始挂机"后，离线期间战斗才继续推进，重连时结算掉落与经验；可随时停止；体力耗尽自动停止，停止后剩余体力保留。离线结算复用现有离线 tick 机制，但仅在挂机开启的时段生效。

**Blocked by:** 05 — 战斗核心：三人轮询回合制.

**Status:** resolved

- [x] 战斗区域有"开始挂机/停止挂机"开关，未开启时离线不产生任何战斗结算
- [x] 挂机开启后离线推进战斗，重连弹窗报告掉落与经验
- [x] 体力耗尽自动停止挂机；玩家手动停止后体力保留
- [x] 挂机结算有时间上限或配置项，相关测试覆盖

## Answer

实现于 commit `feat: 确认式离线挂机（ticket 08）`，落地方式：

- **状态**：`CombatState.idle`（`zoneId` + `startTime`），`OfflineReport.idleCombat` 报告；旧存档经 `mergeSavedState` 回退默认值。
- **开关**：`startIdleUpdate`（校验区域/解锁/队伍/重伤/体力/单挂机）与 `stopIdleUpdate`（停止后体力保留），UI 在荒野页战斗面板每区域卡提供"⏳ 开始挂机 / ⏹ 停止挂机"。
- **离线结算**：`settleIdleUpdate` 复用 `simulateBattle`/`settleBattle`，场数 = min(离线时长, `COMBAT_CONFIG.maxIdleSettlementSeconds`=8h) / `battleDurationSeconds`=20s，并受体力上限约束；胜利累计掉落/灵魂残响/经验（战后满血），战败全员重伤并自动停止，体力耗尽自动停止（含在线已耗尽体力后离线的边界）。接入 `calculateDetailedOfflineProgress`（体力恢复之后），重连弹窗新增"挂机战斗报告"卡片。
- **测试**：`src/state/idle.test.ts` 16 例（开关校验、未开启零结算、体力受限场数、战败/耗尽自动停止、时间上限、重连报告集成）+ 组件测试 2 例。

