# Buff 模块「将就」待完善清单

> 记录范围：当前 <code>combat-buff</code> 实现中为了先跑通而暂时接受、但尚未达到 <code>docs/combat/Buff.md</code> 与 <code>.scratch/combat-buff/spec.md</code> 目标的部分。
> 生成分支：<code>combat_with_turn_buff_skill</code>。最近相关提交：<code>2ef1603</code>、<code>02e85bc</code>。

## 1. 配置与数据层

- <code>src/state/buffTypes.ts</code> 的 <code>BUFF_CONFIGS</code> 目前只有 4 个样例：burn、stun、foldFlame、warSpirit，不是完整的游戏 Buff 内容表。
- 配置表放在 <code>src/state</code> 而不是项目惯例的 <code>src/data</code>；后续应迁到数据层，状态层只保留类型。
- <code>BuffConfig.createEffects</code> 是函数字段，注册表因此不是纯数据、不可序列化。理想形态是把效果改为模板/参数声明，运行时统一解释。
- 灼烧默认 <code>30 * stacks</code>、折焰默认 <code>5</code>、战意 <code>1.5 * 敌人数</code> 都是硬编码 fallback/magic number，应改为由 Ability 传入值或数据配置提供。
- <code>BuffInstance.values</code> 是 <code>Record&lt;string, number&gt;</code>，通过魔法 key（例如 <code>amount</code>）读取，缺少按 buffId 声明的参数 schema。

## 2. 触发与注册

- <code>ctx.applyBuff</code> 本身不负责注册 Trigger；是否注册取决于调用方是否向 <code>createBattleContext</code> 传入了 <code>createBuffTriggerHooks</code>。当前只有生产 <code>simulateBattle</code> 接了，直接使用低层 seam 会静默漏注册。
- 从 <code>initialState.buffsByUnit</code> 预置的 Buff 不会注册触发器；创建 BattleContext 时加载初始实例后没有调用 <code>triggerHooks.register</code>。
- 效果可触发接口与 spec 形状不一致：实现是 <code>canTriggerBuff(instance, trigger, timingKey, currentOwnerId)</code>，而 spec 写的是效果级 <code>canTrigger(ctx, timingKey, currentOwnerId)</code>。当前靠每个 Trigger 的闭包捕获 instance/trigger 来补足参数。
- temporary 的「每个目标回合至多一次」只有约定，没有运行时守卫；如果某个 buff 配置了多个同回合可命中的 Trigger，会在一回合内递减多次。
- <code>createBuffTriggerHooks</code> 用模块级 <code>WeakMap</code> 保存注册记录，而不是 BattleContext 自己的状态；跨上下文边界时不够内聚。

## 3. 持续与层数

- 眩晕存在 off-by-one：<code>stun</code> 在目标 <code>turnStart</code> 先结算并递减，随后才由 <code>canAct</code> 判定。因此 <code>duration=1</code> 会在判定前归零并移除，实际一回合都不跳；<code>duration=2</code> 只跳一回合。这与「眩晕跳过当前回合」的直觉冲突，需要重新定口径（先判定后递减，或改在 turnEnd 递减）。
- <code>fireCount</code> 目前只有读取点和测试，生产链路没有任何 Ability/Effect 写入 <code>timingCtx.data.fireCount</code>；真正的放大器尚未实现。
- <code>fireCount &gt; 1</code> 时按 N 次独立 <code>resolveEffect</code> 落地；是否应聚合为单次事件仍是 spec 中的 fog，未解决。

## 4. 效果接线与中断编码

- 不同 source 挂同种 Buff 的冲突在 Effect 层复用 <code>negated</code>；spec 原票说可以复用 <code>negated</code> 或新增 <code>sourceConflict</code>，目前尚未正式决定。
- stun 时长归零也复用 <code>negated</code>，与免疫混淆；建议新增 <code>zeroed</code> 或等价的独立中断码。
- <code>executeStun</code> 构造 stun BuffInstance 时 <code>values</code> 恒为 <code>{}</code>，没有承载眩晕的传入数值/元数据。
- 战意的 <code>stat.strength</code> Modifier 只写入 BattleContext，但战斗中单位面板不会基于 BattleContext Modifier 重算，所以当前该加成不实际影响战斗数值。
- <code>removeBuff</code> 清理 owned Modifier 时只扫描该 Buff 的 <code>targetId</code>；如果未来 Buff 会给其他单位挂 Modifier，需要扩大回收范围或记录 Modifier 句柄列表。
- owned Modifier 的 source 标记约定为 <code>instance.id</code>，但缺少统一 helper；未来若改用 <code>buff:&lt;instanceId&gt;</code> 之类格式，容易出现清理不到的情况。

## 5. 模块边界与兼容

- 新旧两套 Buff 并存：旧 <code>buffSystem.ts</code> 的 <code>ActiveBuff</code> / <code>tickBuffs</code> 仍用于生产面板和重算路径，新的 BattleContext Buff 还没有与之合并或迁移。
- <code>canActWithBuffs</code> 目前只识别 <code>stun</code>，其他控制类状态还没有汇总。
- stun 从二元意志抵抗改为 durationReduction 的跨 effort 修订，还没有回写到 <code>.scratch/combat-effect</code> 的 spec 与相关 ticket。
- Buff 的图标、状态栏、层数/剩余时长展示尚未处理；虽然 UI 可能另立 effort，但需要确认展示数据的接口是否已足够。

## 6. 测试与文档

- <code>fireCount</code> 解耦测试是手工构造 <code>timingCtx.data.fireCount</code>，没有经过生产 Ability/Effect 注入链路。
- 当前测试只覆盖 4 个样例 Buff；新增真实 Buff 时应补齐其效果构建、触发、清理与持续/层数测试。
- 本清单本身就是「将就点」的存档；后续实现时应逐项勾除或替换为正式决策。

## 建议处理顺序

1. 先定眩晕递减口径和中断码（<code>sourceConflict</code> / <code>zeroed</code>），这是语义正确性。
2. 把触发器注册纳入 BattleContext 自身，或提供一个统一 attachBuff 高层 seam，避免漏注册。
3. 把 <code>BUFF_CONFIGS</code> 迁到 <code>src/data</code>，并将效果改为数据模板。
4. 打通 BattleContext Modifier 到战斗中单位面板的重算，让战意类 Buff 真正生效。
5. 实现或移除 <code>fireCount</code> 注入点，解决放大器归属。
6. 合并/迁移旧 <code>ActiveBuff</code> 体系，消除双轨。
