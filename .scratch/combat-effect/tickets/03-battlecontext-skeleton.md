# 03 — BattleContext 骨架

**What to build:** 在回合运行时之上组装战斗上下文：把回合原语、统一 Modifier 注册表、Buff 占位操作与战斗标记聚合到一个对象，作为效果与后续 Buff/Ability 的唯一依赖。

**Blocked by:** 01 — Turn setup 钩子；02 — 统一 Modifier 核心与适配器

**Status:** ready-for-agent

- [ ] 战斗上下文可在初始化钩子内由回合运行时与初始战斗态组装。
- [ ] Modifier 注册表支持按单位新增（返回句柄）、按句柄移除、按命名空间查询。
- [ ] Buff 操作占位契约齐全：应用、移除、按 id 查询、按单位列出。
- [ ] 战斗标记操作占位契约齐全：设置、读取。
- [ ] 测试用 fake 运行时覆盖注册表增删查与标记读写。
