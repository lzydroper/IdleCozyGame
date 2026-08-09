# 01 — 任务状态机与计时模型

Type: grilling

Status: resolved

Blocked by: None — can start immediately

## Question

`AutomationFacility` 从 `queue: string[]`（FIFO 多条目）改为**单任务**（配方 × 数量）后的精确状态机形状是什么？

需要决策的子问题：

1. **字段形状**：单任务需要记录哪些字段？候选：`recipeId`、`targetCount`（目标批次数）、`completedCount`（已完成批次数）、`timeLeft`（当前批剩余秒）、`startTime`（可选，供 UI 展示）。"开始扣全部材料"意味着需要能在中断时计算退款——退款 = 未完成批次数（含进行中的一批）× 每批成本，所以必须能推出"还剩多少批未完成"。
2. **计时模型**：沿用现有 `processFacility` 的**逐秒 `timeLeft` 推进**（在线 tick 每 tick 推进、离线一次性结算，已有大量测试基础），还是改为**时间戳驱动**（同 0019 升级机制，记录 `startTime`，批次完成数 = floor(elapsed / 批次耗时)）？考虑：离线结算要精确入账已完成批次并保留未完成进度；驻守速度加成会改变批次耗时；"中断退还"要按剩余批次计算。两种模型的取舍是什么？
3. **"开始扣全部材料"的入账**：开始生产时扣 `targetCount × 每批成本`，产出按批次逐批入账（每完成一批 `completedCount+1` 并入账该批 reward）。若中间取消，退还 `(targetCount - completedCount) × 每批成本`。这个模型是否正确、有无边界 case（如材料在扣料时因驻守原料减免而打折，退款是否按折扣价退）？
4. **任务与设施状态**：无任务 = 待机；任务进行中 = 生产；是否保留现有 `active`（启停）开关语义（关停 = 中断？还是只是暂停？）——注意用户已定"中断 = 取消任务并退款"，启停开关的去留需要定。

## Context

- 现有状态机：`src/state/facility.ts` 的 `processFacility`（FIFO 逐秒推进）、`enqueueRecipeUpdate`/`removeQueueEntryUpdate`（入队/移除，含"移除队首退还原料"先例）。
- 用户已拍板：单任务模型；"开始扣全部材料"；中断时未开始 + 进行中批次全额退还。
- 升级耗时机制（0019，`upgrades: Record<key,{startTime}>`）是时间戳到点应用模型，与生产任务的"连续推进"本质不同——本票要明确是否复用其模式或保持独立。

## Resolution

**决议（用户拍板）**：

1. **字段形状**：`AutomationFacility` 移除 `queue: string[]` 与 `active?: boolean`，改为单任务字段：
   - `recipeId: string | null`（null = 待机）
   - `targetCount: number`（目标批次数；开始生产时扣 `targetCount × 每批折扣成本`）
   - `completedCount: number`（已完成批次数；每完成一批 +1 并入账该批 reward）
   - `timeLeft: number`（当前批剩余秒，推进真相）
   - `currentProgress: number`（0-100，UI 展示，由 timeLeft 推导）
   - `id` / `name` / `level` 保留（level 影响批次耗时）
2. **计时模型**：沿用逐秒 `timeLeft` 推进（现有 `processFacility` 模式）——在线 tick 按 elapsedSeconds 推进、离线一次性传总秒数；速度加成/等级变化天然鲁棒；与温室生长一致。不用 0019 的时间戳到点模型（那是离散事件，生产是连续推进）。
3. **扣料与退款**：
   - 开始生产：校验 `targetCount × 每批折扣成本` 足够 → 扣全部（驻守原料减免按 `max(1, floor(成本 × (1 - costReduction)))` 折扣后扣）→ 置任务（`completedCount=0`、`timeLeft=首批耗时`）。
   - 每完成一批：`completedCount+1`、reward 入账（产量加成沿用现有公式）；`completedCount >= targetCount` 时任务结束（`recipeId=null` 回待机）。
   - 取消任务：退款 `(targetCount - completedCount) × 每批折扣成本`（进行中批次全额退，与 timeLeft 解耦）→ 任务清空。
   - 删除旧模型的"材料不足自动暂停"逻辑（材料已扣，不存在生产中缺料）。
4. **状态机**：待机（`recipeId=null`）↔ 任务进行中；**移除启停开关**（用户拍板），只有"开始任务 / 取消任务"。
5. **口径依赖 02**：`targetCount`/`completedCount` 以"批次"为口径；若 02 决议改为"产物数"口径，字段改为累计产出数（本票其余决议不变）。
