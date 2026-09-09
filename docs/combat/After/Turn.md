# Turn 模块「将就」待完善清单

> 记录范围：`combat-turn`（先机回合引擎）实现后的**已知取舍与未闭环项**。
> 语义：本文件只记录「能跑通、但为了先落地而做出的妥协」，不是 bug 清单；已通过的测试与构建不代表这些点不需要后续打磨。
> 关联留档：Ability / Effect / Buff 的「将就」清单见同目录 `Ability.md` / `Effect.md` / `Buff.md`；Turn 只列引擎与装配层的账。

## 已落地（简短）

- 纯函数引擎 `runTurnEngine(units, config)`：输入 `BattleUnitSnapshot` + `TurnConfig`，输出 `{ outcome, events }`。
- 先机公式 `calculateInitiative` / 召唤先机 `calculateSummonInitiative` / 全序排序键 `compareByInitiative`。
- 单队列 + 轮次分隔标记；五大主时机（roundStart/turnStart/turnActive/turnEnd/roundEnd）。
- 时机/事件订阅表：register/unregister、FIFO、同时机内新注册延后到下一次结算、触发上下文。
- 标准事件键：abilityUsed / attackAfter / damageTaken / healingTaken / death / summon / effectApplied。
- 死亡判定（取出队首读当前状态）、canAct 谓词、召唤入未行动区、先机变动只重排未行动区、强制结束通道。
- 生产装配 `simulateBattle`：`CombatantState → BattleUnitSnapshot` + Ability/Buff/Effect 初始化 + `BattleResult` 映射。

## 待完善项

### 1. 队列是「有序数组 + sep」，不是真正的优先队列

- **现状**：`runTurnEngine` 用 `queue: string[]` + 分隔索引 `sep` 表达「已行动区 / 未行动区」；先机变动、召唤、新轮次时执行 `queue.slice(sep).sort(compareQueueIds)`。
- **妥协点**：语义与 spec 的「单优先队列 + 轮次分隔标记」等价，3v3 小规模完全够用；但每次重排是 O(k log k)，并非优先队列的增量插入/弹出。
- **待完善**：二选一——(a) 接受数组实现，把 spec 措辞改成「单队列 + 分隔标记」并明确复杂度边界；(b) 单位数量上来后换真正的带分隔语义的优先队列（堆 + 惰性删除/版本号）。

### 2. 先机仍是浮点数

- **现状**：`calculateInitiative` 返回 `100 + agility/(agility+100)*100 + clamp(fixval)`，未取整；debug 队列里会出现 `102.857142857...` 这类值。
- **妥协点**：排序全序和确定性没问题（IEEE 754 确定），但 Turn.md 写「战斗中先机只以固定 int 值加算/减算 fixval」，口径不统一，调试不友好。
- **待完善**：在 `calculateInitiative` 出口定取整规则（建议 `Math.round`），测试与 debug 同步改为整数口径。

### 3. 当前行动单位在 `turnStart` 前就移入已行动区

- **现状**：为了防重入（先机变动/召唤只影响 `queue[sep..]`），实现把 `sep++` 放在 `turnStart` 结算之前；而 spec 状态机写「回合结束后 → 移入已行动区」。
- **妥协点**：当前单位的回合内先机变动不会再把它排回未行动区，保证一轮一次行动；但这与状态机图/决策文字不一致，`turnStart` 订阅者若读 debug 队列，会看到自己已在已行动区。
- **待完善**：把「取出队首即锁定本轮行动资格」正式写进 Turn.md/spec；或调整实现让 sep 移动点与文档一致并继续保证防重入。

### 4. hp 写入缺少受控入口，死亡事件与伤害结算耦合

- **现状**：`TurnRuntime` 只有 `dealDamage` / `applyHeal` 会改 hp 并派发 `death` / `damageTaken` / `healingTaken`。复活或直接改 hp 只能 `runtime.getUnit(id).hp = N` 裸写，不会派发死亡事件。
- **妥协点**：死亡判定（取出队首读当前状态）已按 spec 实现，但「死亡事件只派发一次」目前只有 `dealDamage` 这一条产生路径；未来 dot、护盾吸收、复活、处决类效果都需要新的 hp 写入 seam。
- **待完善**：提供统一 hp 变更入口（如 `setHp` / `applyHpDelta` / `revive`），内部负责 0 钳制、上限钳制与 `death` 一次性派发；`dealDamage` / `applyHeal` 收敛为其特化。

