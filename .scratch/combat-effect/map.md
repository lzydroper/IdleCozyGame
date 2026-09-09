# 战斗效果系统重构（combat-effect）— Wayfinder Map

## Destination

锁定「Effect（效果）」模块的设计决策集，产出可直接交给 `/to-spec`、`/to-tickets` 的实现规格：Effect 数据模型、三阶段管线、统一 Modifier、BattleContext 运行时边界全部敲定。**仅覆盖 Effect 模块**；Buff / Ability / Entity / Level / UI / Offline 各自另立 effort。

## Notes

- **领域**：战斗效果结算、统一 Modifier、战斗运行时状态（BattleContext）。
- **技能**：`grilling`、`codebase-design`；决策解决后接 `to-spec` → `to-tickets`。
- **既定约束（不可推翻）**：
  - `docs/combat/Effect.md` 已定义 Effect 是具体行为的最小执行单位，不保存时机，来源/目标必存，三阶段作用前/作用中/作用后，统一 Modifier；本 effort 以此为基线。
  - `docs/combat/readme.md`：`combatEngine.calculateDamage` 伤害结算并入效果管道；`simulateBattle` 重写为 Turn + Ability + Effect 落地。
  - `docs/combat/Turn.md` 与 `.scratch/combat-turn/spec.md`：时机/事件订阅、FIFO、同时机内再注册延后、纯确定性、RNG 注入。
- **已确认的用户决策（chart 阶段）**：
  - 先打地基：Effect 数据模型 + 三阶段管线 + 运行时边界。
  - 运行时边界 = 新增 `BattleContext`（TurnRuntime + modifier/buff 状态），Effect 只依赖 BattleContext。
  - 统一 Modifier：新类型先行 + `StatModifier` 兼容过渡，不做全仓一次性迁移。
  - 基础效果种类：固定 discriminated union，不做注册表/插件式扩展。
- **现状（chart 侦察结论）**：
  - `src/state/turnEngine.ts` 的 `runTurnEngine` 在函数内部创建 `TurnRuntime`，外部无初始化钩子，Effect/Buff 无法在首个 `turnStart` 前组装上下文与注册订阅。
  - `src/state/statSystem.ts` 的 `StatModifier` 为 `{ stat, kind: 'flat' | 'percent', value, source? }`，无 `effect.*` 命名空间；被装备/羁绊/天赋/觉醒/UI 广泛消费。
  - `src/state/combatEngine.ts#calculateDamage` 已实现 `DEF/(100+DEF)`/元素/暴击/虚无豁免，但生产 `combat.ts` 仍用 `dealDamage = max(1, atk-def)`；两者需收敛到 Effect 伤害效果。
  - `TurnRuntime` 已有 `dealDamage/applyHeal/dispatchEvent/summonUnit` 等原语，但无 Modifier/Buff/免疫/嘲讽状态。
- **关键文件**：`docs/combat/Effect.md`、`src/state/turnEngine.ts`、`src/state/statSystem.ts`、`src/state/buffSystem.ts`、`src/state/combatEngine.ts`、`src/state/combat.ts`、`src/state/battleEventPresentation.ts`。
- **测试**：`src/state/combat.test.ts` / `turnEngine.test.ts` / `statSystem.test.ts` 为既有纯函数测试范式；Effect 新增 `effectSystem.test.ts`，用真实 `runTurnEngine`（注入 setup/performAction）或最小 `BattleContext` fake 断言三阶段结果。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [Turn setup 钩子](issues/01-turn-setup-hook.md) — `TurnConfig.setup(runtime)` 在 `queue.sort` 后 / `while` 前调用一次（含 `maxRounds<=0`），仅允许 register/unregister + 组装 BattleContext，不 dispatchEvent / 不改 hp；`canAct`/`performAction` 保持 TurnRuntime 签名、battle 闭包捕获；`createBattleContext` 放 `src/state/battleContext.ts`。
- [统一 Modifier + 兼容过渡](issues/02-unified-modifier-compat.md) — `Modifier{ target: `stat.*`|`effect.*`, op: 'add'|'multiply', value, source? }`；`EffectParamKey` 先为 string；`flat→add`/`percent→multiply`；`effect.*` 聚合同 `stat.*`；配置无 id、BattleContext 存 `AppliedModifier`；旧链路继续 StatModifier、转换在战斗快照/重算边界。
- [Effect 三阶段骨架与 resolveEffect](issues/03-effect-three-phase-skeleton.md) — 单一 seam `resolveEffect(ctx, effect): EffectResult`；`targetId` 必填、多目标拆多实例；before 内置修正+审核、during 复用 dealDamage/applyHeal、after 派发 `effectApplied`；入口 chainKey guard；首批固定 10 个 EffectKind。
- [效果审核与抵抗规则](issues/04-effect-audit-resistance.md) — 二元抵抗仅 stun/dispel/immunityBuff/taunt；命中 = source.willpower >= target.willpower；命中后 effectReduction 减数值、durationReduction 减持续；顺序 抵抗→无效化→执行。
- [effect.* 参数键](issues/05-effect-param-keys.md) — 每 kind 固定参数键（damage/heal/value/duration/count 等）；每键独立 `(base+Σadd)×(1+Σmultiply)`；applyBuff 修正 buffInstance.duration。
- [effectApplied 事件](issues/06-effect-applied-event.md) — 仅成功效果派发；payload `{effectId,kind,sourceId,targetId,values,targetDied}`；纳入 BATTLE_EVENT_KEYS；presenter 按 kind 分派 + fallback。
- [applyBuff 链与防环](issues/07-applybuff-chain-guard.md) — applyBuff 调 ctx.applyBuff 不立即触发；chainKey 缺省 `origin.id:effectId:sourceId->targetId`；ctx.applyBuff 返回 `{instance,refreshed,stacks}`；Buff 实例由派发方创建。
- [基础效果 executor 落地](issues/08-effect-kind-executors.md) — damage 迁移 calculateDamage 并删 flat 公式；BattleUnitStats 收敛完整面板；statModify 只改 Modifier；stun=applyBuff；dispel=removeBuff；immunity/taunt=BattleFlag；summon 为唯一多目标例外；applyBuff=ctx.applyBuff。

## Not yet specified

<!-- fog：转向本 destination 但尚无法精确提问的决策 -->

（无剩余 fog —— 全部 8 个 ticket 已解决。）

## Out of scope

- Buff / Ability / Entity / Level / UI / Offline 六个模块——各自另立 effort。
- 目标选择（集火/嘲讽/被攻击优先级）——属 Ability 模块（嘲讽效果只负责改状态，选择逻辑归 Ability）。
- 伤害公式的数值平衡（系数/上下限）——实现沿用既有公式，平衡后续独立处理。
- 存档迁移 / 旧测试兼容——不向后兼容旧存档；旧测试不符新功能一律删除（用户决策）。
