# 04 — Effect 主 seam：resolveEffect + damage/heal

**What to build:** 效果模块的端到端最小切片：能力/增益只派发效果实例，`resolveEffect` 按「作用前 → 作用中 → 作用后」落地。本票先打通伤害与治疗两个效果，含效果级修正、递归防环与 `effectApplied` 完成事件。

**Blocked by:** 01 — Turn setup 钩子；02 — 统一 Modifier 核心与适配器；03 — BattleContext 骨架

**Status:** ready-for-agent

- [ ] `EffectInstance` / `EffectResult` / `EffectKind` 类型落地，`targetId` 必填、多目标由调用方拆成多个实例。
- [ ] `resolveEffect` 三阶段骨架落地：before 修正+审核、during 分派 executor、after 派发完成事件。
- [ ] 伤害/治疗 executor 复用回合运行时的伤害/治疗原语（已含 clamp 与细粒度事件）。
- [ ] `effect.*` 修正对伤害/治疗生效（`effect.damage` / `effect.heal`）。
- [ ] 成功效果派发 `effectApplied`，payload 含 `effectId/kind/sourceId/targetId/values/targetDied`。
- [ ] 入口递归防环按 `chainKey` 拦截，返回 `interrupted: 'recursion'`。
- [ ] 测试覆盖三阶段顺序、效果级修正、完成事件与递归防环。
