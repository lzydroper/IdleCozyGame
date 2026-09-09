# 09 — summon 效果

**What to build:** 召唤效果作为唯一多目标例外：单个效果实例按 `count` 创建指定数量的单位，主目标记录首个/主单位；其余效果仍保持单目标单实例。

**Blocked by:** 03 — BattleContext 骨架；04 — Effect 主 seam

**Status:** ready-for-agent

- [ ] `summon` executor 按 `params.count` 创建 `count` 个单位。
- [ ] `targetId` 记录首个/主单位。
- [ ] 召唤单位复用回合运行时的召唤原语，进入本回合未行动区。
- [ ] `effect.count` 修正对召唤数量生效。
- [ ] 测试覆盖 `count = 1`、`count > 1`、主 targetId 与数量修正。
