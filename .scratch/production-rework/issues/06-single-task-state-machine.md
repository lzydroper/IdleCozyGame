# 06 — 单任务状态机（纯函数层）

**What to build:** 产线从 FIFO 队列改为单任务批量生产。每台设备同时只跑一个「配方 × 批次」任务：玩家开始任务即扣除全部材料（含驻守成本减免），逐批产出入账，完成自动回到待机；取消任务退还已产出之外的全部材料（未开始 + 进行中批次按折扣单价全额退）。删除入队/移除/启停相关逻辑。本票为纯函数状态机 + 状态字段改造，UI 与 tick/离线接线由后续票完成。

**Blocked by:** 05 — 数据驱动设备注册

**Status:** done (implement 完成)

- [x] `AutomationFacility` 移除队列字段与启停开关，改为单任务字段（配方 id / 目标批次数 / 已完成批次数 / 当前批剩余秒 / 当前批进度），字段形状见 spec 的 Implementation Decisions（源自 01 决议）
- [x] 开始任务：校验 `目标批次数 × 每批折扣成本` 足够 → 扣全部材料（原料减免折扣）→ 置任务；材料不足 / 已在生产中 / 未知配方拒绝且不扣料
- [x] 推进：每完成一批 `已完成 +1` 并入账该批产出（产量加成 `floor(reward × (1 + yield))`）；达到目标批数自动回待机
- [x] 取消任务：退款 = `(目标批数 − 已完成) × 每批折扣成本`（未开始 + 进行中批次全额退）；已产出保留；退款不赚差价（扣/退同价）
- [x] 批次耗时按设备等级 + 驻守速度加成计算（沿用现有公式）
- [x] 删除"队首材料不足自动暂停"逻辑与入队/移除/启停纯函数
- [x] 旧存档队列字段一次性清空、加载无异常（新字段默认待机）
- [x] 测试：`facility.test.ts` 队列测试替换为任务测试并全绿（开始扣料、逐批推进、完成判定、取消退款、单任务互斥、多台并行、加成计算）

## Comments

### 实现记录（issue 06）

- `AutomationFacility` 字段：`queue: string[]` / `active?: boolean` 移除 → `recipeId: string | null`（null=待机）/ `targetCount` / `completedCount` / `timeLeft` / `currentProgress`。
- `state/facility.ts`：
  - 删除 `getQueueCapacity` / `enqueueRecipeUpdate` / `removeQueueEntryUpdate` / `setFacilityActiveUpdate` 与"材料不足暂停"分支。
  - 新增 `startTaskUpdate`：校验 target×每批折扣成本（`getBatchDiscountedCost`，max(1,floor(qty×(1-costReduction)))）→ 扣全部 → 置任务（timeLeft=首批耗时）；拒绝未知配方/跨设备/已在生产/非法批次/材料不足（均不扣料）。
  - 新增 `getMaxAffordableBatches`（UI 滑条上限 = floor(库存/折扣价)，多材料取最小值）。
  - 重写 `processFacility` 单任务推进：每批完成 completedCount+1 + 产出 floor(reward×(1+yield))；达 targetCount 自动回待机（任务字段清空）；保留 timeLeft 进度；防御配置失效配方任务作废。
  - 新增 `cancelTaskUpdate`：退款=(target−completed)×折扣单价，已产出保留，扣/退同价。
- `persistence.ts`：`normalizeFacilityUnit` 按新字段归一化（queue 数组一次性清空；activeRecipeId 旧格式迁移为单批任务 target=1；新字段任务校验 target>completed 保留、完成/失效回待机；timeLeft 钳制到单批耗时）。
- `GameContext.tsx`：移除 `enqueueRecipe`/`removeQueueEntry`/`setFacilityActive`，新增 `startTask`/`cancelTask`。
- `FacilityCard.tsx`：移除队列入队/队列列表/启停开关，改为单任务状态摘要（待机「待机 · 空闲」/ 生产中配方名、已产 X/N 批、当前批剩余、总剩余、进度条、每批消耗/产出）；驻守入口保留；生产/取消交互由 08 弹窗化。
- `tick.ts`/`offline.ts`：活跃系统判定改 `u.recipeId != null`，推进复用 processFacility（completed 语义不变）。
- 测试：`facility.test.ts` 重写为单任务套件（49 tests：开始/推进/取消/并行/批次上限 + 保留扩建/升级/迁移/dutyMeta/设备注册）；`GameContext.test.tsx` 两个离线产线测试改为单任务语义（全部完成回待机 / 未完成保留 timeLeft）；`FacilityCard.test.tsx`/`ShelterTab.test.tsx` 改为任务状态摘要断言。
- 全量测试 579/579 通过；tsc / oxlint 0 错误。UI 弹窗交互（生产滑条/取消确认）与完整 tick 接线测试留待 07/08。
