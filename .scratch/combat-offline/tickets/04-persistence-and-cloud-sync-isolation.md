# 04 — 本地持久化与云端保存隔离及覆写确认

**What to build:** 实现 `sanitizeStateForCloud(state)`，在向 Supabase 上传存档前将 `combat.idle` 规范化置空为 `EMPTY_IDLE_STATE`，确保云端不保存挂机运行时数据；本地 `localStorage` 完整持久化；在 `CloudSyncWidget.tsx` 从云端下载覆盖本地前，弹出二次确认模态框明确警示“将丢失本地未上传进度并停止挂机战斗”，玩家确认才执行覆盖；在 `persistence.ts` 强化水合容错降级。

**Blocked by:** 03 — 在线挂机连续战斗与中断状态机收敛

**Status:** ready-for-agent

- [ ] 实现 `sanitizeStateForCloud(state: GameState): GameState`，将 `combat.idle` 重置为 `EMPTY_IDLE_STATE`，并在 `App.tsx` 与 `CloudSyncWidget.tsx` 上传至 Supabase 前统一调用。
- [ ] `saveState` 确保本地 `localStorage` 完整保存 `combat.idle` 所有实时数据，刷新/重登无损恢复。
- [ ] `CloudSyncWidget.tsx` 在 `handleDownload` 执行云端拉取覆盖前，弹出二次确认模态窗明确警示玩家“将丢失本地未上传进度并停止挂机”，经玩家确认才执行覆盖并重置挂机；取消则不修改。
- [ ] `src/state/persistence.ts` 的 `mergeSavedState` 中对 `combat.idle` 进行强类型与有效性校验，异常坏数据安全回退至 `EMPTY_IDLE_STATE`。
- [ ] 编写持久化与云端过滤的单元测试。
