# 10 — 战斗内面板重算 seam

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Ability 取数时如何读到「当前」面板，而不是入场静态快照？

1. `BattleUnitRuntime` 是否额外携带入场原始三层输入 + `permanentModifiers`（或等价 raw params），供战斗内重算？
2. `BattleContext` 是否新增 `resolveStats(unitId): BattleUnitStats`，用 base + 永久 + 战斗内动态 Modifier 现算当前面板？
3. Ability 每次计算来源数值前是否调用 `resolveStats`；不做缓存（首版以正确性优先）？
4. `unit.stats` 保留为入场快照用于展示/兜底，二者如何区分？

产出：战斗内面板重算 seam 契约。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 Runtime raw params**：`BattleUnitRuntime` 额外携带入场原始三层输入 + `permanentModifiers`（或等价 raw params），供战斗内重算。
- **D2 resolveStats**：`BattleContext` 新增 `resolveStats(unitId): BattleUnitStats`，用 base + 永久 + 战斗内动态 Modifier 现算当前面板。
- **D3 取数时机**：Ability 每次计算来源数值前调用 `resolveStats`；首版不缓存（正确性优先）。
- **D4 双口径**：`unit.stats` 保留为入场快照（展示/兜底）；`resolveStats` 是战斗内当前值来源。
