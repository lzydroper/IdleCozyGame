# 战斗 Buff（状态）系统重构规范（combat-buff）

Status: ready-for-agent

> 本规范由 wayfinder 地图（`.scratch/combat-buff/map.md`）的 7 个决策 ticket 汇编而成，各章节标注决议来源，可回溯详情。**交付形态为规范，实施为独立 effort（to-tickets）。**

## Problem Statement

当前战斗运行时已有 Buff 实例容器与 `applyBuff / removeBuff` 占位契约，但 Buff 生命周期语义尚未实现，无法支撑状态类技能：

1. **挂载语义是空壳**：重复获得同 `buffId` 只返回 `refreshed`，未按配置做 Renew / Stack 判定，也未做 source 归属与冲突拒绝；配置层 Duration / Renew / Stack 策略缺失。
2. **触发时机未注册**：Buff 只有实例列表，没有 Trigger 注册；Buff 不会在目标/来源的回合主时机或细粒度事件上结算效果。
3. **移除路径不清理**：`removeBuff` 只删列表项，未注销时机订阅、未回收 owned Modifier，遗留悬挂注册与面板污染。
4. **持续时间递减口径未定**：temporary 按触发还是回合结束递减、一次触发内效果被放大多次时如何计次，都没有统一规则，容易产生「跳过触发仍被扣时长」或「放大一次扣多回合」的错误。
5. **眩晕抵抗口径冲突**：效果层对 stun 仍用二元意志抵抗，与 Buff 基线「意志只减免持续时间、可归零」冲突；`durationReduction` 未 clamp，「归零」语义无法达成。

## Solution

把 Buff 做成**运行时状态模块**：配置注册表定义策略，`BattleContext` 作为实例与资源容器，Buff 通过 Trigger 注册到 Turn 时机；Effect 只负责派发 applyBuff / dispel，触发与持续结算由 Buff 模块统一执行。

1. **配置注册表**：`buffId → BuffConfig`，定义 Duration 类型、Renew / Stack 策略、Trigger 数组与消耗开关。
2. **挂载语义**：`applyBuff` 统一 source 锁定、Renew 取 max、Stack 无上限、两策略独立判定。
3. **触发注册**：每个 Buff 按 Trigger 数组注册到 `(timingKey, unitId)`，`canTrigger` 在时机派发时判定归属。
4. **移除清理**：`removeBuff` 完成注销时机注册 + 回收 owned Modifier + 删除实例三件事。
5. **持续结算**：temporary 按触发递减、一次触发只减 1，与 `fireCount` 解耦；forever 靠层数归零 / 驱散 / 显式结束移除。
6. **眩晕修订**：stun 移除二元意志抵抗，改为 `durationReduction` 时长减免，ceil 后归零即不生效。

## User Stories

