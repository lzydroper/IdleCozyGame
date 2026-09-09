# 03 — 区域与关卡解锁模型

**Type:** grilling
**Status:** resolved
**Blocked by:** 01

## Question

解锁谓词如何精确表达？需决议：

1. **荒野探索解锁区域 N** = 区域 N-1 已解锁 + 区域 N-1 探索度 100% + 可选特殊需求。
2. **挂机战斗解锁区域 N** = 区域 N-1 已解锁 + 区域 N 荒野探索度 100% + 可选特殊需求；**挂机远征**同战斗口径。
3. **区域内关卡**：第 1 关随区域解锁，后续关卡 = 上一关已通关；通关记录只存 `Record<regionId, localId[]>`（01 已定）；区域通关 = 末位关卡已通关。
4. **首区默认解锁**；测试区永远解锁且不进主线线性链（`isTestZone` 表达）。
5. **可选特殊需求的类型系统**：至少需要哪些 tagged union 成员（区域探索 / 关卡通关 / 持有物品 / 英雄等级 / 职阶 / 阵营…）；未用到的成员是留 fog 还是先定最小集。

产出：`isRegionExplorable / isRegionCombatUnlocked / isRegionExpeditionUnlocked / isLevelUnlocked` 的输入与谓词草案。

## Answer

（HITL grilling，解锁公式沿用 chart 结论，特殊需求采用最小三成员 union。）

- **D1 荒野探索解锁区域 N** = 区域 N-1 已解锁 + 区域 N-1 探索度 100% + 可选特殊需求。
- **D2 挂机战斗解锁区域 N** = 区域 N-1 已解锁 + 区域 N 荒野探索度 100% + 可选特殊需求；**挂机远征**同战斗口径。
- **D3 区域内关卡**：第 1 关随区域解锁；后续关卡 = 上一关已通关；通关记录 `clearedLevels: Record<regionId, localId[]>`（01 已定）；区域通关 = 该区域 `levels` 末位 local id 已通关。
- **D4 首区默认解锁**；测试区 `isTestZone` 永远解锁、不进主线线性链。
- **D5 特殊需求 union（最小集 + 扩展位）**：
  ```ts
  type RegionUnlockRequirement =
    | { type: 'regionExplored'; regionId: string; percent: number }
    | { type: 'levelCleared'; regionId: string; levelId: string }
    | { type: 'itemHeld'; itemId: string; count: number };
  ```
  英雄等级 / 职阶 / 阵营等需求只留扩展位，不进本 effort。