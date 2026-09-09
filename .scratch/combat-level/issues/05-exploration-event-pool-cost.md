# 05 — 探索事件池与初始消耗

**Type:** grilling
**Status:** resolved
**Blocked by:** 01

## Question

手动探索如何按区域分组事件与消耗？需决议：

1. **区域事件池**：`RegionConfig.explorationEvents: string[]` 显式列出该区域事件 id（含 encounter 战斗遭遇与里程碑事件）；抽卡沿用现有类别权重，但只在区域池内筛。
2. **初始消耗**：`RegionConfig.initialCost: { food, energy }` 替换 `GAME_CONSTANTS.EXPLORATION_BASE_FOOD_COST / EXPLORATION_BASE_ENERGY_COST`；救援是否单独覆盖。
3. **救援事件**：仍按救援目标特殊触发，不进普通事件池；`realityLocationId` 与 Region id 的关系如何收敛。**research 09 指出**：4 个救援专用地点（`green_ruins` / `signal_tower` / `military_depot` / `collapsed_subway`）没有对应远征地点——需决定是否也建 region，还是保留为坐标别名；`collapsed_subway` vs `subway_station` 的 id 不一致需统一。
4. **id 冲突**：`REALITY_EVENTS.ancient_library`（relic 事件）与 `EXPEDITION_LOCATIONS.ancient_library` 撞 id；单表化后如何改名/加前缀。
5. **兜底行为**：区域事件池为空或配置错误时的失败/降级策略。

产出：区域事件抽取与初始消耗契约，供 04/06/09 使用。

## Answer

（HITL grilling，全部采用推荐方案。）

- **D1 区域事件池**：`RegionConfig.explorationEvents: string[]` 显式列出事件 id（含 encounter 与里程碑事件）；抽取沿用现有类别权重，但只在区域池内筛。
- **D2 初始消耗**：普通探索消耗走 `RegionConfig.initialCost: { food, energy }`，替换 `GAME_CONSTANTS.EXPLORATION_BASE_FOOD_COST / EXPLORATION_BASE_ENERGY_COST`；救援消耗仍走救援专用常量，不进 `RegionConfig.initialCost`。
- **D3 救援收敛**：救援事件仍特殊触发、不进普通事件池；`realityLocationId` 保留为救援坐标别名。4 个救援专用地点（`green_ruins` / `signal_tower` / `military_depot` / `collapsed_subway`）不建 region；统一 `collapsed_subway` → `subway_station`。
- **D4 id 冲突**：relic 事件 `REALITY_EVENTS.ancient_library` 改名为 `ancient_library_event`；远征 region 保留 `ancient_library`。
- **D5 空池兜底**：区域事件池为空 = 该区域不可探索（开始前校验报错，UI 禁用）。