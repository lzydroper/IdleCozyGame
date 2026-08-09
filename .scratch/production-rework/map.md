# 产线改造：单任务批量生产 + 数据驱动设备注册

## Destination

把产线系统从"FIFO 队列"（`queue: string[]`，玩家逐条入队）改造为**单任务批量生产**模型（选中配方 → 滑条设定数量 → 开始生产，在线/离线持续推进，中断退还材料），并做**数据驱动架构重构**使新增设备种类只需加配置即可扩展。到达终点的标志：队列相关代码与概念彻底移除、任务模型稳定、设备注册配置化，且产出 spec 与实现 tickets，供后续 implement 直接执行。

## Notes

- 领域：后勤 / 产线 / 自动化生产。决策票解析期间请使用本项目术语（设施、配方、批次、驻守加成）。
- 相关代码（已熟悉，改动直接映射这些文件）：
  - 状态机：`src/state/facility.ts`（`processFacility`/`enqueueRecipeUpdate`/队列操作）
  - 配置：`src/data/shelterUpgrades.ts`（`SHELTER_UPGRADES`/`FACILITY_EXPANSION`）、`src/data/autoRecipes.ts`（`AUTO_RECIPES`）
  - 类型：`src/types/game.ts`（`AutomationFacility`、`FacilityType`、`ShelterStats.facilities`）
  - UI：`src/components/shelter/FacilityCard.tsx`（产线 tab 队列管理）、`src/components/shelter/ShelterTab.tsx`（基建升级卡）
  - 推进：`src/state/tick.ts`（在线）、`src/state/offline.ts`（离线）、`src/state/persistence.ts`（存档迁移）
- 相关 ADR：`docs/adr/0004-production-queue.md`（本 effort 将取代其队列模型）、`0018`（后勤指派/驻守加成）、`0019`（基建升级耗时，上一轮新增，与任务模型并存但机制不同——升级是时间戳到点应用，生产任务是连续推进）。
- 可参考的先例：工坊 `CraftBatchModal.tsx`（滑条批量交互）、温室生长（逐秒 `growthTimeLeft` 推进模式）。
- 流程预期（用户指定）：wayfinder 理清决策 → to-spec 产出 spec → to-tickets 拆实现票 → implement。决策票全部解析前不进入实现。

## Decisions so far

- [任务模型：每台设备单任务](issues/01-production-task-state-machine.md) — 已由用户拍板：每台设备同时只跑一个「配方 × 数量」任务，完成后回到待机；多台设备（扩建）各自独立任务并行。
- [中断退还规则](issues/02-duty-bonus-vs-batch-cost.md) — 已由用户拍板：已产出批次保留，未开始 + 进行中批次全额退还材料（简单、偏袒玩家）。
- [生产停止方式](issues/03-production-ui-prototype.md) — 已由用户拍板：只做「设定数量」，滑条上限 = 当前材料可支撑最大批次数，生产完自动停止；不做「持续生产」模式（与"开始扣全部材料"矛盾）。
- [架构方向](issues/04-data-driven-facility-registry.md) — 已由用户拍板：数据驱动重构，设备类型可配置扩展（消除 `FacilityType` 硬编码，新增设备=配置+图标注册）。
- [任务状态机与计时模型](issues/01-production-task-state-machine.md) — 已决议：`AutomationFacility` 移除 `queue`/`active`，改单任务字段（`recipeId`/`targetCount`/`completedCount`/`timeLeft`/`currentProgress`）；逐秒 `timeLeft` 推进（沿用 processFacility 模式）；开始扣全部（折扣后）材料、取消退款 = `(targetCount - completedCount) × 每批折扣成本`；删除"材料不足自动暂停"；无启停开关，只有开始/取消；targetCount 按批次口径（02 已确认）。
- [驻守加成与批量扣料的语义](issues/02-duty-bonus-vs-batch-cost.md) — 已决议：确认批次口径（滑条上限 = floor(材料/每批折扣成本) 批）；产量加成沿用 `floor(reward × (1+yield))`（已知：reward=1 时小数值加成被吞，接受；不做余数累计）；原料减免扣/退同按折扣价；速度加成沿用 getActualDuration；UI 显示每批产出与预计总产出。
- [生产 UI 交互形状](issues/03-production-ui-prototype.md) — 已决议：采用变体 B（弹窗驱动）——设备卡只做状态摘要（待机/生产中 + 进度 + 已产/目标 + 取消），「生产」走滑条弹窗（对齐 CraftBatchModal），「取消」走 showConfirm 带退款预览；**驻守按钮入口保留**（沿用 DutyAssignModal，加成实时作用于任务计算与展示）；多台设备各一张独立卡；基建 tab 不变。原型资产：`docs/prototypes/production-rework/`。
- [数据驱动设备注册架构](issues/04-data-driven-facility-registry.md) — 已决议：新建独立 `FACILITIES_CONFIG`（`satisfies Record<string, FacilityConfig>`，`FacilityType = keyof typeof FACILITIES_CONFIG`），设备升级/扩建/图标内聚；`SHELTER_UPGRADES` 收敛为纯全局升级；**升级机制同步泛化**（配置源分派）；UI 按配置表遍历渲染；新增设备仅需配置 2 处（FACILITIES_CONFIG + AUTO_RECIPES），其余自动生效。

## Not yet specified

- **spec**：已产出 `.scratch/production-rework/spec.md`（Status: ready-for-agent，含 Problem/Solution/User Stories/实现决策/测试决策）。
- **实现票**：已由 to-tickets 拆为 4 张（issues/05-08：设备注册 → 状态机 → tick/离线接线 → UI 改造），线性依赖，frontier 从 05 开始。存档迁移/离线结算/测试策略已并入对应实现票，雾区毕业。

## Out of scope

- **保留队列功能**：队列是本次要移除的，不做任何兼容保留（旧存档的 queue 仅做一次性迁移/丢弃）。
- **新增设备种类本身**：本次只做"可配置扩展"的架构，不实际新增冶炼炉/组装台之外的设备。
- **「持续生产」模式**：用户已否决（与"开始扣全部材料"矛盾）。
- **产量加成余数累计**：02 决议沿用 `floor` 公式，小数余数累计方案被明确否决（reward=1 时小数值加成不生效属已知接受行为）。
- **工坊手动合成**：`RECIPES_CONFIG`/`craftItemUpdate` 不动。
- **升级耗时机制（0019）**：已上线，不在本 effort 改动范围。
