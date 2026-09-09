# 解锁模型：哪个维度锁什么

Type: grilling
Status: resolved

## Question

技能解锁条件的表达形状？等级/星级/觉醒分别怎么参与？

## Answer

- 每个技能声明式 `unlock` 条件对象：`{ level?, stars?, awakened? }` 可组合（AND 语义）。
- 默认约定：槽位 1 出生即解锁；槽位 2 等级门槛（默认 Lv.10 起步，走调参面再改）；觉醒技 = awakened。
- 星级是否参与解锁由内容决定而非硬编码。
- 解锁状态是运行时派生值，不写入存档——无迁移负担。
