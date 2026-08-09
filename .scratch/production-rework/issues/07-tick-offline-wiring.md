# 07 — 在线 + 离线推进接线

**What to build:** 让单任务在生产环境跑起来：在线每秒推进任务（按实际经过秒数），离线回归按离线总秒数结算（已完成批次入账、未完成批次保留进度继续计时）；任务推进与基建升级施工（0019 耗时机制）共存互不干扰；GameContext 移除队列相关方法。

**Blocked by:** 06 — 单任务状态机

**Status:** done (implement 完成)

- [x] 在线 tick：按 elapsedSeconds 推进每台设备的进行中任务（调用任务状态机推进逻辑），任务推进与发电机/回收站/温室/升级施工等现有系统共存
- [x] 任务进行中计入"活跃系统"判定（无其他活跃系统时任务仍逐秒推进、进度条刷新）
- [x] 离线结算：按总秒数推进任务——完成批次入账、未完成保留 `timeLeft`；离线报告不含任务信息或按现有机制聚合（不阻塞）
- [x] 离线结算顺序正确：升级施工（先应用再结算）与任务推进互不干扰
- [x] GameContext 移除队列相关方法（入队/移除/启停），不再暴露
- [x] 测试：`tick.test.ts` 在线推进任务（含任务与升级施工共存）；离线测试按总秒数推进、完成/未完成分支全绿

## Comments

### 实现记录（issue 07）

- 接线主体由 06 一并完成（字段改造的必然连带），07 聚焦验证与补测试：
  - 在线 tick：`applyTick` 第 3 段按 elapsedSeconds 调 `processFacility` 逐台推进（tick.ts:162-179），与发电机/回收站/温室/远征/挂机战斗/升级施工共存。
  - 活跃系统判定：`u.recipeId != null` 计入 hasActiveSystems（tick.ts:34）——仅有任务进行中时不短路，进度条每秒刷新。
  - 离线：`calculateDetailedOfflineProgress` 开头先 `resolveShelterUpgrades`（升级先应用）再按 actualSeconds 推进任务（offline.ts:51, 240-266）；离线报告按 `r.completed` 聚合"离线运转完成"（现有机制，不阻塞）。
  - GameContext 队列方法（enqueueRecipe/removeQueueEntry/setFacilityActive）已移除、不再暴露（06 完成，grep 确认无残留）；startTask/cancelTask 已暴露。
- 新增测试（+4）：
  - `tick.test.ts` 新 describe「applyTick 产线单任务推进（issue 06/07）」：
    1. 任务进行中即活跃系统（无其他活跃系统不短路），按 elapsedSeconds 推进 timeLeft（27→25）；
    2. 在线达到目标批数自动回待机 + 产出入账 + 写完成日志；
    3. 任务推进与基建升级施工共存：同一 tick 内任务 timeLeft 扣减 + 到点升级（Lv1→2）完成应用、施工条目移除。
  - `facility.test.ts`「离线：升级施工先应用再结算，与任务推进互不干扰」：离线 1h 内冶炼炉升级 Lv1→2 完成 + 任务按新等级续跑完成回待机（已产 1 批保留 + 离线完成 2 批）。
  - 离线完成/未完成分支测试（06 已补）：GameContext.test.tsx「全部完成回待机」「未完成保留 timeLeft 6s + 进度 74%」。
- 全量测试 584/584 通过（+4）；tsc / oxlint 0 错误。
