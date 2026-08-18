# 战斗效果系统（Effect）重构规范（combat-effect）

Status: ready-for-agent

> 本规范由 wayfinder 地图（`.scratch/combat-effect/map.md`）的 8 个决策 ticket 汇编而成，各章节标注决议来源，可回溯详情。**交付形态为规范，实施为独立 effort（to-tickets）。**

## Problem Statement

当前战斗没有统一效果层，行为散落且无法支撑 Buff / Ability 接入：

1. **行为各自为政**：伤害、治疗、觉醒技能逻辑散在 `combat.ts` 与 `combatEngine.ts`，Buff / Ability 没有统一的「效果」载体。
2. **伤害公式两套并存**：`combatEngine.calculateDamage`（`DEF/(100+DEF)` + 元素 + 暴击 + 虚无豁免）与 `combat.ts.dealDamage`（`max(1, atk-def)`）并存，生产链路用后者。
3. **Modifier 只有属性维度**：现有 `StatModifier` 只能修饰属性面板，无法表达「受到治疗 +10%」这类效果级修正。
4. **无初始化缝**：`runTurnEngine` 内部创建 `TurnRuntime`，上层无法在首个 `turnStart` 前组装战斗上下文与注册订阅。
5. **审核不统一**：抵抗、无效化、是否执行没有统一落地入口，后续会散落到各 Ability / Buff。

## Solution

把 Effect 做成**统一命令层**：Ability / Buff 只负责算好来源侧数值并派发 `EffectInstance`，`resolveEffect(ctx, effect)` 统一按「作用前 → 作用中 → 作用后」三阶段落地。

1. **BattleContext**：`TurnRuntime + modifier/buff/flag 状态` 的聚合，Effect 只依赖它。
2. **统一 Modifier**：`stat.*` 与 `effect.*` 一个类型，命名空间区分语义。
3. **三阶段管线**：before 修正+审核、during 按 `EffectKind` 落地、after 派发 `effectApplied`。
4. **固定效果种类**：首批 10 个 `EffectKind`，discriminated union，不做注册表扩展。

## User Stories

1. 作为开发者，我想让 Ability / Buff 只派发 `EffectInstance`、不各自写结算逻辑，以便行为复用与审核统一。
2. 作为开发者，我想让效果保存 `sourceId` / `targetId`，以便反伤等效果读取来源单位。
3. 作为开发者，我想让 `resolveEffect` 成为 Effect 模块唯一外部 seam，以便测试只跨这一条 seam。
4. 作为开发者，我想用统一 `Modifier` 同时表达属性加成与效果数值修正，以便消除两套近似类型。
5. 作为开发者，我想让伤害公式收敛到 damage executor，并删除 `combat.ts` 的 flat 公式，以便公式只有一处。
6. 作为开发者，我想让完成回调统一订阅 `effectApplied` 事件，以便 Buff 回调与事件流共用一个机制。
7. 作为开发者，我想让递归防环统一在 `resolveEffect` 入口，以便反伤不会形成无限递归。
8. 作为开发者，我想让 `TurnConfig.setup` 在首个 `turnStart` 前组装 BattleContext，以便 Buff / Effect 可注册主时机订阅。

## Implementation Decisions

（各决策详情与讨论见对应 ticket，以下为结论摘要。）

### 1. Turn 初始化钩子（来源：01）

- `TurnConfig` 增加 `setup?: (runtime: TurnRuntime) => void`。
- 调用点：`queue.sort(compareQueueIds)` 之后、`while` 主循环之前；`maxRounds <= 0` 也调用一次。
- `setup` 内只允许 `register/unregister` 与构建 `BattleContext`；不得 `dispatchEvent`、不改 hp/先机/队列。初始战斗态经 `initialBattleState` 注入，不重放为事件。
- `canAct` / `performAction` 保持 `(unit, runtime: TurnRuntime)` 签名；`battle` 由 setup 内创建后经闭包捕获，Turn 不感知 BattleContext。
- `createBattleContext(runtime, initialBattleState)` 放 `src/state/battleContext.ts`。

### 2. 统一 Modifier 与兼容过渡（来源：02）

新模块 `src/state/modifier.ts`：

