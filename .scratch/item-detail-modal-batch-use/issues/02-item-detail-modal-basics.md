# 02 — 背包物品详情弹窗（基础）

**What to build:** 点击背包（避难所物资背囊）任意物品弹出固定尺寸详情弹窗（宽约 380px、高约 460px，复用现有统一弹窗设计令牌），展示图标、名称、持有数量与介绍文本，描述区域可滚动；移除物品格上的悬浮提示（原生 title 与自定义气泡）；工坊补给发放面板的快捷使用交互保持原样、不弹窗。此阶段所有物品只展示介绍，使用区由后续票据按类型加入。

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] 点击背包物品弹出详情，点击遮罩或关闭按钮可关闭
- [x] 物品格不再有悬浮提示（原生 title 与气泡均移除）
- [x] 工坊补给面板交互不变（快捷使用按钮仍可用）
- [x] 组件测试覆盖弹窗开关与内容渲染

## Answer

已在分支 `hero-ehco` 完成（commit `62891c4`），全量 341 测试通过（+7）、tsc/vite build 绿、oxlint 与基线一致（4 错误 7 警告均为基线遗留，零新增）。

**实施要点**：
- 新建 `ItemDetailModal`：createPortal + `UI_TOKENS.modalContainerStandard`（380×460 固定），header（物品名 + aria-label「关闭详情」按钮）+ 内容区（大图标、持有 ×N、描述可滚动）+ 底部占位（使用区归 ticket 03/04/05）；遮罩点击关闭、容器 `stopPropagation`；未知物品 id 回退显示原始 id；
- `ItemGridItem`：移除原生 `title` 与气泡 tooltip；新增可选 `onClick`（cursor-pointer + active:scale-95）；`actionButton` 容器加 `stopPropagation` 防未来与 onClick 并存时误开弹窗；
- `LogTab`：新增 `selectedItemId` 状态，点击背包物品打开弹窗；`WorkshopTab` 清理已无用的 `description` prop（补给面板不弹窗、快捷使用按钮保持原样）；
- 测试：`ItemDetailModal.test.tsx` 5 例（渲染/关闭按钮/遮罩/容器内不关闭/未知物品回退）；`LogTab.test.tsx` 新增 2 例（点击开弹窗 + 遮罩关闭、title/气泡移除断言：物品名仅渲染一次且无 title 属性）。

