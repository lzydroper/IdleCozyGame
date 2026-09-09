# 03 — Trigger 注册与 canTrigger 归属判定

**What to build:** Buff 挂载时按配置的 Trigger 数组注册到对应时机，注册键为（时机, 单位）；Trigger 用 target/source 表达关注目标单位还是来源单位；时机派发时 canTrigger 接收当前回合归属判定是否命中，未命中不计算；Buff 移除时注销其全部时机订阅。用无 Modifier 的 forever Buff 证明触发端到端。

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Trigger 条目形状落地：timing 取回合时机分类学，unitRef 仅 target/source。
- [x] 挂载时按（时机, 单位）注册，避免全局事件乘全单位 Buff 的过滤。
- [x] canTrigger(ctx, timingKey, currentOwnerId) 对命中/未命中返回正确布尔。
- [x] Buff 移除时注销其全部订阅，不残留可触发回调。
- [x] 一个 forever Buff 在其关注时机触发一次，无关单位或无关时机不触发。
- [x] 测试：注册键、unitRef 解析、canTrigger、挂载注册/移除注销、无 Modifier 触发端到端。
