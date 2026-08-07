# 装备详情滚动卡顿修复：移除弹窗 backdrop blur + 滚动容器优化

Status: claimed
Type: task
Blocked by:

## Question

用户实证反馈（04 实施后）：**装备详情窗口（EquipmentDetailModal）滑动时卡顿明显，其余窗口滑动略微**。

根因（已探明）：

1. **主因**：`EquipmentDetailModal` 使用 `UI_TOKENS.modalBackdrop`（`uiConstants.ts:7` 含 `backdrop-blur-sm`），且其容器 `modalContainerEquipment` 是**可滚动**的（`max-h-[85vh] overflow-y-auto`，`uiConstants.ts:14`）——滚动时全屏模糊每帧重绘，正是 17 号（hero-module-overhaul）结论「全屏 backdrop-blur 是滚动合成压力主因」。17 号只处理了自绘 backdrop 的 7 处弹窗，**漏掉了 UI_TOKENS 统一 token 路径**（20fa592 有意加入 blur，但从未按 17 号结论清理）。
2. **次因（"其余窗口略微"）**：`modalBackdropSub`（`backdrop-blur-md` 更重）被 EquipSelectorModal 使用，其候选装备列表可滚动；ExpLevelUpModal 用 `modalBackdrop` 且预览区可滚动——这些内部滚动区滚动时同样受 blur 影响。
3. 04b 后 tick 频率已降（体力跨整点才 tick），滚动时每 3 秒一次的重渲染是残余的"略微"来源，非本次主要目标。

修复：

1. **`UI_TOKENS.modalBackdrop` / `modalBackdropSub` 移除 `backdrop-blur-sm`/`backdrop-blur-md`**（保留 `bg-black/75`/`bg-black/80` 透明度维持视觉层次）——一次性修复所有走统一 token 的可滚动弹窗（装备详情、装备选择、批量升级等）。对齐 17 号结论与先例。
2. **`modalContainerEquipment` 加 `overscroll-contain`**（滚动链隔离，防滚动冒泡到背景）。
3. 验证：`npx vitest run` 全量通过；`npm run build` 通过；`npx oxlint` 无新增；肉眼确认装备详情/装备选择滚动流畅。

范围外：tick 重渲染的彻底消除（context 拆分，01 测量已列为后续）、App.tsx 中非弹窗滚动场景的 backdrop-blur（离线报告/角色创建/梦魇警报，固定不滚动）。
