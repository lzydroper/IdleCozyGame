# 22 — 背包分类切页（无“全部”）与全站 Lucide React 图标重构

**What to build:**
在 `WorkshopTab.tsx` 背包中添加【消耗品】、【装备】、【材料】、【碎片】分类切页（不含“全部”分类）。清理 `GameIcon.tsx` 及全站代码中所有 Emoji 字符串硬编码，替换为标准 Lucide React 矢量 SVG 图标。

**Blocked by:** 16 — 废除 Survivor 并支持英雄设施后勤驻守与 Supabase SQL 留档, 19 — 装备详情弹窗与 100% 强化/替换, 20 — 英雄 Tab 点击进入独立召唤 View 与 100 抽保底.

**Status:** ready-for-agent

- [ ] `WorkshopTab.tsx` 实现【消耗品】、【装备】、【材料】、【碎片】4 大分类过滤（不含“全部”）
- [ ] 在 `GameIcon.tsx` 中建立完整的 Lucide React SVG 图标映射
- [ ] 清理全站 Icon Emoji 暂代硬编码
