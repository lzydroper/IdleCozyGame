# 05 applyHpDelta 统一入口

Status: resolved

## 内容

决策依据：triage T#4（低优随批顺带）。

1. `TurnRuntime.applyHpDelta(targetId, delta, sourceId?, data?)`: 正负双向、0/maxHp 双钳制、hp 归零时 death 一次性派发（死亡单位不重复结算）；dealDamage/applyHeal 保持特化不动。
2. 为未来 dot/护盾吸收/处决/复活提供受控 seam；本批不加调用方。

## 验收

- 新增单测：正负 delta 钳制、死亡派发一次、对死亡单位操作返回 0
