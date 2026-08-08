# 05 - HeroDetailModal 补齐完整 modifier 接入

**What to build:** 修改 `HeroDetailModal.tsx` 的 `calculatedStats` 计算逻辑，补齐天赋、觉醒、羁绊的 modifier 接入（当前只有装备 flat 值手动塞进 base，其余三来源完全没接入）。组装完整的 `permanentModifiers` 数组（与 `combat.ts` 的 `heroToCombatant` 同口径），传入 `calculateEntityStats`，使面板展示的属性值与战斗实际生效的完全一致。同时将里程碑 modifier（04 号产出）纳入。装备 flat 不再手动塞进 base，而是走 `getHeroEquipmentBonus` 统一进 modifier 管道。

**Blocked by:** 03 - 四来源产出函数打 source 标签, 04 - 里程碑加成转 StatModifier

**Status:** resolved

- [ ] `HeroDetailModal.tsx` 的 `calculatedStats` useMemo 中，组装完整 `permanentModifiers`：装备 `getHeroEquipmentBonus` + 天赋 `getTalentBonus` + 觉醒 `getAwakenBonus` + 里程碑 `getMilestoneModifiers` + 羁绊（需从队伍阵容计算 `aggregateBonus`，或面板场景下无羁绊则传空数组）
- [ ] 装备 flat 不再手动塞进 `baseAttributes`，改为通过 `getHeroEquipmentBonus` 走 modifier 管道
- [ ] `baseAttributes` 只保留 `heroBaseAttributes`（职阶成长，不含里程碑）
- [ ] `primaryAttributes` 和 `specialAttributes` 只保留 `config` 固有值（不含里程碑手动拆分）
- [ ] 传入 `calculateEntityStats` 的参数与 `combat.ts` 的 `heroToCombatant` 完全同口径
- [ ] 面板展示的属性值与战斗中一致（数值对比验证）
- [ ] 需要将组装好的 `permanentModifiers` 传递给 `DetailedStatsModal`（供 06 号展开展示）
