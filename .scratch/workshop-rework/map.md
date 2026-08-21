# 工坊模块改造规范（workshop-rework）

Status: active

## Destination

产出《工坊模块改造规范》（`spec.md`）：定义工坊作为**纯生产/合成区域**的完整新形态——删除"补给发放"面板、引入分类栏位、批量合成、数据单一真相源、全数据可配置、代码结构优化，并规划梦魇警报控制台的迁出。**交付形态为 spec，实施在定稿后另行安排**。

## Notes

- **领域约定**（随解析逐步沉淀）：
  - 工坊 = 手动生产/组装/合成物品的区域；不属于生产的行为（使用道具、防御事件）不属于工坊。
  - 物品名称/描述等信息的单一真相源 = `ITEMS_CONFIG`（`src/data/items/`，ADR-0015）；配方是"操作定义"，物品是"产物定义"。
  - 背包系统已具备物品详情 + 批量使用（`ItemDetailModal`，ADR-0016），工坊不应重复这些能力。
- **必用技能**：`grilling`（HITL 决策对话）、`domain-modeling`（术语/模型）、`research`（外部事实）、`to-spec`（最终汇编 spec 时）。
- **范围红线**：本次只产出规范，不落地代码改造；实施是 spec 定稿后的新 effort。
- 梦魇警报控制台（`activeAlert.type === 'dream_leak'` 条件渲染的防御玩法）已决议**移出工坊**，去向由 ticket 04 决定。

## Decisions so far

<!-- 每解析一个 ticket，在此追加一行：名称（链接）+ 一句话结论 -->

- [调研手动/自动配方耦合](issues/01-research-auto-recipe-coupling.md) — 手动/自动配方高度同构，统一为单一配方数据模型技术可行（Recipe + 可选 facilityId/duration、统一 cost/reward）；8 对重复/近似配方需去重决策，其中 3 对存在刻意数值差有经济平衡风险；旧配方 id 必须稳定以保存档/队列兼容。
- [工坊分类栏位设计](issues/02-grilling-workshop-categorization.md) — 分类按产出物类别对齐背包 ItemCategory，另设「建筑」补充类收纳无产物配方（充能配方归「道具」）；固定 5 类无「全部」，空分类显示空态；分类定义进 data 可扩展；配方分类默认从 reward 主产物推导、无产物配方显式声明 category 字段。
- [批量合成交互与特殊配方语义](issues/03-grilling-batch-craft-semantics.md) — 卡片双按钮「合成」(x1)+「批量」(弹窗：消耗/产出×N + 滑条 0~maxBatch)；**可见性规则：蓝图锁定/已达上限的配方从列表隐藏（非禁用）**，材料不足仍显示；maxBatch=材料上限（仅可见配方）；充能胶囊可批量、温室扩建禁批量强制 1；逻辑层 craftItemUpdate(state, recipeId, count=1) 纯函数原子批量，GameContext.craftItem 加 count；材料不足整体拒绝。
- [工坊模块架构与警报迁出](issues/04-grilling-module-architecture.md) — 新建 src/components/workshop/ 子目录（WorkshopTab/CategoryBar/RecipeCard/CraftBatchModal/EmptyState）；纯函数（分类推导/可见性过滤/maxBatch）进 state/workshop.ts，toast 文案进 workshop/constants.ts；supplyItem 工坊侧无调用点、defendDreamLeak 接口不动；梦魇警报迁入 ShelterTab 顶部（新组件 DreamLeakAlertPanel.tsx），App 横幅跳转目标改 shelter；测试规划含蓝图隐藏断言与批量/警报组件测试。
- [配方去重与统一数据模型决策](issues/05-grilling-recipe-unified-model.md) — 共享基础类型 Recipe（含 facilityId?/duration?/category?/displayName?），删除 name/description 完全推导、AutoRecipe 并入；5 对完全一致配方仅保留工坊侧条目（被删自动 id 在 persistence 做一次性迁移映射），3 对近似保留双数值；双文件共享类型；字段名统一 cost/reward。
- [汇编工坊改造规范 spec](issues/06-task-compile-spec.md) — 《工坊模块改造规范》已汇编至 spec.md（Status: ready-for-agent），含 17 条用户故事、8 节实现决策、3 个测试 seam（state/UI/迁移）与实施前核对清单。**地图完成，待用户审阅 spec 后进入实施 effort。**

## Not yet specified

- **补给发放删除的影响面**：已随 04 决议清晰——`supplyConfigs` 移除、`supplyItem` 工坊侧无调用点、toast 文案归 `workshop/constants.ts`；具体改点由 spec 编写时列出。
- **配方展示元数据**：分类定义（id/标签/图标/排序）进 `data/` 已定（02 决议）；toast 文案已定归 `workshop/constants.ts`（04 决议）；配方图标沿用产物 `GameIcon`；**配方级排序与配色**等展示配置细节归 ticket 06（汇编 spec）展开。
- **特殊配方的数据表达重构**：`special: 'capsule_charge' | 'greenhouse_expansion'` 这类硬编码分支能否被更通用的配方模型取代。—— 01 已提供事实基础（特殊配方天然只属手动侧），具体决策归 05。
- **存档兼容性**：配方统一后旧配方 id 保持稳定、`facilityId` 防呆校验保留为硬约束（01 风险点②）——已并入 05 决议点 4；若 05 出现未预见的数据结构变更再回填此处。
- **测试计划**：已随 04 决议确定（组件/state/警报面板测试清单，含蓝图隐藏断言变更）。

## Out of scope

<!-- 已被有意排除在本 effort 之外的工作；关闭的误标 ticket 在此留一行 -->

（暂无）
