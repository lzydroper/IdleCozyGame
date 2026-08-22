# 04 executor 收敛与 fixture 抽取

Status: resolved

## 内容

> **实施记录**：
> ① E#6 收敛完成——`EFFECT_EXECUTORS: Record<EffectKind, EffectExecutor>` 注册表落地 effectSystem.ts（每 kind 一条：immunityFlag / before / during / present），applyBefore 共享审核流（有效性/二元抵抗/免疫键/参数修正经 env）+ executeDuring 单行分派；`defineExecutor<K>` 按 kind 定型包装器消除条目内 cast；battleEventPresentation 的 effectApplied presenter 改为消费注册表 `present()`，展示文案与执行语义同表维护。**新增 EffectKind 现在只改一处。**
> ② E#7 抽取完成——新增 `src/state/testFixtures/battleRuntime.ts`（`makeBattleUnit` 含 statParams 镜像、`makeFakeRuntime` Map 型单位表 + 事件捕获 + 功能性 dealDamage/applyHeal/summon 事件）；effectSystem / battleContext / abilityPassive / abilityResource / abilityResolveStats 五文件以薄别名接入，本地重复桩删除（约 120 行 → 5 行别名）。combat.test 与 buffRuntime.test 的特化桩按域保留。
>
> 注：summon 测试断言由「本地 Map 变异」改为「ctx.turn.getUnit 查询」，与 fixture 的单位表所有权一致。

决策依据：triage E#6 / E#7。本批最大重构，放最后单独做。

1. **EffectKind 分派收敛**（E#6）：applyBefore（参数修正）/ executeDuring（执行）/ battleEventPresentation presenter 三处 switch 收敛为每 kind 一个 executor 对象（before/during/present），新增 EffectKind 只需改一处注册表。
2. **共享测试 fixture**（E#7）：battleContext.test 与 effectSystem.test 各自的 fake runtime / 单位工厂抽取为共享模块（如 `src/state/testFixtures/`）。

## 验收

- 新增一个假想 EffectKind 时只需扩展单一注册表（以注释或测试演示）；两套 fixture 合一；全量单测通过