1. 作为玩家，我想让「灼烧」这类 temporary Buff 在每个目标回合开始前触发一次伤害、持续指定回合数，以便 DOT 行为稳定可预期。
2. 作为玩家，我想让重复获得「灼烧」时按配置刷新持续时间、但不缩短剩余时长，以便续 debuff 不亏回合。
3. 作为玩家，我想让「折焰」这类 forever Buff 按层数强化目标接下来若干次攻击、层数耗尽后自动消失，以便消耗类 Buff 生命周期清晰。
4. 作为玩家，我想让「眩晕」令目标跳过当前回合，且在意志足够高时眩晕时长归零、不跳过回合，以便意志减免可感知。
5. 作为玩家，我想让驱散效果移除指定 Buff 后立即撤销其属性加成/减益，以便数值面板与战斗状态同步。
6. 作为玩家，我想让免疫眩晕的效果在眩晕施加前拦截，以便免疫与意志减免是两套独立机制。
7. 作为玩家，我想让同一个单位只会挂一个同种 Buff，即使数值不同也只更新不叠加实例，以便状态栏简洁且可预期。
8. 作为玩家，我想让不同来源尝试给同一目标挂同种 Buff 时保留首个来源、并拒绝后来来源，以便击杀归属等结算有唯一来源可读。
9. 作为开发者，我想让 Buff 策略（Duration / Renew / Stack / Trigger / 消耗开关）集中在配置注册表，以便新增 Buff 只加配置不改运行时逻辑。
10. 作为开发者，我想让 BuffInstance 只记录来源/目标/层数/时长/传入数值、不负责计算数值，以便 Buff 与效果职责清晰。
11. 作为开发者，我想让 `applyBuff` 统一实现 source 锁定、Renew 取 max、Stack 无上限、两策略独立判定，以便所有 Buff 复用同一挂载语义。
12. 作为开发者，我想让 `applyBuff` 返回 `{ instance, applied, refreshed, stacks }`，以便效果层与 UI 能区分「新建 / 刷新 / 冲突拒绝」。
13. 作为开发者，我想让 Trigger 用 `{ timing, unitRef: 'target' | 'source' }` 表达「哪个单位的哪个时机」，以便 Buff 可同时关注来源与目标。
14. 作为开发者，我想让 Buff 按 `(timingKey, unitId)` 注册到 Turn 时机表，以便避免「全局事件 × 所有单位 Buff」的 O(N×M) 过滤。
15. 作为开发者，我想让效果触发接口 `canTrigger(ctx, timingKey, currentOwnerId)` 在时机派发时判定归属，以便无关 Buff 不计算。
16. 作为开发者，我想让 temporary 持续时间按「触发结算」递减、一次触发只减 1，以便跳过触发不会被扣时长、放大触发也不会多扣。
17. 作为开发者，我想让效果触发次数（`fireCount`）与 Buff 持续/层数结算解耦，以便放大器只放大效果、不改变 Buff 生命周期。
18. 作为开发者，我想让 forever Buff 在层数归零、被驱散或效果显式结束时移除，以便永久 Buff 也有明确终止路径。
19. 作为开发者，我想让 `removeBuff` 一次完成注销时机注册、回收 owned Modifier、删除实例，以便移除不留悬挂注册或污染面板。
20. 作为开发者，我想让 Buff 持有的 Modifier 以稳定 source 标记反查回收，以便「战意」这类重算型 Buff 不会残留旧加成。
21. 作为开发者，我想让 stun 从二元意志抵抗改为 `durationReduction` 时长减免并 ceil，以便「意志过高 → 眩晕归零」可表达。
22. 作为开发者，我想让 `durationReduction` 不做 0.80 上限，以便高意志能把 1 回合眩晕减免到 0。
23. 作为开发者，我想让免疫眩晕走 `immunityBuff:stun` 标志、与意志减免互不干扰，以便免疫和减免语义正交。
24. 作为开发者，我想让 Effect 层的 applyBuff / dispel executor 只调用 Buff 挂载/移除契约、不立即结算触发，以便触发结算统一归 Buff 模块。
25. 作为开发者，我想让 Turn 的 `canAct` 谓词由 Buff 状态汇总，以便眩晕等控制通过 Buff 状态而非硬编码判断。
26. 作为开发者，我想让同一输入 + 同一 rng 种子的 Buff 触发顺序与事件流确定，以便测试与离线结算可复现。

## Implementation Decisions

（各决策详情与讨论见对应 ticket，以下为结论摘要。）

### 1. 模块边界与生命周期归属（来源：01 / 05，基线）

- Buff 模块负责：实例生命周期（挂载 / 刷新 / 叠层 / 到期移除）、触发注册、与 Effect 的接线。
- Effect 层只负责把 applyBuff / dispel 等效果落地到 `ctx.applyBuff` / `ctx.removeBuff`；applyBuff 落地**不立即结算**触发效果，触发由 Buff 模块在时机订阅后发生。
- Buff 实例**不计算数值**：只记录来源 / 目标 / 传入数值。具体造成的数值仍由派发的 Effect 在落地阶段按目标当前状态计算。
- instant 直接走 Effect、不建 Buff；forever 不随回合递减；temporary 持续若干回合。三者中只有后两者进入 Buff 运行时。

