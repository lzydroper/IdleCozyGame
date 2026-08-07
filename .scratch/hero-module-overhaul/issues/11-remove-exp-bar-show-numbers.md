# 删除经验条改为数值显示

Status: resolved
Type: task
Blocked by: 02

## Question

英雄详情界面（HeroDetailModal）删除经验进度条（第 11 点）：

1. 移除经验进度条 UI（进度条 + 百分比动画），改为直接显示数值（如 `exp / 升级所需经验`）。
2. 目的：消除切换英雄时经验条因 `transition-all duration-300` 与宽度重算产生的明显视觉跳动/卡顿（配合 02 的卡顿优化）。
3. 样式沿用现有卡片（bg-zinc-900/90 rounded-lg）与文字层级。

产出：HeroDetailModal.tsx 修改 + 相关测试更新。

## Answer

（本 session 实施，2026-08-07）

- `HeroDetailModal.tsx`：删除经验进度条（`h-1.5` 渐变条 + `transition-all duration-300` + 宽度百分比重算），改为**直接显示数值** `经验值：{hero.exp} / {level × expPerLevel}`（数值间加空格更易读）；卡片样式（bg-zinc-900/90 rounded-lg 边框）与文字层级沿用。
- 目的（对应 02 研究 R5）：消除切换英雄时进度条宽度重算与 CSS transition 造成的视觉跳动/渲染开销；配合 11 与 13 的卡顿优化。
- 验证：`npx tsc -b` 通过；`npx vitest run` 全量 → **415 passed / 41 files**（无回归；无测试断言经验条，仅 HeroDetailModal/HeroTab 相关 17 例复验）。

