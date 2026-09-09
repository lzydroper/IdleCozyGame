# combat-hygiene · 战斗口径收口批

> 来源：`../combat-aftermath/roadmap.md` 批次①。全部条目为已拍板决策的机械落地，零新设计决策。
> 决策权威：combat-aftermath 04 号票（数值口径）、02 号票（控制语义）、05 号票（事件定位/装配）、triage-draft（桶 A/F 归组项）。

## 目标

把四簇拍板的口径规则全部落地并验收：伤害链单层取整、面板单一展平、先机整数化、眩晕快照制判定、canAct 集合化、双中断码、订阅句柄、引擎边界校验、Offline 三守卫；删除孤儿 buffSystem。

## 验收口径

- 全量单测通过（`npx vitest run`）；`npm run build` 通过
- 伤害链单层取整：公式层唯一 `Math.round`，dealDamage/applyHeal 只钳制
- `grep buffSystem` 生产引用为零（仅删除的文件自身）
- 先机/调试队列为整数口径
- 重复 id 抛错并有边界测试覆盖

## 实施票

| 票 | 内容 |
|---|---|
| [01 数值口径与展平统一](tickets/01-numeric-canonical.md) | 删三层 round、toBattleUnitStats、cloneStatParams、先机取整、体力存档规范化 |
| [02 眩晕快照判定与 canAct 集合化](tickets/02-stun-snapshot-canact.md) | canAct 前移、canActWithBuffs 迁移集合化 |
| [03 中断码扩展](tickets/03-interrupt-codes.md) | 新增 zeroed / sourceConflict 并接线 |
| [04 订阅句柄与 Buff 注册内聚](tickets/04-subscription-handles.md) | register 返回句柄、WeakMap 消除、removeBuff 回收、executeStun values、Modifier source helper |
| [05 引擎边界与配置校验](tickets/05-boundary-validation.md) | 重复 id 校验+边界测试、debug 瘦身、context 契约、配置校验 seam、类型收紧、接口清理、残留 cast |
| [06 Offline 守卫](tickets/06-offline-guards.md) | 单 Tick 上限、logs 滑动窗口、探索/挂机互斥 |

顺序：01 → 02/03 可并行 → 04 → 05 → 06（06 独立可随时插队）。
