# 09 — 种子选择弹窗（SeedSelectModal）

**What to build:** 播种与挂机选种共用的种子选择弹窗：列表式展示拥有种子的作物条目（种子物品图标、作物名、描述、生长时间、持有种子数、全部产出预览），无种子的作物隐藏，全部无种子时显示空态；选种模式高亮当前已选作物。

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] 新组件 `src/components/SeedSelectModal.tsx`，props：`{ isOpen, title, inventory, onSelect, onClose, selectedCropId? }`（`createPortal` + UI_TOKENS）
- [x] 列表式条目：种子 icon（`GameIcon type="item" id={seedId}` 物品系统）+ 作物名/描述/生长时间 + 种子持有数 + 全部产出预览（每个产出的物品 icon + 数量）
- [x] 无种子作物隐藏；全空显示「暂无可用种子」空态
- [x] `selectedCropId` 命中的条目高亮（选种模式）
- [x] 播种入口替换（由 T10 接线：播种与挂机选种两处复用）
- [x] 组件测试 6 条（渲染/隐藏/产出预览/回调/高亮/空态/遮罩关闭）；`npx tsc -b` 通过
