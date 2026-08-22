# 05 槽位推荐字段

Type: task
Status: resolved

## 内容

U#4 引擎侧：summon 事件 data 附带推荐 `targetSlotIndex`（表现层消费归批次④ combat-experience）。

## Answer（实施记录）

- turnEngine.summonUnit 事件 data 新增 `targetSlotIndex`：同侧第 N 个空位启发式（英雄侧槽 0-2、敌方侧 3-5，按存活同侧单位数取位）。
- 测试：英雄侧已有 a 时召唤 s1 → 推荐槽位 1 ✓。
- UI 消费（BattleModal 弃用贪婪 findIndex）留待批次④。
