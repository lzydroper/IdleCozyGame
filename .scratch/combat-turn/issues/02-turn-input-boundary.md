# 02 — Turn 引擎输入边界（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

Turn 引擎的输入是什么？候选：

- **A)** 接收**已结算的参战单位快照**（含单位 id、阵营、面板数值、先机值、Ability 列表等），Turn 只负责流程与时机，不负责计算属性/先机；
- **B)** Turn 自己计算属性与先机（把 statSystem 的职责纳入 Turn）。

子问题：

1. 快照需要携带哪些字段（id / 阵营 / 面板 / 先机 / 可行动性 / Ability 引用）？
2. 快照的**生产**（属性结算、先机初算）归上层（Entity/statSystem），Turn 只定义**消费契约**——此边界是否确认？（生产侧本身 out of scope）
3. 战斗中面板变化（buff 重算）时，Turn 依赖的是"快照 + 重算钩子"还是"每次取最新值"？

产出：Turn 引擎的入参契约（类型形状级），作为实现与测试的边界。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 快照 vs 自算**：选 **A** —— Turn 接收**已结算的参战单位快照**，只负责流程与时机，属性/先机计算归上层（Entity/statSystem）。
- **D2 快照字段（全量战斗单位）**：`id`（稳定标识）、`name`（显示名）、`faction`（阵营，胜负判定）、`hp`/`maxHp`（死亡判定+回放）、`initiative`（先机）、`abilities`（Ability 引用）、`stats`（完整面板：三层算好后的 attack/defense/maxHp/maxMp/critRate/critDmg + 特殊属性）。Turn 自身只消费 hp/initiative/faction/abilities 做流程，stats 是随行携带给 Ability 的数据——携带 ≠ 计算。否决「最小视图 + 外层注册表」。
- **D3 生产边界**：快照生产（属性结算、先机初算）归上层 Entity/statSystem，本 effort 只定消费契约，生产侧 out of scope。
- **D4 战斗内面板变化**：选 **A** —— 入场创建**一次性运行时战斗单位（可变）**，buff 经重算钩子更新字段，Turn 每次行动读当前值；「快照」仅用于入场创建 + 战后整体丢弃（与 readme「创建新战斗快照、自动恢复」一致）。
