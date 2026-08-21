# 13 — 产线配方队列

**What to build:** 产线改造：每个设施一条 FIFO 配方队列（多配方顺序执行），队列长度随设施等级提升，设施数量靠扩建/解锁增加（多设施并行）。产线纯机器自动运转、无需指派人员。明确不引入网格布局（类 Factorio）与链式喂料。

**Blocked by:** 04 — 退役被动系统与职阶迁移.

**Status:** resolved

- [x] 设施支持 FIFO 配方队列，多配方顺序执行
- [x] 队列长度随设施等级提升，设施数量可扩建增加
- [x] 产线界面移除"指派人员"交互，纯自动运转
- [x] 队列机制有测试覆盖（入队/顺序/资源不足暂停）

## Answer

- 数据模型：`AutomationFacility` 以 `queue: string[]`（FIFO，队首 = 生产中）取代 `activeRecipeId`；`ShelterStats.facilities` 改为 `Record<FacilityType, AutomationFacility[]>`，同类型可扩建多台并行（上限 3 台，费用按台数递增，见 `shelterUpgrades.ts` 的 `FACILITY_EXPANSION`）。
- 队列容量 = 设施等级（Lv1=1 … Lv5=5）；每项配方入队后执行一批即出队，下一项自动接续；队首原料不足时暂停等待（不跳过），补料后自动恢复。
- 纯逻辑集中在 `src/state/facility.ts`（`processFacility` / 入队 / 移除（退还在制原料）/ 启停 / 扩建 / 升级），在线 tick 与离线结算共用；旧存档在 `persistence.ts` 迁移（单设施对象 + `activeRecipeId` → 多台数组 + 队列，未知配方丢弃、容量钳制）。
- UI（`FacilityCard.tsx`）：每台设施一张卡片，含配方入队、FIFO 队列列表（队首进度/暂停徽标、逐项移除）、按台升级、启停、扩建按钮；无任何指派人员交互（纯自动）。
- 测试：`src/state/facility.test.ts` 19 项（入队/容量/顺序/暂停恢复/退款/扩建并行/迁移）+ `src/components/FacilityCard.test.tsx` 2 项 UI；离线结算与旧测试已按队列语义更新。`tsc -b` 与全量 250 项测试通过。
