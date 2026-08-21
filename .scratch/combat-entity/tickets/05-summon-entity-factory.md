# 05 — 召唤物工厂与 Effect seam

**What to build:** 召唤效果不再内嵌原始 Turn 快照，而是通过实体配置引用 + createEntityFromConfig 工厂生成召唤实体后入队。

**Blocked by:** 03 — 运行时 BattleEntity 与唯一转换缝

**Status:** resolved

- [x] `createEntityFromConfig(configRef, { side, id })` 工厂落地，可从配置引用生成 BattleEntity。
- [x] 召唤效果参数从 `BattleUnitSnapshot` 改为配置引用（EntityConfigRef），执行时经工厂生成实体再转换入队。
- [x] 召唤物 side 显式继承召唤者同侧；召唤物 id 沿用 Effect/Turn 现有约定生成（本票不修 id 唯一分配与事件 sourceId）。
- [x] 召唤相关测试按新 seam 通过；Ability/Buff 测试不受破坏。