### 2. Buff 配置注册表（来源：04，基线）

- `buffId → BuffConfig` 注册表是策略唯一来源；实例化**不改变**配置层策略。
- 配置字段决策：`durationKind`、`renew`、`stack`、`stackIncrement`、`triggers`、可选 `consumeOnTrigger`。
- 以下类型形状直接编码决议，作为实施契约：

```ts
type BuffDurationKind = 'forever' | 'temporary';

interface BuffTrigger {
  timing: TurnEventKey;              // Turn 时机分类学：轮次主时机 + 细粒度事件
  unitRef: 'target' | 'source';
}

interface BuffConfig {
  buffId: string;
  durationKind: BuffDurationKind;
  renew: boolean;                    // true = 重复获得时刷新时长，取 max
  stack: boolean;                    // true = 重复获得时叠加层数
  stackIncrement: number;            // Stack=true 时每次挂载增量；Stack=false 时忽略
  triggers: BuffTrigger[];
  consumeOnTrigger?: boolean;        // forever 消耗类（如折焰）每触发消耗 1 层
}

interface BuffInstance {
  id: string;
  buffId: string;
  sourceId: string;
  targetId: string;
  stacks: number;
  duration: number | null;           // null = forever；number = temporary 剩余回合
  values: Record<string, number>;    // 创建时传入，实例不计算
}

interface BuffApplication {
  instance: BuffInstance;
  applied: boolean;                  // false = 不同 source 冲突拒绝
  refreshed: boolean;                // true = 命中已有实例
  stacks: number;                    // 更新后的层数
}
```

### 3. 挂载语义（来源：03 / 04）

- **同 buffId 单实例**：同一单位只允许存在一个 `buffId` 实例；重复挂载命中已有实例，不新建。
- **source 锁定与拒绝**：单位已挂有 `buffId=X`（`source=A`）时，其他 source（`B≠A`）的同种 buff 在挂载层直接拒绝：`applyBuff` 读到 `incoming.sourceId !== existing.sourceId` → `applied=false`，不刷新、不叠层。
- **source 固定为首挂载者**：实例 `sourceId` 永远等于首个成功挂载者；击杀归属等一律读 `instance.sourceId`，不存在 per-stack 多 source。
- **Renew 取 max**：`renew=true` 时 `duration = max(现有剩余, 新传入值)`，不缩短。
- **Stack 无上限**：`stack=true` 时 `stacks += stackIncrement`；**无 maxStack 上限**。
- **两策略独立判定**：同时为 true 时，重复获得 = 刷时长（max）**且** 层数 +增量。
- 冲突拒绝在 Effect 层的 interrupted 编码是复用 `'negated'` 还是新增 `'sourceConflict'` 由 to-tickets 定，语义不受影响。
- `EffectResult.values` 填 `{ stacks }`；其余信息由 Buff 模块负责展示。

### 4. Trigger 形状与注册（来源：02）

- Trigger 为数组，每条目：`{ timing: TurnEventKey, unitRef: 'target' | 'source' }`。
  - `unitRef: 'target'` = Buff 的目标单位（绝大多数，如灼烧 = 目标的回合开始前）。
  - `unitRef: 'source'` = Buff 的来源单位（如「来源阵亡时触发」）。
  - 不设 `'self'` 第三值——`self` 恒等于 `target`，避免三值冗余。
