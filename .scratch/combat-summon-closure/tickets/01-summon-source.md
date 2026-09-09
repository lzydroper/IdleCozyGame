# 01 summonUnit 来源参数

Type: task
Status: resolved

## 内容

T#6：`summonUnit(snapshot, sourceId?)` 来源参数；summon 事件 sourceId = 真正召唤者（缺省才是自身）；executeSummon 透传 effect.sourceId。

## Answer（实施记录）

- turnEngine：接口 + 实现 + fixture 同步；测试「summon 事件来源 = 显式 sourceId」通过。
- effectSystem.executeSummon 调用处 `summonUnit(toTurnUnit(named), effect.sourceId)`。
- 效果系统断言：summon 事件 `e.sourceId === 'a'`（召唤者）✓。
