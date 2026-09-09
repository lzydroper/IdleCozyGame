# 双轨消除策略（核心主线）

Type: grilling
Status: resolved
Blocked by: 01

## Question

十余条将就项的共同根源是新旧体系并存。拍板消除的顺序、切分与退役路径：

- **Buff 双轨**（Buff §5、Effect #1）：**分诊核验修正**——旧 `buffSystem.ts` 已是零生产引用的孤儿（仅自身测试引用），`recomputeCombatant` 已消失，`heroToCombatant` 直接产出 BattleEntity。残余工作降级为「删除孤儿代码与测试 + 确认面板/重算路径无遗留依赖」（实施桶 A），本票不再需要迁移策略决策。
- **动态 Modifier 生效链路**（Buff §4.4 / Ability #4 / #7，分诊新增，用户已裁归本票）：战意类 stat Modifier 只写入 BattleContext，战斗中单位面板不基于它重算——加成实际无效（隐性正确性缺陷）。拍板生效机制：resolveStats 回写/缓存失效 vs 面板变化事件 vs unit.stats 明确降级为纯展示；同时覆盖被动编译读静态 `source.stats`（abilityPassive）不经过 resolveStats 的问题。
- **事件展示双轨**（Ability #8）：`attackAfter` 带旧 `kind` 数据兼容旧测试/展示 vs `abilityUsed`+`effectApplied` 主事件——迁移步骤，以及 `attackAfter` 的最终定位（仅保留给「攻击后」触发类 Buff？）。
- **装配收口**（Turn #11 / Entity #12）：`TurnConfig.setup` 前移到装配层（createBattle 在 runTurnEngine 前完成注册，setup seam 移除），还是正式写入契约？二选一。
- **入口统一**（Entity #11）：敌人 / 梦魇 / 召唤物三入口收口为一个 `resolveEntity(configRef | id | config)` 公开入口的时机与形态。
- **基础攻击显式化**（Entity #3）：basic_attack 维持隐式兜底 vs 显式声明/可替换，英雄 / 敌人 / 召唤物走同一规则。

本票结论直接决定路线图中结构类 effort 的切法。

## Answer

五项全部拍板（HITL grilling，全票推荐案通过），含一项重大前提修正：

**前提修正（核验发现）**：动态面板主链路**已经打通**——`performAction` 每动作新鲜调用 `battle.resolveStats(unit.id)`（abilityRuntime.ts:46），resolveStats 走完整三层引擎（含元属性折算与动态 Modifier 聚合）。Buff §4.4「战意加成实际无效」是 combat-ability 接入 battle-stats-resolve-seam 之前的陈旧记载。真实残余缺口收窄为三处：applyHeal 钳制读静态 `target.maxHp`（turnEngine.ts:381）、被动编译读静态 `source.stats`、无 statParams 单位整体回退快照（battleContext.ts:220）。

- **M1 动态面板 = resolveStats 唯一权威 + 补齐残余**：确立「战斗数值一律经 resolveStats 即时解析」为不变式；补齐上述三处；`unit.stats` 定位=入场快照仅兜底；不加缓存（3v3 每动作一次现算可接受）。
- **M2 事件双轨 = attackAfter 定位纯内部触发通道**：展示与测试基准 = `abilityUsed`+`effectApplied`（展示层已自动静默 attackAfter，旧 kind/skillName 字段仅测试消费——核验属实）；字段随桶 A 瘦身删除、测试迁移。
- **M3 装配收口 = 引擎拆分·setup 删除**：`runTurnEngine` 拆为 `createTurnRuntime(units, config)` + `runtime.run()`，createBattle 在 run 前完成构建与注册，`TurnConfig.setup` seam 删除。
- **M4 入口统一 = resolveEntity 单一入口**，随桶 C 召唤闭环一并实施。
- **M5 basic_attack = 缺省注入 + 可显式覆盖/清空**：三种实体同一规则，零数据迁移解锁表达力；配置校验兜底非法覆盖。
- **Buff 双轨**（分诊已降级）：确认按桶 A 孤儿删除处理，无需迁移策略。

**写回已完成**：
1. `.scratch/combat-turn/spec.md` — Further Notes 增补装配 seam 修订（引擎拆分、setup 删除）。
2. `docs/combat/Turn.md` — 数值口径节增补「resolveStats 唯一权威」不变式与三处残余。
3. `docs/combat/Ability.md` — 新增「事件定位定稿」节（attackAfter 纯内部通道、遗留字段删除计划）。
4. `docs/combat/Entity.md` — 新增「装配口径」节（basic_attack 规则、入口统一方向）。

**产生的实施项**：桶 A（孤儿 buffSystem 删除、heal 钳制修正、被动解析化、attackAfter 瘦身+测试迁移、引擎拆分去 setup）、桶 C（resolveEntity 收口随召唤闭环）——由路线图 06 号票排位。
