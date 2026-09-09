# 04 — 本地持久化与云端保存隔离规范

Type: grilling
Status: resolved
Blocked by: 03

## Question

如何实现 `docs/combat/Offline.md` 所要求的“挂机战斗信息仅本地保存、云端不保存”的具体存储隔离与同步边界？

具体需要决策：
1. 本地存储（`localStorage`）：`state.combat.idle` 完整序列化保存，确保刷新或重登后挂机现场无损恢复。
2. 云端同步（`saveToCloud` / Supabase 上传）：在 `App.tsx` / `CloudSyncWidget.tsx` 发送云端前，如何对 state 进行规范化过滤，将 `combat.idle` 置为空状态 `EMPTY_IDLE_STATE`。
3. 云端下载覆写（`handleDownload`）：从云端拉取存档覆盖本地时，挂机状态的处理规则（重置为未挂机，防止幽灵挂机）。
4. 存档水合反序列化（`persistence.ts`）：对损坏/旧格式 `combat.idle` 的兜底容错规则。

## Answer

1. **云端上传前置清洗（`sanitizeStateForCloud`）**：
   - 提取状态清洗函数 `sanitizeStateForCloud(state: GameState): GameState`。
   - 在 `App.tsx`、`CloudSyncWidget.tsx` 上传至 Supabase 前，克隆 state 并将 `combat.idle` 强制重置为 `EMPTY_IDLE_STATE`，确保云端永远处于无挂机的干净静态。
2. **本地持久化与云端下载二次确认**：
   - **本地存储（`localStorage`）**：`saveState` 完整保存 `combat.idle` 所有实时数据，保证本地刷新/重启浏览器后挂机 100% 原样恢复。
   - **云端下载覆写确认**：在执行云端下载拉取覆盖本地前，UI 必须弹出二次确认模态窗（`showConfirm`），明确提醒玩家“覆盖将丢失本地未上传进度，并停止当前正在进行的挂机战斗”，玩家点击确认才执行覆盖与挂机置空；点击取消则完全不做任何修改。
3. **存档水合（Hydration）与容错**：
   - 在 `src/state/persistence.ts` 的 `mergeSavedState` 中，对 `parsed.combat.idle` 字段执行强类型与有效性校验，异常/损坏数据安全降级回退至 `EMPTY_IDLE_STATE`。
