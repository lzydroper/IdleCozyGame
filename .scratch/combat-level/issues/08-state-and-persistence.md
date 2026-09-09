# 08 — 战斗/探索状态与持久化

**Type:** grilling
**Status:** resolved
**Blocked by:** 01, 02, 03, 04

## Question

`GameState` 需要哪些破坏性改动？需决议：

1. **`CombatState.zonesCleared: string[]` → `clearedLevels: Record<regionId, string[]>`**；区域通关由「该区域 `levels` 末位 local id 已在 clearedLevels[regionId]」推导。
2. **当前关卡语义**：`CombatState` 改为同时记录 `regionId` 与 `levelId`（local）；`CombatIdleState` 也改为 `regionId + levelId`，取代单一 `zoneId`。
3. **探索状态**：`exploration` 增加 `regionProgress` 与里程碑 pending 状态；`realityLocationId` 与 region 的关系。
4. **持久化**：不向后兼容旧存档；`persistence.ts` 对旧字段的清洗/默认值如何写。
5. **旧测试**：删除/改写边界。

产出：新 `GameState` 类型草案与持久化迁移清单，供 spec 汇编。

## Answer

（HITL grilling，全部采用推荐方案。）

- **D1 通关记录**：`CombatState.clearedLevels: Record<regionId, string[]>`（local id 数组）；区域通关 = 该区域 `levels` 末位 local id 已在该数组。
- **D2 当前/最近关卡**：`CombatState` 用 `regionId: string | null` + `levelId: string | null`（local）；`CombatIdleState` 同样用 `regionId + levelId`，取代旧 `zoneId`。
- **D3 探索状态**：`exploration.regionProgress: Record<regionId, number>` 与 `exploration.pendingMilestones: Record<regionId, string>`（eventId）；`realityLocationId` 保持为救援坐标别名（`string | null`），不改成 regionId。
- **D4 持久化**：类型与状态中彻底删除旧 `zoneId / zonesCleared / idle.zoneId`；不做旧存档迁移。加载时对新字段填默认值：`clearedLevels:{}`、`regionProgress:{}`、`pendingMilestones:{}`、`regionId/levelId = null`。
- **D5 旧测试**：与旧 `zoneId / zonesCleared / COMBAT_ZONES` 强耦合的测试一律删除或按新模型改写，不做旧语义兼容。

```ts
export interface CombatIdleState {
  regionId: string | null;   // 正在挂机的区域
  levelId: string | null;    // 正在挂机的关卡（区域内 local id）
  startTime: number | null;
  accumulatedSeconds?: number;
}

export interface CombatState {
  regionId: string | null;          // 当前/最近战斗区域
  levelId: string | null;           // 当前/最近关卡（local id）
  lastSettlement: CombatSettlement | null;
  clearedLevels: Record<string, string[]>; // regionId -> 已通关 local id 数组
  idle: CombatIdleState;
}
```
