# 02 眩晕快照判定与 canAct 集合化

Status: resolved

## 内容

决策依据：combat-aftermath 02 号票（D1 快照制、D3 集合化迁移），已写回 combat-buff spec §7 与 docs/combat/Buff.md。

1. **canAct 快照前移**：`turnEngine.ts` 主循环把 `canActFn` 读数从 turnStart 派发之后（:479）移到之前（:472 settleTiming('turnStart') 前）；注释同步为快照语义。duration=1 眩晕应跳过 1 个自身回合。
2. **canActWithBuffs 迁入 Buff 模块**：函数从 combat.ts 移到 buffRuntime.ts，改为遍历 `CONTROL_KINDS` 控制类集合（`['stun']` 起步）；combat.ts 只 import 并透传给 TurnConfig.canAct。
3. 补测试：duration=N 严格跳 N 回合；眩晕期间 burn 等 turnStart 触发器仍正常结算。

## 验收

- 眩晕 off-by-one 用例翻转：duration=1 跳过当前回合
- combat.ts 不再包含控制枚举逻辑
