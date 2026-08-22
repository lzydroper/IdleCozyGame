# 02 运行时唯一 id 分配

Type: task
Status: resolved

## 内容

E#3：`TurnRuntime.generateUnitId(base)` 唯一 id 分配（base 空闲原样、冲突追加 -N）；executeSummon 弃用 targetId-N 手工拼接——首个沿用 effect.targetId（冲突即抛错），后续走 generateUnitId。

## Answer（实施记录）

- turnEngine：接口 + 实现 + 测试「generateUnitId：base 空闲原样返回，冲突追加 -N」通过。
- effectSystem.executeSummon 重写 id 逻辑；fixture 与两处测试桩同步成员。
