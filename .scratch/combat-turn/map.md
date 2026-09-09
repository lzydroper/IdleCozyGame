# 战斗回合系统重构（combat-turn）— Wayfinder Map

## Destination

锁定「Turn（回合系统）」模块的设计决策集，并产出一份可直接交给 `/to-spec`、`/to-tickets` 的实现规格：回合流程、时机（事件）系统、先机与行动队列的全部决策敲定，实现者拿到后无需再拍板即可编码。**仅覆盖 Turn 模块**；Effect / Buff / Ability / Entity / Level / UI / Offline 各自另立 effort。

## Notes

- **领域**：战斗回合制（由 ADR-0002 的「轮询回合制」演进为「先机驱动回合制」）、时机/事件系统、属性快照。
- **技能**：`grilling`、`domain-modeling`；决策全部解决后接 `to-spec`（出规格）→ `to-tickets`（出实现票）。
- **既定约束（不可推翻）**：
  - `docs/combat/Turn.md` 已给出先机公式、时机分类学与回合状态机草图，作为讨论基线，可被本 effort 的决策修订。
  - 本 effort 只出**决策与规格**，不产实现代码。
- **已确认的用户决策（chart 阶段）**：
  - 目的地形态 = **决策集 + 可交付规格**（不直接实现）。
  - 范围 = **仅 Turn 模块**；其余 7 模块 out of scope。
  - **目标选择（集火/嘲讽/被攻击优先级）属于 Ability 模块**，移出本 map。
  - 存档/测试迁移原则：游戏未发布、无真实旧存档，**不向后兼容**；旧测试不符新功能一律删除（见 `docs/combat/readme.md`）。
- **现状（chart 侦察结论）**：
  - `src/state/combat.ts#simulateBattle` 现为「英雄固定顺序 → 敌人固定顺序」轮询，无先机、无时机系统；技能冷却按自身行动轮计。
  - 无时机（事件）注册/派发机制；Buff / Effect / Ability 尚无运行时骨架。
  - 伤害公式现状 `dealDamage = max(1, atk - def)`，与 `combatEngine.calculateDamage` 的 `DEF/(100+DEF)` 并存（后者未接入生产）——公式本身属 Effect/伤害结算，本 map 不决策，仅记录。
