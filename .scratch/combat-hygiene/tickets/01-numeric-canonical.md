# 01 数值口径与展平统一

Status: resolved

## 内容

决策依据：combat-aftermath 04 号票（N1/N2/N3/N6），规则已写回 `docs/combat/Turn.md` 数值口径节。

1. **删伤害链三层重复 round**（N1「公式层取整·下游只钳制」）：
   - `effectSystem.ts:97` calculateDamageAmount 的 round+MIN_DAMAGE 钳制**保留**（公式层）
   - `abilityRuntime.ts:111` 事件数据 `Math.round(params.amount)` 删除（数据来自已取整 values.damage）
   - `turnEngine.ts:359/381` dealDamage/applyHeal 内部 `Math.round` 删除，仅保留钳制
2. **抽 `toBattleUnitStats(calculated)` 单一展平函数**（N2）：`battleEntity.entityStats` 与 `battleContext.resolveStats` 共用；maxHp ≥ 1 钳制归 statSystem 计算层（:242 已有），展平层只 round——删除 resolveStats 的 `Math.max(1, …)`
3. **抽共享 `cloneStatParams` helper**（En#10/A#12）：`battleEntity.toTurnUnit` 与 `turnEngine.cloneSnapshotUnit` 共用
4. **先机出口取整**（N3）：`calculateInitiative` 出口 Math.round，测试同步整数口径
5. **体力存档规范化**（N6）：saveState 出口 stamina 保留两位小数，schema 不变

## 验收

- 全量单测 + build 通过；伤害相关测试断言不变（数值结果应完全一致）
- 新增/调整：toBattleUnitStats 单测或既有双路径断言合一
