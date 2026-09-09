# 01 — 子 Tab 导航架构与通用区域选择器组件

**What to build:**
在「探索」主 Tab 下拆分「荒野」与「战斗」两个二级子 Tab 导航切换。实现通用的两级区域选择器组件（`RegionSelectorModal` + `RegionDetailModal`），仅展示所有已解锁区域 + 最近 1 个待解锁区域（后续锁定区域隐藏）；未解锁时详细罗列结构化诊断条件（红叉/绿勾）；支持进入待解锁区域查看关卡；荒野与战斗区域更换卡片统一全卡片可点击；统一全项目弹窗 `rounded-3xl`、操作按钮高度 `h-9.5` 与固定【确认/取消】双按钮规范。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] 底部导航「探索」Tab 内包含「荒野（`<Map />`）」与「战斗（`<Swords />`）」子 Tab，可无缝切换。
- [ ] 荒野与战斗页面的当前区域卡片均为全卡片可点击，点击均可唤起通用 `RegionSelectorModal`。
- [ ] `RegionSelectorModal` 一级列表仅显示已解锁区域 + 最近 1 个待解锁区域，后续深层未解锁区域完全隐藏。
- [ ] 点击区域打开 `RegionDetailModal`：
  - 已解锁区域：展示描述，【确认】按钮高亮可用；
  - 待解锁区域：详细罗列未达成原因（探索度、前置通关、关键物品等），【确认】按钮可用并允许进入该区域浏览关卡。
- [ ] 弹窗规格统一采用 `rounded-3xl`，操作按钮高度统一为 `h-9.5`，文案严格固定为【确认】与【取消】。
- [ ] 提供完整的 Vitest 自动化单元测试（验证 Tab 切换、区域选择过滤与解锁诊断）。
