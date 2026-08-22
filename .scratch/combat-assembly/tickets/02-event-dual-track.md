# 02 事件双轨清偿

Status: resolved

## 内容

决策依据：combat-aftermath 05 号票 M2，已写回 docs/combat/Ability.md 事件定位节。

1. `abilityRuntime` 的 attackAfter data 瘦身：删除 `kind:'attack'|'skill'`、`skillName`、`fireCount`（fireCount 传播属挂起内容项，见 roadmap 桶 D），仅保留 `{ damage }`——事件本体保留（折焰类 Buff 订阅用）。
2. 测试迁移：awakening.test.ts 三处断言改走 `abilityUsed`（abilityId/targetIds）与 `effectApplied`（values.damage）；abilityRuntime.test.ts 保留 attackAfter 存在性断言。

## 验收

- 生产代码零 `skillName` 引用；展示层零改动
