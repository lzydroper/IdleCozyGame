# 工坊模块架构与警报迁出

Type: grilling
Status: resolved
Blocked by:

## Question

工坊模块的代码结构如何优化（用户需求第 6 点）？梦魇警报控制台迁往何处（已决议移出工坊）？

需要决议：

1. **组件拆分**：`WorkshopTab.tsx`（现约 15KB，混含警报/补给/配方三块职责）在移除警报与补给后，配方区拆分为哪些子组件（分类栏、配方卡片、成本/产出展示、空状态等）；组件文件与目录组织（沿用 `src/components/` 平铺 vs 建子目录）。**批量合成弹窗**已决议为独立组件（ticket 03 Answer：滑条+消耗/产出预览，仅「合成」x1 快捷与「批量」入口分离）。**可见性过滤**已决议（ticket 03 修订）：蓝图锁定/已达上限的配方从列表隐藏，**移除现有"未解锁/锁图标/需要图纸"渲染**（WorkshopTab.tsx:242-278 相关分支），分类计数基于可见配方。
2. **展示辅助逻辑归属**：`getRecipeIconId`、`renderCostText`、toast 文案映射等辅助函数放组件内、`src/components/` 公共模块，还是 `src/state/workshop.ts` / `src/data/`；如何避免硬编码（用户需求第 5 点）。
3. **Context 接口去留**：`GameContext` 的 `craftItem` / `supplyItem` 在工坊侧的调用形态是否变化（如新增批量入口），是否仍由工坊消费 `supplyItem`。
4. **梦魇警报迁出**：迁往 `ShelterTab` / 独立区域 / App 层全局提示的取舍与理由；迁移清单（`WorkshopTab` 中相关 JSX、`defendDreamLeak` 调用、`NIGHTMARE_CONFIG` 引用、相关测试）；迁移后工坊空出的位置如何处置。
5. **测试规划**：重构后 `WorkshopTab.test.tsx` 的覆盖方向。

产出：架构拆分与警报迁出决议，写入 spec 的架构章节。

## Answer

（2026-08-06 与用户 grilling 决议）

**1. 组件拆分与目录组织**：新建 **`src/components/workshop/`** 子目录，组件清单：
- `WorkshopTab.tsx` —— 页面容器：分类栏状态、可见配方过滤、布局（原文件移入子目录，App.tsx 导入路径同步更新）；
- `WorkshopCategoryBar.tsx` —— 分类栏（5 类、计数基于可见配方、无「全部」）；
- `RecipeCard.tsx` —— 配方卡片（图标/名称/描述/消耗/产出 + 「合成」x1 + 「批量」按钮）；
- `CraftBatchModal.tsx` —— 批量合成弹窗（03 决议：滑条 0~maxBatch、消耗/产出×N 预览）；
- `WorkshopEmptyState.tsx` —— 空分类提示（复用背包空态样式）。

**2. 展示辅助逻辑归属**：纯函数进 **`src/state/workshop.ts`**（与 `craftItemUpdate` 同层、可单测）：`getRecipeCategory(recipe)`（02 决议分类推导）、`isRecipeVisible(state, recipe)`（03 修订可见性过滤）、`computeMaxBatch(state, recipe)`（03 决议批量上限）；toast 文案等常量集中到 `src/components/workshop/constants.ts`；展示组件只管渲染。

**3. Context 接口**：`craftItem(recipeId, count = 1)` 加 count（03 决议）；**`supplyItem` 在工坊侧无调用点**（补给面板删除后），接口保留给背包 `ItemDetailModal` 使用；`defendDreamLeak` 接口不动，由新宿主组件调用。

**4. 梦魇警报迁出**：迁入 **ShelterTab 顶部**（避难所防御归入避难所运营页）。迁移清单：
- 新建 **`src/components/DreamLeakAlertPanel.tsx`**（平铺，不属于工坊模块）：承接 WorkshopTab.tsx:126-196 的警报 JSX（HP 条/出战小队/炮塔/直接出战），调用 `defendDreamLeak`；
- `ShelterTab.tsx` 顶部挂载 `<DreamLeakAlertPanel />`；
- `WorkshopTab.tsx` 删除警报 JSX 及相关 import（NIGHTMARE_CONFIG、getDreamLockdownMinutes、防御相关 lucide 图标）；
- `App.tsx:789-802` 全局横幅：跳转目标 `handleTabClick('workshop')` → `handleTabClick('shelter')`，显示条件 `activeTab !== 'workshop'` → `activeTab !== 'shelter'`；
- 工坊原警报区直接移除，无额外处置（工坊变为纯生产区）。

**5. 测试规划**：
- `WorkshopTab.test.tsx`：分类栏渲染/切换、可见性过滤（蓝图隐藏、材料不足显示但不可合成）、「合成」x1、「批量」开弹窗、空分类空态；现有蓝图锁定断言改为隐藏断言；
- `CraftBatchModal.test.tsx`：滑条上限=maxBatch、消耗/产出预览×N、合成调用 craftItem(id, count)、greenhouse 无批量入口；
- `state/workshop` 单测：craftItemUpdate 批量（扣料×N/产出×N）、capsule_charge 批量、greenhouse 强制 1、材料不足整体拒绝、isRecipeVisible/getRecipeCategory/computeMaxBatch；
- `DreamLeakAlertPanel.test.tsx`：渲染条件与防御调用；App 横幅跳转目标测试。

→ 决议后 fog 更新：补给删除影响面、测试计划已清晰（见地图）。