- **关键文件**：`src/state/combat.ts`（`simulateBattle`/`CombatantState`）、`src/state/statSystem.ts`（快照/面板计算）、`src/types/game.ts`（`BattleResult`/`BattleAction`）、`docs/combat/Turn.md`。
- **测试**：`src/state/combat.test.ts` 现有轮询/技能冷却测试将在实现阶段按新语义改写或删除（用户决策）。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [回合系统词汇对齐](issues/01-vocabulary-alignment.md) — 定名：轮次(Round)/回合(Turn)、时机(Timing)/事件(Event)、先机(Initiative)；「轮询回合制」改写为「先机回合制(Initiative Turn)」；CONTEXT.md 战斗小节术语已更新。
- [Turn 引擎输入边界](issues/02-turn-input-boundary.md) — Turn 收已结算的全量战斗单位快照（id/name/faction/hp/maxHp/initiative/abilities/stats），只做流程与时机；生产归 Entity/statSystem；入场建一次性可变运行时单位，战后整体丢弃。
- [Turn 引擎确定性边界](issues/03-determinism-boundary.md) — Turn 纯确定性、不接触 RNG；RNG 函数参数注入（上层供种子）；**删除回放功能**（CombatPlaybackView/hpTrack），只保留战斗信息轮播，`BattleResult.actions` 演进为事件流（展示数据源 + 测试断言）。
- [轮次上限与平局](issues/04-round-limit-and-draw.md) — 保留可配置轮次上限（默认 60）；超限=平局（无奖励无重伤）；Turn 维护「强制结束标记+结果(victory/defeat/draw)」通道，终止条件封闭集合 = 全灭/超限/强制结束。
- [行动队列实现](issues/05-action-queue.md) — 单优先队列 + 轮次分隔标记（非双队列）；先机变动只重排未行动区间（一轮一次行动）；支持中途插入到未行动区（排位归 07）；确定性 = 全序排序键(06) + 固定遍历。
- [同先机排序规则](issues/06-initiative-tie-breaker.md) — 排序键 = (先机 降序, 入场序 升序)；入场序全局单调（英雄上阵序→敌人配置序→召唤序）；严格全序、无并列。
- [召唤物入场排位](issues/07-summon-placement.md) — 召唤物入本轮「未行动区」按先机排位（不插队），本轮必行动一次；先机单独计算 = 100 + fixval（agility 按 0 处理、不使用实际敏捷），面板其余属性以被召唤实体真实配置为准；入场序按召唤序续号。
- [回合进行中子流程](issues/08-turn-in-progress-flow.md) — Turn 只驱动骨架（回合进行中=调用单位行动入口），选能力/选目标/派发效果归 Ability；普通攻击=兜底 Ability；细粒度事件在效果结算/行为完成时即时派发；确定性=固定骨架+固定派发序+种子化 RNG。
- [死亡时机结算规则](issues/09-death-timing.md) — 阵亡单位跳过其后所有主时机、只派一次「死亡」事件；死于己方回合不结算「回合结束后」；死亡判定在「取出队首单位时」读当前状态（非预过滤，尊重复活）；存活是结算主时机的必要条件。
- [无法行动判定](issues/10-can-act-predicate.md) — Turn 只提供 canAct 谓词（Buff 汇总，不硬编码枚举）；无法行动只跳过「回合进行中」，开始前/结束后仍结算；canAct 在回合开始前结算后判一次、本回合不变；先判死亡再判 canAct。
- [先机调试可见性](issues/11-initiative-visibility.md) — 测试断言为主 + dev 事件流调试字段；不进玩家 UI；不单独做 debug 面板。
- [时机/事件订阅接口](issues/12-timing-event-subscription.md) — 订阅键=(时机/事件, 单位|全局)；FIFO 固定；同时机内再注册延后到下次结算；上下文含 key/归属单位/来源/目标/运行时引用。

## Not yet specified

<!-- fog：转向本 destination 但尚无法精确提问的决策，待 frontier 推进后毕业为 ticket -->

（无剩余 fog —— 时机订阅接口已随 08 毕业为 ticket 12，现已解决。）

## 🏁 地图完成

combat-turn 全部 12 张 tickets 已解决，Turn 模块决策集完整，way 到 destination 已清晰，可交给 `/to-spec`（出规格）→ `/to-tickets`（出实现票）。

**Destination 达成**：Turn = 纯确定性流程引擎，接收已结算的全量战斗单位快照，只负责轮次/回合流程与时机/事件系统；术语（轮次/回合/时机/事件/先机/先机回合制）已入 CONTEXT.md。

**决策集速览**：① 词汇对齐 ② 全量快照输入 ③ 纯确定性+删回放 ④ 轮次上限+平局+强制结束 ⑤ 单队列+轮次标记 ⑥ 全序排序键 ⑦ 召唤排位 ⑧ 回合进行中契约 ⑨ 死亡时机 ⑩ canAct 谓词 ⑪ 先机可见性 ⑫ 时机/事件订阅接口。

## Out of scope

- **Effect / Buff / Ability / Entity / Level / UI / Offline 七个模块** —— 各自另立 effort。
- **目标选择（集火 / 嘲讽 / 被攻击优先级）** —— 用户判定属 Ability 模块。
- **伤害 / 暴击 / 减伤公式本身** —— 属 Effect/伤害结算，本 map 只记录现状、不决策。
- **存档迁移 / 旧测试兼容** —— 不向后兼容旧存档；旧测试不符新功能一律删除（用户决策）。
