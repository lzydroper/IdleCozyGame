# 05 引擎边界与配置校验

Status: resolved

## 内容

> **进展（首会话）**：第 1/2/3 项已完成并验收——重复 id 校验（入场+召唤抛错）、边界测试三条、debug 快照仅附 roundStart/turnStart、createBattle.context 经 getBattle 守卫。
> **剩余**：第 4（配置校验 seam）/ 5（BattleFlag/EffectParamKey 类型收紧）/ 6（未消费接口清理）/ 7（残留 cast）。
>
> **二会话补完（全部 7 项完成）**：④ 配置校验——resolveEnemyAbilities 引用缺失改抛错、basic_attack 显式校验、`validateCombatConfigIntegrity()` seam + 新测试文件；⑤ EffectParamKey 收敛为常量 union；⑥ 删除 isEffectTarget/filterModifiersByNamespace/BattleContextInitialState/rng 转发（四处调用点同步）；⑦ 两处 `as unknown as` 强转移除。

决策依据：triage T#9 / T#16 / En#4 / En#7 / En#9 / E#5 / E#8 / A#1 残余。

1. 重复 id 校验（T#16）：unitMap.set 前查重抛错；summonUnit 同样；补边界测试（空输入、maxRounds:0、入场即死）
2. debug 快照瘦身（T#9）：queue 快照只附 roundStart/turnStart
3. `createBattle.context` 契约（En#7）：battle 声明 `BattleContext | undefined`，getter 未初始化抛明确错误
4. 配置校验 seam（En#4/#9）：basic_attack 必存在、abilityId 可解析（敌人引用缺失改报错而非静默 continue）、AbilityRef.overrides 字段合法性；至少测试级 seam
5. 类型收紧（E#5）：BattleFlag 收敛为模板字面量 union、EffectParamKey 结构化
6. 未消费接口清理（E#8）：isEffectTarget、filterModifiersByNamespace（含其测试）、BattleContextInitialState、rng 转发按需删除
7. 残留 cast 清理（A#1 残余）：abilityRuntime.ts:48、abilityPassive.ts:58 的 `as unknown as ResolvedAbility[]`

## 验收

- build + 全量单测通过；oxlint 通过
