# 03 中断码扩展

Status: resolved

## 内容

决策依据：combat-aftermath 02 号票 D2，已写回 combat-buff spec §3/§7、combat-effect spec §4。

1. `EffectResult.interrupted` 类型扩展：新增 `'zeroed'`（时长归零/提前结束）与 `'sourceConflict'`（不同 source 挂同种 Buff 被拒）
2. 接线：
   - stun 时长经 durationReduction ceil 后 ≤0 → interrupted 'zeroed'（现返回 'negated'，见 effectSystem.test.ts:275-277）
   - applyBuff source 冲突拒绝 → interrupted 'sourceConflict'（现为 'negated' 复用，定位 effectSystem/battleContext applyBuff 链路）
3. 测试断言同步更新。

## 验收

- 免疫仍为 'negated'；归零为 'zeroed'；冲突为 'sourceConflict'——三者测试互不混淆
