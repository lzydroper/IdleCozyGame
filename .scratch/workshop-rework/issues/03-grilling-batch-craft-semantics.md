# 批量合成交互与特殊配方语义

Type: grilling
Status: resolved
Blocked by: 01（已解析）

## Question

工坊的批量合成（用户需求第 4 点，对齐背包批量使用）如何设计？特殊配方在批量语义下如何处理？

需要决议：

1. **交互形式**：数量滑条（对齐 `ItemDetailModal` 的滑条模式）/ 快捷倍数按钮（x1/x5/x10/最大）/ 自定义输入，或组合；单次最大批量如何计算（材料上限、产出堆叠上限、蓝图锁定）。
2. **特殊配方**：`special: 'capsule_charge'`（充能胶囊，不产出背包物品而是加充能次数）与 `special: 'greenhouse_expansion'`（温室扩建，一次性上限）在批量语义下是否允许批量、UI 如何表达、逻辑层如何校验（参考 `state/workshop.ts` 的 `craftItemUpdate`）。
3. **逻辑层归属**：批量合成的核心逻辑（校验+扣料+产出）放在 `state/workshop.ts` 纯函数层（如 `craftItemUpdate(state, recipeId, count)`）还是组件层循环调用单次合成；接口形态建议。
4. **失败语义**：批量中材料不足时的处理（整体拒绝 vs 部分成功 vs 前置校验上限）。

前置：01 调研结论可能影响配方模型的表达（特殊字段是否重构），解析本 ticket 前先读 01 的结论。

产出：批量合成完整设计决议，写入 spec 的批量合成章节。

## Answer

（2026-08-06 与用户 grilling 决议）

**1. 交互形式**：每个配方卡片两个按钮——「合成」（单次 x1）与「批量」（打开批量合成弹窗）；弹窗对齐背包 `ItemDetailModal` 心智：配方图标/名称、消耗预览（cost×N）、产出预览（reward×N，充能配方显示充能次数）、数量滑条（0 ~ maxBatch）、「合成」按钮。批量按钮仅在有批量语义的配方上显示（greenhouse_expansion 不显示）。

**2. 配方可见性与批量上限**（2026-08-06 修订：蓝图锁定改为隐藏而非禁用）：
- **可见性规则**：配方可见 ⟺ 存在合成可能性——蓝图锁定（`blueprintId` 未持有）的配方**从列表隐藏**（不渲染、不显示"未解锁"标记），温室扩建已达 8 槽上限同样隐藏；材料不足**不隐藏**（材料可收集，显示但不可合成）。列表渲染前按此规则过滤，分类计数基于可见配方。
- **批量上限**（仅对可见配方计算）：`maxBatch = min over cost items of floor(inventory[item] / qty)`；greenhouse_expansion → 强制 1。

**3. 特殊配方语义**：
- `capsule_charge`（稳定胶囊充能）：**允许批量**，上限 = 材料上限（充能次数无容量上限），产出预览显示「梦境充能 +capsuleAmount×N 次」；
- `greenhouse_expansion`（温室扩建）：**禁止批量**，仅「合成」按钮，强制 count=1。

**4. 逻辑层归属**（纯函数原子批量）：`craftItemUpdate(state, recipeId, count = 1)` 扩展为批量参数——一次校验（recipe 存在 / greenhouse 上限 / blueprintId / 材料 cost×count 充足）→ 原子执行：扣料 cost×count；`capsule_charge` 充能 +capsuleAmount×count；`greenhouse_expansion` 槽位 +increment（count 强制 1）；普通配方 `addItemRewards(reward×count)`。`GameContext.craftItem(recipeId, count = 1)` 同步加参数。

**5. 失败语义**：前端以 maxBatch 前置限制滑条上限；逻辑层对材料不足**整体拒绝**（返回 false，无部分成功/部分扣料），组件层提示「合成失败：原料不足」。

→ 批量弹窗组件已提示 ticket 04（架构）纳入组件拆分清单。