```ts
type ModifierNamespace = 'stat' | 'effect';
type ModifierTarget = 'stat.<StatKey>' | 'effect.<EffectParamKey>';
interface Modifier {
  target: ModifierTarget;
  op: 'add' | 'multiply';   // add = flat；multiply = percent（小数）
  value: number;
  source?: string;
}
```

- `EffectParamKey` 先为不透明 string，后续按 EffectKind 收窄。
- `flat → add`、`percent → multiply`；适配器 `fromStatModifier` / `toStatModifier`。
- `effect.*` 聚合同 `stat.*`：同 target 的 `add` 求和、`multiply` 求和，最终 `(base + Σadd) × (1 + Σmultiply)`，一次应用。
- 配置层 `Modifier` 不带 id；`BattleContext` 存 `AppliedModifier { id, modifier }`，`addModifier` 返回句柄。
- 兼容边界：旧链路继续产出/消费 `StatModifier`，`calculateEntityStats` 签名不变；新 Effect / BattleContext 用统一 `Modifier`，转换在战斗快照/重算边界。

### 3. Effect 三阶段骨架（来源：03）

`src/state/effectSystem.ts` 主 seam：

```ts
type EffectKind =
  | 'damage' | 'heal' | 'statModify'
  | 'stun' | 'dispel'
  | 'immunityElement' | 'immunityBuff'
  | 'taunt' | 'summon' | 'applyBuff';

interface EffectInstance {
  id: string;
  effectId: string;
  sourceId: string;
  targetId: string;              // 必填；summon 为唯一多目标例外
  params: EffectParams;
  origin: { kind: 'ability' | 'buff'; id: string };
  chainKey?: string;
}

interface EffectResult {
  applied: boolean;
  interrupted?: 'resisted' | 'negated' | 'invalid' | 'recursion';
  values: Record<string, number>;
  targetDied?: boolean;
}

function resolveEffect(ctx: BattleContext, effect: EffectInstance): EffectResult;
```

管线：

```text
before  → 入口 chainKey guard → applyEffectModifiers → 按 EffectKind 审核
during  → 按 EffectKind 分派 executor，读目标当前状态算实际值并落地
after   → 成功则 dispatchEvent('effectApplied', payload)
```

- `targetId` 必填；多目标（AOE 等）由 Ability / Buff 拆成多个 `EffectInstance`。
- `events` 由 `ctx.turn` 直接写入事件流，`resolveEffect` 不返回事件数组。

### 4. 审核与抵抗（来源：04）

- 二元抵抗仅：`stun` / `dispel` / `immunityBuff` / `taunt`。
- 命中判定：`source.willpower >= target.willpower`。
- 命中后：`target.effectReduction` 减数值、`target.durationReduction` 减持续。
- 审核顺序：抵抗 → 无效化 → 执行；任一不通过即 `interrupted`，不进入 during。
- 每 EffectKind 声明 `audit: { affinity: 'harmful' | 'beneficial' | 'neutral'; resist: 'none' | 'will' }`。

### 5. effect.* 参数键（来源：05）

| EffectKind | 可修正键 | params 模板字段 |
|---|---|---|
| damage | `effect.damage` | `{ amount, element?, isCrit? }` |
| heal | `effect.heal` | `{ amount }` |
| statModify | `effect.value` | `{ modifier }` |
| stun | `effect.duration` | `{ duration }` |
| dispel | 无 | `{ buffKind? }` |
| immunityElement | 无 | `{ element }` |
| immunityBuff | 无 | `{ buffKind }` |
| taunt | `effect.value` | `{ value }` |
| summon | `effect.count` | `{ count, snapshot }` |
| applyBuff | `effect.duration` | `{ buffInstance }` |

- `effect.duration` 仅对 `stun`（`params.duration`）与 `applyBuff`（`buffInstance.duration`）有效；`statModify / immunity / dispel` 无可修正键。
- 每个参数键独立聚合，互不影响。

### 6. effectApplied 事件（来源：06）

- 仅成功效果派发 `effectApplied`；`interrupted` 效果不派发该事件。
- payload：

```ts
{
  effectId: string;
  kind: EffectKind;
  sourceId: string;
  targetId: string;
  values: Record<string, number>;
  targetDied: boolean;
}
```