### 5. 取整/截断策略分散在 Turn 与 Effect 之间

- **现状**：`effectSystem.calculateDamageAmount` 已经 `Math.round` 一次；`executeDamage` 又取 `result.values.damage`；`turnEngine.dealDamage` 内部再次 `Math.round(amount)` 并 `Math.min(target.hp, ...)`。
- **妥协点**：同一数值被多层取整，调用方分不清传入 `dealDamage` 的应是「最终量」还是「待取整量」；边界（0.5、负数、超出当前 hp）靠约定。
- **待完善**：定一条规则——Turn 只做状态写入与 hp 钳制，数值取整归 Effect/Ability；或反过来 Turn 出口统一取整。二选一后清理 `dealDamage` / `applyHeal` 的重复 round/clamp。

### 6. `summonUnit` 的召唤事件来源是召唤物自己

- **现状**：`turnEngine.summonUnit(snapshot)` 派发 `summon` 事件时写 `sourceId: unit.id`（即召唤物自身）；`effectSystem.executeSummon` 调 `turn.summonUnit` 时把 `effect.sourceId` 丢弃了。
- **妥协点**：UI 和「召唤师触发」类 Buff 无法从事件流得知真正的召唤者；召唤物 id 由 Effect 层手工拼 `targetId-N`，存在覆盖已有单位的风险（详见 `After/Effect.md` 第 3 条）。
- **待完善**：给 `summonUnit(snapshot, sourceId?)` 增加来源参数并让 Effect 层透传；或把 `summon` 事件改为 Effect 层负责派发，Turn 只负责入队。

### 7. 订阅 API 无返回句柄

- **现状**：`TurnRuntime.register` 返回 `void`；`buffRuntime` 需要额外的模块级 `WeakMap` 保存注册记录，才能在未来 `unregister`。
- **妥协点**：调用方负担重，注册/注销不对称时容易漏删。
- **待完善**：`register` 返回 unsubscribe 句柄（或 registration id）；保留按 subscriber 引用注销的兼容路径。

### 8. 主时机与细粒度事件混在同一事件流

- **现状**：`roundStart/turnStart/...` 与 `abilityUsed/effectApplied/...` 全部 append 到同一个 `events` 数组。
- **妥协点**：轮播 UI 要区分「节奏点」和「信息行」只能靠 key 过滤；未来若轮播需要在每回合开始处高亮/停顿，需要额外解析。
- **待完善**：可保留单流，但给事件增加 `phase: 'timing' | 'event'`；或在 `TurnResult` 提供 `timings` / `events` 两个视图。把最终形态写回 spec。

### 9. debug 字段给每个事件都附全队列快照

- **现状**：`config.debug` 开启后，`pushEvent` 对**每个事件**附加 `queue` 数组 + `separator`。
- **妥协点**：调试信息最全，但事件流体积变成 O(事件数 × 单位数)，大规模战斗会膨胀。
- **待完善**：debug 快照只附在 `roundStart` / `turnStart`（先机可见性真正关心的时点），其余事件只带轻量字段。

### 10. Turn 通过 `BattleUnitStatParams` 与 statSystem 类型耦合

> ✅ 已由 combat-entity 完成。

- **现状**：`turnEngine.ts` import 了 `BaseAttributes / PrimaryAttributes / SpecialAttributes / StatModifier` 来定义 `BattleUnitStatParams`；`battleContext.resolveStats` 又做一次面板展平。
- **妥协点**：Turn 的「纯流程引擎、不碰属性计算」边界被类型依赖打破（与 `After/Ability.md` 第 14 条同源）。
- **待完善**：把 `BattleUnitStats` / `BattleUnitStatParams` 抽到共享战斗类型模块，Turn 只保留 `import type`。

### 11. `TurnConfig.setup` 是后补的初始化 seam

> ⚠️ 已由 combat-entity 抽出 `createBattle`，但 setup 仍通过 `TurnConfig.setup` 传入，尚未前移到装配层或写入契约（见 `After/Entity.md` #12）。

- **现状**：`TurnConfig.setup(runtime)` 用于 Ability/Buff 在首轮前完成装配；它不在 combat-turn spec 的原始接口清单里。注释约定「不派发事件、不改 hp/先机」，但没有运行时校验。
- **妥协点**：装配逻辑需要一个入口，但塞在引擎配置里让 Turn 的输入面变宽。
- **待完善**：二选一——(a) 把 `setup` 正式写入 spec/Turn.md 并明确契约；(b) 更优：抽 `createBattle(units, config)` 装配层，Turn 保持 `runTurnEngine` 干净，`setup` 由装配层在调用前完成注册（当前 `simulateBattle` 已经是这个装配层的雏形）。

