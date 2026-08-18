# 01 — Turn setup 钩子

**What to build:** 回合引擎在创建运行时之后、第一轮开始之前调用一次初始化钩子，让上层能在首个回合开始前组装战斗上下文并注册时机订阅。`maxRounds <= 0` 时也调用一次；该钩子只能做注册/组装，不派发事件、不改动生命或先机，事件流仍从第 1 轮开始。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 初始化钩子存在，并在队列排序后、主循环前调用一次。
- [ ] `maxRounds <= 0` 时仍调用一次，随后不进入任何轮次。
- [ ] 钩子内可注册/注销时机订阅；事件流仍从第 1 轮 `roundStart` 开始。
- [ ] 测试覆盖：调用一次、`maxRounds = 0` 边界、钩子内注册的首个 `turnStart` 订阅被触发。