- Buff 按每条 Trigger 把效果注册到对应时机；注册键建议 `(timingKey, unitId)`，避免「全局事件 × 所有单位 buff」的 O(N×M) 过滤。
- 效果可触发接口：`canTrigger(ctx, timingKey, currentOwnerId): boolean`。时机派发时传入**当前回合归属单位**（或事件相关单位），效果据此判定是否命中自己关注的目标；判定不通过则不计算。
- temporary 的 Trigger 必须是**每个目标回合至多一次**的时机（如「目标的回合开始前 / 回合结束后」等轮次主时机）；需要「下 N 次攻击」之类消耗语义的，用 forever + 层数消耗（见 §6），不得用 `temporary(N)` 混淆。

### 5. temporary 递减与 fireCount 解耦（来源：01 / 07）

- temporary 采用**按触发递减**：每次该 buff 的触发**结算**一次，`duration -= 1`；归零即移除 buff 及其注册/所属资源。
- **一次触发结算 = duration 只减 1**，无论该次触发内效果被放大/触发多少次。
- **回合结束不参与递减**——避免「触发被跳过仍被回合结束扣时长」这类 bug。
- `fireCount`（放大器提高的效果触发次数）属 Effect / Ability 接线：一次触发时效果被触发 N 次 = N 次独立计算/落地。
- Buff 的**持续结算独立于 `fireCount`**：层数默认不变；层数变化的唯一来源是 Stack（挂载 +增量）与显式消耗（见 §6）。
- 例：灼烧 5 层、剩余 2 回合，被「加重灼烧」（灼烧生效 2 次）→ 下一次触发：灼烧效果触发 2 次，结算后层数仍 5，duration 2→1（不得变 0）。

### 6. forever 移除与清理契约（来源：05）

- 通用规则：**层数归零即移除**（无论 forever / temporary，只要有层数消耗语义）。
- forever 的移除路径：
  1. 驱散（dispel 效果）→ `ctx.removeBuff`；
  2. 效果显式结束 / 替换；
  3. **层数消耗归零**（如折焰：目标攻击后层数 −1，归零移除）。是否消耗层数由该 buff 的 Effect 逻辑决定，建议配置加 `consumeOnTrigger: boolean`，字段命名由 to-tickets 定。
- **移除清理契约**（`ctx.removeBuff` 必须完成三件事）：
  1. 注销该 buff 在时机注册表的所有条目；
  2. 移除该 buff 持有的 Modifier（按 `Modifier.source` 反查其 modifierId 并 `removeModifier`）；
  3. 删除实例记录。
- Buff 持有的 Modifier 以稳定 source 标记归属（建议用 Buff 实例 id 或等价的 `buff:<instanceId>` 标签），供 `removeBuff` 反查回收。
- 战意是清理契约的样板：每次重算前先移除 `source = 该 buff` 的 Modifier，再计算、再挂新 Modifier。

### 7. 眩晕意志减免修订（来源：06）

- **移除眩晕的二元意志抵抗**：`source.willpower >= target.willpower → resisted` 不再适用于 stun。
- 眩晕改为**时长减免**：`rounds = max(0, ceil(rounds_base × (1 - durationReduction)))`。
  - `rounds === 0` 即「意志过高 → 眩晕效果归零」：buff 不生效 / 提前结束，目标该回合不跳过。
  - `durationReduction` = 意志 × 意志-持续减免系数，**不设 0.80 上限**（区别于 `effectReduction` 的 0.80 clamp），否则「归零」无法达成。
  - 「上取整」保证：`rounds_base=1` 时只有减免 ≥100% 才归零，其余仍为 1；多回合时长则连续缩减。
- 免疫独立：免疫眩晕走 `immunityBuff:stun` 标志（Effect 层 `negated`），与意志减免无关。
- 本修订同步作用于 Effect 模块的 stun 审核表与 stun executor，属跨 effort 修订。

### 8. 与 Effect / Turn 的接线（来源：03 / 05 / 07）

