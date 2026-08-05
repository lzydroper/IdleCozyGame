# 22 — 背包分类切页（无“全部”）与全站 Lucide React 图标重构

**What to build:**
在 `WorkshopTab.tsx` 背包中添加【消耗品】、【装备】、【材料】、【碎片】分类切页（不含“全部”分类）。清理 `GameIcon.tsx` 及全站代码中所有 Emoji 字符串硬编码，替换为标准 Lucide React 矢量 SVG 图标。

**Blocked by:** 16 — 废除 Survivor 并支持英雄设施后勤驻守与 Supabase SQL 留档, 19 — 装备详情弹窗与 100% 强化/替换, 20 — 英雄 Tab 点击进入独立召唤 View 与 100 抽保底.

**Status:** resolved

- [x] `WorkshopTab.tsx` 实现【消耗品】、【装备】、【材料】、【碎片】4 大分类过滤（不含“全部”）
- [x] 在 `GameIcon.tsx` 中建立完整的 Lucide React SVG 图标映射
- [x] 清理全站 Icon Emoji 暂代硬编码

## Answer

已在分支 `hero-ehco` 完成（commit 60d1374），全量 314 测试通过、tsc/build 绿、oxlint 与基线一致。

**实施分歧确认（用户决策）**：
1. GameIcon 保留 spritesheet（最终目标全 sprite 化），缺失 id 用 Lucide 映射 + 「[sprite 待补]」标记表露，方便后续补图；
2. 背包分类切页加在 LogTab「避难所物资背囊」（实际背包所在，ticket 中的 WorkshopTab 系笔误）；
3. Emoji 全部清理：数据字段 + UI 图标 + 日志文案，测试同步更新。

**实现要点**：
- LogTab 背包 4 分类（无「全部」）：消耗品=food、装备=equipment、材料=material+seed、碎片=special；空分类禁用并显示数量，默认选中第一个非空分类，分类耗尽自动回退；新增 `LogTab.test.tsx` 5 例覆盖。
- 新增 `src/components/iconMaps.ts`：完整 Lucide 映射（62 物品 + 9 英雄 + 11 敌人 + 4 区域 + 3 装备槽位），独立文件以符合 `react/only-export-components`；GameIcon 雪碧图命中优先，缺失时 Lucide + 琥珀虚线待补标记 + console.debug（完全无映射才 warn）。
- 数据层移除 emoji 字段：items/heroes/survivors/combatZones/realityEvents/equipment（EQUIPMENT_SLOT_EMOJIS 由 SLOT_ICON_MAP 取代）/types（BattleHpEntry.emoji、BattleAction.actorEmoji）；战斗播放改用英雄 sprite + 敌人 Lucide（ENEMY_ICON_MAP 含 dream_leak_nightmare）。
- 全站 ~200 处 emoji（toast/标题/按钮/星级/日志文案）替换为 Lucide SVG / GameIcon / 纯文本；星级用填充 Star 图标。

**待办**（非本票范围，供参考）：`energy_refill`/`stimpack` 等物品既有 `category='equipment'`（ticket 10 旧数据），切页后归「装备」页而非「消耗品」，如需调整数据分类可另开票。
