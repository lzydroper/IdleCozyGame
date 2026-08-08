# 09 — 种子选择弹窗（SeedSelectModal）

**What to build:** 播种与挂机选种共用的种子选择弹窗：列表式展示拥有种子的作物条目（种子物品图标、作物名、描述、生长时间、持有种子数、全部产出预览），无种子的作物隐藏，全部无种子时显示空态；选种模式高亮当前已选作物。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 新组件，props：`{ isOpen, title, inventory, onSelect, onClose, selectedCropId? }`
- [ ] 列表式条目：种子 icon（物品系统 `GameIcon type="item"`）+ 作物名/描述/生长时间 + 种子持有数 + 全部产出预览（每个产出的物品 icon + 数量）
- [ ] 无种子作物隐藏；全空显示「暂无可用种子」空态
- [ ] `selectedCropId` 命中的条目高亮（选种模式）
- [ ] 温室播种入口替换为该弹窗
- [ ] 组件测试（渲染/隐藏无种子/产出预览/选择回调/选中高亮/空态）；全量 `npx vitest run` + `npm run build` + `npm run lint` 绿