- applyBuff effect executor 调用 `ctx.applyBuff(targetId, buffInstance)`，**不立即结算**触发效果；触发由 Buff 模块在时机订阅后发生。
- dispel effect executor 调用 `ctx.removeBuff(targetId, buffKind)`，清理契约由 Buff 模块承担。
- stun effect executor 构造 temporary stun BuffInstance 后走 `ctx.applyBuff`；stun 不再走二元抵抗。
- Turn 的 `canAct` 谓词由 Buff 状态汇总（如存在 `stun` 且 `duration > 0` 则不可行动）；Turn 不硬编码眩晕等枚举。
- 效果放大器（`fireCount`）属 Effect / Ability 接线；Buff 模块只保证持续/层数结算与 `fireCount` 解耦。

## Testing Decisions

- **主 seam**：`BattleContext` 的 Buff 方法——`applyBuff / removeBuff / getBuff / listBuffs`。用真实 `runTurnEngine`（注入 `setup` / `performAction`）或最小 `BattleContext` fake，断言挂载/刷新/叠层/冲突拒绝/移除清理的外部结果。
- **次级 seam**：
  - `canTrigger(ctx, timingKey, currentOwnerId)`（归属判定）；
  - Trigger 注册/注销（`(timingKey, unitId)` 订阅键，避免 O(N×M)）；
  - temporary 递减与 `fireCount` 解耦的触发结算；
  - `removeBuff` 三件事（注销注册 + 回收 Modifier + 删除实例）；
  - stun 时长减免 `ceil` 与归零、`immunityBuff:stun` 免疫；
  - Effect 层 stun 审核表修订后的 `resolveEffect` 行为。
- **好测试标准**：只测外部行为——给定 `BattleContext` + 挂载/触发/移除操作，断言 Buff 状态、事件流与 Modifier 归属；同输入 + 同 rng 种子必须确定。不测内部存储结构。
- **Prior art**：现有 `battleContext.test.ts` 的 fake-runtime 范式、`effectSystem.test.ts` 的 applyBuff/stun 效果断言、`turnEngine.test.ts` 的时机订阅与事件流断言即为参照。
- **迁移测试**：旧测试中依赖「removeBuff 只删列表项」「stun 二元意志抵抗」等占位语义的用例按新语义改写或删除（用户决策：旧测试不符新功能一律删除）。

## Not Yet Specified

- 一次触发多次效果时，「效果触发 N 次」是否 = N 次独立 `resolveEffect`（N 个 `effectApplied` / 「受到伤害」事件），还是单次 `resolveEffect` 内部聚合。当前按「触发两次 = 两次独立落地」理解；若未来要求多份合并为单次事件，属 Effect 聚合，另立 ticket。
- `dispel / immunityBuff / taunt` 的二元意志抵抗是否同样改为「减免归零」口径——本次只定 stun，其余不动，待 Ability / 后续 effort 确认。

## Out of Scope

- Ability / Entity / Level / UI / Offline 五个模块——各自另立 effort。
- 目标选择（集火 / 嘲讽 / 被攻击优先级）——属 Ability 模块。
- 伤害公式数值平衡、Buff 图标 / 展示模板渲染——数值与 UI 后续独立处理。
- 存档迁移 / 旧测试兼容——不向后兼容旧存档；旧测试不符新功能一律删除（用户决策）。

## Further Notes

- **决策来源**：`.scratch/combat-buff/map.md` 的 7 张 ticket（01–07）为唯一权威，本规范为汇编。
- **实现顺序建议**：先 01 + 03 + 04（applyBuff 挂载语义改造，Buff 模块地基）→ 再 02 + 07（触发注册与多次触发）→ 再 05（移除清理）→ 最后 06（stun 修订，可独立先行）。
- **跨 effort 修订**：stun 审核口径的修订需同步回 Effect 模块的审核表与 stun executor；实施时以本规范 §7 为准。
- **实施入口**：本规范为 to-tickets 的输入；Not Yet Specified 中的 fog 不阻塞地基票，但实施中若触及 Effect 聚合需先补决策再落地。