- `effectApplied` 纳入 `BATTLE_EVENT_KEYS` 标准键（Turn.md 已列「效果生效」）。
- presenter 按 `kind` 分派，未注册 kind 走 fallback（沿用 `battleEventPresentation` 注册表）。

### 7. applyBuff 链与防环（来源：07）

- `applyBuff` executor 调 `ctx.applyBuff(targetId, buffInstance)`，**不立即结算**触发效果；触发由 Buff 模块注册到时机后发生。
- `chainKey` 可选；缺省 `origin.id:effectId:sourceId->targetId`。反伤/触发类效果设置独立 chainKey（或独立 effectId），不进入伤害递归。
- `ctx.applyBuff` 返回 `{ instance, refreshed, stacks }`；`EffectResult.values` 填 `{ stacks }`。
- Buff 实例由 Ability / Buff 在派发 applyBuff **之前**创建；Effect 只落地，不创建。

### 8. 基础效果 executor 落地（来源：08）

| EffectKind | executor 落地点 |
|---|---|
| damage | 迁移后的 damage 公式 → `ctx.turn.dealDamage` |
| heal | `ctx.turn.applyHeal` |
| statModify | `ctx.addModifier` / `ctx.removeModifier` |
| stun | `ctx.applyBuff(stun Buff)`；canAct 由 Buff 模块汇总 |
| dispel | `ctx.removeBuff(targetId, buffKind)` |
| immunityElement | `ctx.setFlag`（元素免疫标记） |
| immunityBuff | `ctx.setFlag`（Buff 免疫标记） |
| taunt | `ctx.setFlag`（嘲讽优先级标记） |
| summon | `ctx.turn.summonUnit × count`（唯一多目标例外） |
| applyBuff | `ctx.applyBuff` |

- damage 迁移 `combatEngine.calculateDamage`，删除 `combat.ts` 的 flat 公式。
- `BattleUnitStats` 收敛为完整面板（含特殊/派生属性），由快照传入，damage executor 直接读。
- `statModify / immunity / taunt` 不管理时间；duration 一律归 Buff 包装。

## Testing Decisions

- **主 seam**：`resolveEffect(ctx, effect): EffectResult`。测试用真实 `runTurnEngine`（注入 `setup` / `performAction`）或最小 `BattleContext` fake，断言三阶段结果与事件流。
- **次级 seam**：
  - `applyEffectModifiers`（effect.* 聚合修正）；
  - 审核谓词（抵抗 → 无效化 → 执行）；
  - 各 EffectKind executor（damage/heal/statModify/stun/dispel/immunity/taunt/summon/applyBuff）。
- **好测试标准**：只测外部行为——给定 `BattleContext` + `EffectInstance`，断言 `EffectResult` 与 `ctx.turn` 事件流；同输入 + 同 rng 种子必须确定。
- **迁移测试**：旧 `combat.test.ts` 中依赖 flat 伤害公式与旧 `simulateBattle` 行为的用例按新语义改写或删除（用户决策：不向后兼容旧存档/旧测试）。
- **Modifier 兼容测试**：`fromStatModifier` / `toStatModifier` 往返与 `effect.*` 聚合。

## Out of Scope

- Buff / Ability / Entity / Level / UI / Offline 六个模块——各自另立 effort。
- 目标选择（集火 / 嘲讽 / 被攻击优先级）——属 Ability 模块；嘲讽效果只负责改状态，选择逻辑归 Ability。
- 伤害公式的数值平衡（系数 / 上下限）——实现沿用既有公式，平衡后续独立处理。
- 存档迁移 / 旧测试兼容——不向后兼容旧存档；旧测试不符新功能一律删除（用户决策）。

## Further Notes

- **领域术语**：`CONTEXT.md` 的「修饰符 (Modifier)」词条需同步为统一 `Modifier` 形态（本 effort 已确认）。
- **决策来源**：`.scratch/combat-effect/map.md` 的 8 张 ticket（01–08）为唯一权威，本规范为汇编。
- **实施入口**：本规范 + map「无剩余 fog」为 to-tickets 的输入。
- **实现顺序建议**：先 01 + 02 + 03（地基），再 04 + 05 + 06 + 07（管线细节），最后 08（executor 迁移）。
