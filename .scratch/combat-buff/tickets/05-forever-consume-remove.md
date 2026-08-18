# 05 — forever 层数消耗与自动移除（折焰）

**What to build:** forever Buff 支持按触发消耗层数：配置声明消耗开关后，每次触发层数减 1 并触发对应效果；层数归零自动移除并注销触发。折焰端到端：目标攻击后消耗 1 层并附加伤害，耗尽后 Buff 消失。

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [x] 消耗开关为 true 的 forever Buff，每次触发层数减 1。
- [x] 层数归零即移除实例并注销全部时机订阅。
- [x] 折焰在目标攻击后触发附加伤害，层数逐次递减。
- [x] fireCount 放大不额外消耗层数，层数变化只来自显式消耗与 Stack。
- [x] 测试：消耗递减、归零移除、折焰端到端、fireCount 与层数解耦。
