# 07 — applyBuff / stun 效果与 Buff 占位

**What to build:** 打通「能力 → 效果 → Buff → 效果」链路的 Effect 侧：`applyBuff` 落地一个已创建的 Buff 实例但不立即结算其触发，`stun` 落地为眩晕 Buff；能否行动由后续 Buff 模块汇总。

**Blocked by:** 03 — BattleContext 骨架；04 — Effect 主 seam

**Status:** ready-for-agent

- [ ] `ctx.applyBuff` 返回 `{ instance, refreshed, stacks }`，applyBuff 效果的返回值填 `{ stacks }`。
- [ ] `applyBuff` executor 调用 `ctx.applyBuff`，不立即结算该 Buff 的触发效果。
- [ ] `stun` executor 落地为眩晕 Buff，效果本身不直接改单位行动状态。
- [ ] 缺省递归键 = `origin.id:effectId:sourceId->targetId`；反伤/触发类效果可用独立递归键。
- [ ] 测试覆盖 applyBuff 返回值、stun 落地、不立即触发与缺省递归键。
