# combat-assembly · 装配与事件收口批

> 来源：`../combat-aftermath/roadmap.md` 批次②。依赖批次① combat-hygiene（已完成）。
> 决策权威：combat-aftermath 05 号票（M1/M2/M3）、04 号票（数值口径）、triage（E#6/E#7/T#4）。

## 目标

结构类双轨清偿、引擎形态定型：`createTurnRuntime + run()` 拆分并删除 setup seam；attackAfter 瘦身为纯内部触发通道；动态面板三处残余补齐（resolveStats 唯一权威）；EffectKind executor 收敛与 fixture 抽取；applyHpDelta 受控入口。

## 实施票

| 票 | 内容 |
|---|---|
| [01 引擎拆分与 setup 删除](tickets/01-engine-split.md) | createTurnRuntime+run、setup seam 删除、装配前移 createBattle |
| [02 事件双轨清偿](tickets/02-event-dual-track.md) | attackAfter 数据瘦身、测试迁移 abilityUsed/effectApplied |
| [03 动态面板残余](tickets/03-dynamic-stats-residual.md) | heal 钳制解析化、被动动作时解析、无 statParams 回退收紧 |
| [04 executor 收敛与 fixture 抽取](tickets/04-executor-fixture.md) | EffectKind 三处 switch → 对象表、共享测试工厂 |
| [05 applyHpDelta](tickets/05-apply-hp-delta.md) | 统一 hp 变更入口：钳制 + death 一次性派发 |

顺序：01 → 02/03 可并行 → 05 → 04（最大重构放最后）。
