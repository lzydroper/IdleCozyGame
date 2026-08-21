# 05-种子选择弹窗统一

Type: grilling
Status: resolved
Blocked by: （无）

## Question

统一种子选择弹窗（SeedSelectModal）的组件设计：

1. 从 ShelterTab 内联播种弹窗（L863-925）抽出独立可复用组件，播种与挂机选种两处共用。
2. 界面走**新的物品系统**：种子条目用 `ITEMS_CONFIG[seedId]` 的名称/icon（`GameIcon type="item"`），作物信息（生长时间/产出预览）从 `CROPS_CONFIG` 取。
3. **隐藏没有的种子**：`inventory[seedId] === 0` 的作物不显示（不再是置灰显示）。

## Context

- 现弹窗：遍历 `Object.values(CROPS_CONFIG)`，种子数 0 时置灰但可见；标题「选择种植作物」。
- 种子物品定义：`src/data/items/resources.ts`（seed_ 前缀，category=resource，有 seeds sprite + Sprout icon）。
- 需求：播种按钮与选种按钮弹出的界面统一、组件复用；选种用于挂机区域（T03/T04）。
- 弹窗风格可参考 `DutyAssignModal.tsx`（createPortal + modalBackdrop/modalHeader UI_TOKENS）或保留现有播种弹窗的视觉。

## Constraints

- 组件 props 需同时支持两种用途：播种（选中后种入指定槽位）与选种（选中后设为挂机作物）。建议 props：`isOpen`、`title`、`inventory`、`onSelect(cropId)`、`onClose`、可选 `disabledCropIds`/`selectedCropId`（挂机选中态高亮）。
- 无种子作物隐藏；有种子但无法播种时（如无空槽）由调用方 toast 提示，不在弹窗内禁用。
- 弹窗内展示：种子持有数、生长时间、产出预览（icon + 数量）。

## 实现范围（grill 敲定后）

grill 目标：与用户敲定并记录本 ticket Question 中的决策（组件 props/复用方式、条目信息呈现、隐藏规则）。决策敲定后，实现阶段落实：

- `src/components/SeedSelectModal.tsx` 新组件 + 测试（渲染、隐藏无种子、选择回调）。
- ShelterTab 播种弹窗替换为该组件（T04 接线挂机选种）。
- 全量 `npx vitest run` + `npm run build` + `npm run lint` 绿。

## Answer

grilling（HITL）敲定，决策记录：

1. **组件**：`src/components/SeedSelectModal.tsx`（新文件），`createPortal` 弹窗。
2. **Props**：`{ isOpen: boolean; title: string; inventory: Record<string, number>; onSelect: (cropId: string) => void; onClose: () => void; selectedCropId?: string | null }`——`selectedCropId` 用于选种模式高亮当前选中（播种模式可不传）。
3. **数据源（物品系统）**：遍历 `CROPS_CONFIG`；条目 icon 用 **种子物品**（`GameIcon type="item" id={seedId}`，seed_ 前缀物品有 sprite）；名称用作物名（`crop.name`，因为界面是「选择种植作物」）；副信息含种子持有数（`inventory[seedId]`）与生长时间。
4. **布局**：列表式（沿用现有播种弹窗样式：每行 `p-2.5 rounded-xl border flex justify-between`）——每行 = 种子 icon + 作物名 + 描述 + 生长时间 | 种子数，行内展示**全部产出预览**（每个 yields 的产出物品 icon + 数量）。
5. **隐藏规则**：`inventory[seedId] === 0` 的作物**不显示**（播种与选种一致）；全部无种子时显示空态「暂无可用种子」。
6. **选中态**：`selectedCropId` 命中的卡片高亮边框（选种模式）。
7. **用途**：播种（title「选择种植作物」，onSelect → `plantCrop`）与挂机选种（title「选择挂机作物」，onSelect → `setAutoFarmCrop`，传 `selectedCropId`）两处复用（T04 接线）。

实现范围（本 ticket）：`SeedSelectModal.tsx` + 测试（渲染、隐藏无种子、全部产出预览、选择回调、选中高亮、空态）。
