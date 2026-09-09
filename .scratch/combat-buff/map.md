# 战斗 Buff 系统重构（combat-buff）— Wayfinder Map

## Destination

锁定「Buff（状态）」模块的设计决策集，产出可直接交给 `/to-spec`、`/to-tickets` 的实现规格：Duration 递减口径、Trigger 形状、Renew/Stack 语义、source 归属、forever 移除与清理契约、眩晕意志减免修订、一次触发多次效果的结算规则。**仅覆盖 Buff 模块**；Ability / Entity / Level / UI / Offline 各自另立 effort。

## Notes

- **领域**：Buff 实例生命周期（挂载 / 刷新 / 叠层 / 到期移除）、触发时机注册、与 Effect 的接线。
- **技能**：`grilling`、`codebase-design`；决策解决后接 `to-spec` → `to-tickets`。
- **既定约束（不可推翻）**：
  - `docs/combat/Buff.md` 为基线：instant 直接走 Effect 不建 Buff；forever 不随回合递减；temporary 持续若干回合；Renew/Stack 为布尔策略；同 buffId 同单位单实例；实例不计算数值、只记录来源/目标/传入数值。
  - `docs/combat/Effect.md`：Ability/Buff 只派发 Effect；审核在效果落地阶段统一。
  - `docs/combat/Turn.md`：时机两层（轮次主时机 + 细粒度事件）、注册机制、FIFO、纯确定性。
  - `.scratch/combat-effect/spec.md`：Effect 三阶段、统一 Modifier、BattleContext、applyBuff 链。
- **现状（chart 侦察结论）**：
  - `src/state/battleContext.ts` 的 `applyBuff` 是占位契约：命中已有实例只返回 `refreshed`，未实现 renew/stack/source 判定；`removeBuff` 只删列表项，未注销时机注册、未回收 owned Modifier。
  - `BuffInstance` 现为 `{ id, buffId, sourceId, targetId, stacks, duration: number | null }`；Renew/Stack/Duration 类型等策略不在实例上，需由 `buffId → config` 注册表提供。
  - `src/state/effectSystem.ts` 对 stun 仍走二元意志抵抗（`source.willpower >= target.willpower`），与 Buff.md 眩晕备注的「意志减免归零」口径冲突。
  - `durationReduction` 由 `statSystem` 派生（意志 × 0.005），当前未 clamp；`effectReduction` 另有 0.80 上限。
- **关键文件**：`docs/combat/Buff.md`、`src/state/battleContext.ts`、`src/state/effectSystem.ts`、`src/state/modifier.ts`、`src/state/statSystem.ts`、`src/state/turnEngine.ts`。

## Decisions so far

- [temporary 递减口径](issues/01-temporary-duration-decrement.md) — 按触发递减：一次触发结算 duration −1 一次；回合结束不参与递减。
- [Trigger 形状与 canTrigger](issues/02-trigger-shape-and-cantrigger.md) — 条目 `{ timing, unitRef: 'target' | 'source' }`；canTrigger 接收当前回合归属。
- [source 锁定与拒绝](issues/03-source-lock-reject-different-source.md) — 同 buffId 已有实例时，不同 source 的挂载在效果层直接拒绝；source 固定为首挂载者。
- [Renew / Stack 语义](issues/04-renew-max-stack-unbounded.md) — Renew 取 max、Stack 无上限、两策略独立判定；策略属配置层。
- [forever 移除与清理契约](issues/05-forever-removal-and-cleanup.md) — 层数归零即移除；removeBuff 需注销时机注册 + 回收 owned Modifier。
- [眩晕意志减免修订](issues/06-stun-will-duration-reduction.md) — stun 去二元意志抵抗，改 durationReduction → ceil → 0；免疫走 immunityBuff:stun；修订 combat-effect 04。
- [一次触发多次效果](issues/07-multi-fire-per-trigger.md) — 放大器提高效果触发次数（fireCount）；buff 持续结算与 fireCount 解耦，一次触发只减 1。

## Not yet specified

- 一次触发多次效果时，「效果触发 N 次」是否 = N 次独立 `resolveEffect`（N 个 `effectApplied` / 「受到伤害」事件），还是单次 resolveEffect 内部聚合。当前按「触发两次 = 两次独立落地」理解；若未来要求多份合并为单次事件，属 Effect 聚合，另立 ticket。
- `dispel / immunityBuff / taunt` 的二元意志抵抗是否同样改为「减免归零」口径——本次只定 stun，其余不动，待 Ability / 后续 effort 确认。

## Out of scope

- Ability / Entity / Level / UI / Offline 五个模块——各自另立 effort。
- 目标选择（集火 / 嘲讽 / 被攻击优先级）——属 Ability 模块。
- 伤害公式数值平衡、Buff 图标/展示模板渲染——数值与 UI 后续独立处理。
- 存档迁移 / 旧测试兼容——不向后兼容旧存档；旧测试不符新功能一律删除（用户决策）。

## 实现顺序建议

先 `01 + 03 + 04`（applyBuff 挂载语义改造，Buff 模块地基）→ 再 `02 + 07`（触发注册与多次触发）→ 再 `05`（移除清理）→ 最后 `06`（stun 修订，可独立先行）。