### 12. 生产装配集中在 `combat.ts`，缺少 Battle 工厂

> ✅ 已由 combat-entity 完成。

- **现状**：`simulateBattle` 负责 `combatantToTurnUnit`、`collectPassiveBuffConfigs`、`createBattleContext`、`applyPassiveAbilities`、`abilityRuntime.setup`、`canActWithBuffs` 全套编排；四个战斗入口都通过它间接使用 Turn。
- **妥协点**：Turn 引擎本身干净，但调用方装配逻辑重；想复用同一装配（例如回放、离线、测试）只能 import 带经济结算壳的 `simulateBattle`。
- **待完善**：抽 `createBattle(units, config)` 返回 `{ run, context }`；`simulateBattle` 变成「装配 + 跑 + 映射 `BattleResult`」的薄封装。

### 13. 两套战斗单位形状并存

> ✅ 已由 combat-entity 完成。

- **现状**：`CombatantState`（旧：attack/defense/hp/maxHp + snapshot + abilities）与 `BattleUnitSnapshot`（Turn 输入）并存，`combatantToTurnUnit` 做转换；旧 `recomputeCombatant` / `ActiveBuff` 体系仍在使用 `CombatantState`。
- **妥协点**：实体模块落地后应当只有「实体 → BattleUnitSnapshot」一条路；目前双轨改一处容易漏另一处。
- **待完善**：随 Entity effort 收敛 `CombatantState`；在收敛前把 `combatantToTurnUnit` 作为唯一转换点并补单测。

### 14. canAct 汇总只查 stun

- **现状**：生产 `canAct` 实现是 `combat.canActWithBuffs`，只 `getBuff(unitId, 'stun')`。
- **妥协点**：Turn 正确地把 canAct 做成了谓词注入，但「无法行动」的汇总目前只有一个控制来源，且长在 `combat.ts` 而不是 Buff 模块。
- **待完善**：Buff 模块提供统一的 `canAct(ctx, unit)` 汇总（stun/封锁/机制），`combat.ts` 只透传。

### 15. UI 消费端仍是最小实现

- **现状**：`CombatEventLog` 静态列出全部事件，没有逐条播放/倍速/暂停/跳过/完成停留；`battleEventPresentation` 的注册表已让新事件键可扩展，但 `effectApplied` presenter 仍是 switch（新 EffectKind 要同步，见 `After/Effect.md` 第 6 条）。
- **妥协点**：信息轮播 UI 按 spec 属 UI 模块 out of scope，当前只是「事件流数据源」的最小消费证明。
- **待完善**：轮播 UI effort 基于事件流做真正的播放器；届时确认事件流是否需要补充「节奏/时间」信息（见第 8 条）。

### 16. 边界条件与参数校验缺口

- **现状**：引擎测试覆盖排序/轮次/死亡/canAct/召唤/订阅/强制结束/确定性；但缺少空输入、重复 id、`maxRounds: 0`、入场即死单位、召唤覆盖已有 id 等边界。
- **妥协点**：`unitMap.set` 对重复 id 静默覆盖，`summonUnit` 同样会覆盖已有单位；调用方只能自律。
- **待完善**：补参数校验（至少对重复 id 抛错或返回失败）与边界测试，并把重复 id 的预期行为写入文档。

## 建议处理顺序

1. **低风险收口**：先机取整（#2）、`register` 返回句柄（#7）、`summonUnit` 来源参数（#6）、重复 id 校验（#16）。
2. **文档/口径对齐**：把「取队首即锁定本轮」「setup 契约」「单队列实现形态」写回 Turn.md/spec（#3、#11、#1）。
3. **数值收口**：Turn 与 Effect 的取整/钳制单一职责（#5），补统一 hp 入口（#4）。
4. **装配层重构**：抽 `createBattle`（#11、#12），随 Entity effort 收敛 `CombatantState`（#13），Buff 模块接管 canAct 汇总（#14）。
5. **体验/规模**：轮播 UI 正式播放器（#15），事件流 phase 或双视图（#8），debug 快照瘦身（#9），类型解耦（#10）。
