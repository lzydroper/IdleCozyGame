# 01 — 挂机战斗离线暂停与离线报告清理

Type: grilling
Status: resolved
Blocked by: none

## Question

在玩家处于离线期间时，如何彻底停止挂机战斗的模拟与结算，同时保留避难所/温室/远征/体力的离线推进，并清理离线报告中的战斗内容？

具体需要决策：
1. `calculateDetailedOfflineProgress`（`src/state/offline.ts`）中如何彻底移除挂机战斗推进分支（`settleLevelIdleUpdate` 调用），并确保其不会影响温室、发电机、回收站、远征拾荒与基建升级。
2. 离线报告（`OfflineReport` 接口及 `src/App.tsx` 离线弹窗）如何完全移除 `idleCombat` 字段，仅展示 `recoveredStamina`（体力自然恢复量）与物资收益。
3. 玩家离线前若处于挂机战斗中，`state.combat.idle` 数据在离线结算后如何保留不变，以便玩家重新上线后直接在后续在线 Tick 中无缝继续。

## Answer

1. **彻底移除离线战斗计算**：
   - 在 `calculateDetailedOfflineProgress`（`src/state/offline.ts`）中彻底删除 `settleLevelIdleUpdate` 调用分支、`idleCombat` 临时对象及其日志构建逻辑。
   - `state.combat` 原样直通返回，不产生任何离线战斗模拟、掉落物入账或全灭重伤。
   - 避难所升级/发电机/回收站、温室生长/自动收割、远征派遣拾荒、体力自然恢复全部严格保留现有的离线推进。
2. **清理离线报告与 UI**：
   - 从 `OfflineReport` 接口中彻底删除 `idleCombat?: IdleCombatReport | null` 字段。
   - 在 `App.tsx` 离线弹窗中移除「挂机战斗报告」区块，保留体力和避难所资源恢复明细。
3. **挂机状态保留与上线继续**：
   - 离线前若处于挂机中，`combat.idle` 原样保留不变。
   - 玩家上线后，在线 Tick 循环（`applyTick`）直接检测 `combat.idle` 并使用离线期间自然恢复的体力继续推进下一场战斗，无需额外恢复触发或补结算。
   - 离线日志不增加多余的挂机暂停提示，由主界面战斗面板正常呈现挂机状态。
