# 04 — 荒野探索进度与里程碑

**Type:** grilling
**Status:** resolved
**Blocked by:** 01, 05

## Question

探索进度如何存储、累计与触发节点？需决议：

1. **进度存储**：`exploration.regionProgress: Record<regionId, number>` 存累计完成步数；`RegionConfig.explorationStepsToClear` 定义 100%；百分比 = `min(100, steps / target × 100)`。
2. **里程碑**：`RegionConfig.explorationMilestones: { atPercent: number; eventId: string }[]`，一次性节点；`eventId` 指向区域事件池内的事件，事件自身结构决定是战斗遭遇还是关键选择（不另加 `kind`）。
3. **全局 `minRunSteps`**：数据层暂定 7；里程碑触发要求本次探索已完成步数 ≥ `minRunSteps`。该常量放哪个数据文件、如何被探索结算读取。
4. **暂停累计**：到达里程碑后、未完成该里程碑前，后续探索步数不再累加 `regionProgress`；完成里程碑后恢复累计。需明确「未完成」的状态表达（pending milestone id？每个区域同时只允许一个 pending？）。
5. **完成/失败语义**：encounter 胜利算完成？choice 选择完即完成？失败/撤离如何影响 pending 与进度。

产出：探索进度状态与里程碑状态机草案，供 03/05/08 使用。

## Answer

（HITL grilling，全部采用推荐方案。）

- **D1 进度存储**：`exploration.regionProgress: Record<regionId, number>` 存累计完成步数；`RegionConfig.explorationStepsToClear` 定义 100%；百分比 = `min(100, steps / target × 100)`。
- **D2 里程碑**：`RegionConfig.explorationMilestones: { atPercent: number; eventId: string }[]`，一次性节点；`eventId` 指向区域事件池内的事件，事件自身结构决定是 encounter 还是 choice，不另加 `kind`。
- **D3 全局 minRunSteps**：新建 `src/data/explorationConfig.ts`，`EXPLORATION_CONFIG.minRunSteps = 7`；里程碑触发要求本次探索已完成步数 ≥ 该值。
- **D4 pending 状态**：`exploration.pendingMilestones: Record<regionId, string>`（value = 触发中的 milestone eventId）；每区域同时最多一个 pending；存在 pending 时，该区域 `regionProgress` 不再累加。
- **D5 完成/失败语义**：encounter 里程碑不允许撤离；胜利 = 完成（清 pending，恢复累计），失败 = 探索终止且 pending 保留（下次探索重试）。choice 里程碑任意选择即完成并清 pending。