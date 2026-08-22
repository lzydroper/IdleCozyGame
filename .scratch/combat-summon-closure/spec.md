# combat-summon-closure · 召唤闭环批

> 来源：`../combat-aftermath/roadmap.md` 批次③。依赖批次② combat-assembly（已完成）。
> 决策权威：combat-aftermath 05 号票（M4）、triage 合并条目（E#3+T#6+En#8）、A#6、En#2、U#4 引擎侧。

## 实施票

| 票 | 内容 |
|---|---|
| [01 summonUnit 来源参数](tickets/01-summon-source.md) | `summonUnit(snapshot, sourceId?)`、summon 事件来源修正、executeSummon 透传 |
| [02 运行时唯一 id 分配](tickets/02-unique-id.md) | generateUnitId seam、executeSummon 弃用 targetId-N 手工拼接 |
| [03 召唤落地 seam](tickets/03-summon-enter-seam.md) | 召唤物冷却 tick + 被动编译注册（A#6）、registerBuffConfigs |
| [04 resolveEntity 收口](tickets/04-resolve-entity.md) | 单一公开入口、EntityConfigRef 扩展 hero、enemiesToEntities 转薄壳 |
| [05 槽位推荐字段](tickets/05-slot-hint.md) | summon 事件附 targetSlotIndex（同侧空位启发式，UI 侧批次④消费） |

顺序：01+02 → 03 → 04 → 05。
