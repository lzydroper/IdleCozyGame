# 08 — dispel / immunity / taunt 效果

**What to build:** 控制与标记类效果经 Buff 移除与战斗标记落地：驱散移除指定 Buff，元素免疫/Buff 免疫/嘲讽写战斗标记；命中受来源意志与目标意志的二元抵抗审核。

**Blocked by:** 03 — BattleContext 骨架；04 — Effect 主 seam；07 — applyBuff / stun 效果

**Status:** ready-for-agent

- [ ] `dispel` 按 `buffKind` 移除目标 Buff。
- [ ] `immunityElement` / `immunityBuff` / `taunt` 经战斗标记落地，不管理持续时间。
- [ ] 二元抵抗：`source.willpower >= target.willpower` 才命中；命中后按负面数值/持续减免处理。
- [ ] 审核顺序 = 抵抗 → 无效化 → 执行。
- [ ] 测试覆盖抵抗命中/未命中、标记设置与驱散移除。
