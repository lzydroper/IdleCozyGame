# 删除经验条改为数值显示

Status: open
Type: task
Blocked by: 02

## Question

英雄详情界面（HeroDetailModal）删除经验进度条（第 11 点）：

1. 移除经验进度条 UI（进度条 + 百分比动画），改为直接显示数值（如 `exp / 升级所需经验`）。
2. 目的：消除切换英雄时经验条因 `transition-all duration-300` 与宽度重算产生的明显视觉跳动/卡顿（配合 02 的卡顿优化）。
3. 样式沿用现有卡片（bg-zinc-900/90 rounded-lg）与文字层级。

产出：HeroDetailModal.tsx 修改 + 相关测试更新。
