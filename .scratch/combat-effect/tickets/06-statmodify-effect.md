# 06 — statModify 效果

**What to build:** 属性增减效果经战斗上下文落地为统一 Modifier 的增删；效果本身不管理持续时间，持续时间一律由外层 Buff 负责。

**Blocked by:** 03 — BattleContext 骨架；04 — Effect 主 seam

**Status:** ready-for-agent

- [ ] `statModify` executor 经 `addModifier` / `removeModifier` 落地。
- [ ] before 阶段的 `effect.value` 修正生效。
- [ ] 效果不注册到期、不递减持续时间。
- [ ] 测试覆盖加算、乘算、按句柄移除，以及 `effect.value` 修正。
