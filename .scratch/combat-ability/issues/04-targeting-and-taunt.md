# 04 — 目标选择策略与嘲讽覆盖

Type: grilling
Status: resolved
Blocked by: 01

## Question

第一版 targeting 模型如何定？

1. 策略集合是否为纯确定集合：`enemy:first` / `enemy:all` / `enemy:lowestHp` / `ally:self` / `ally:lowestHpPercent` / `ally:all`？是否首版不引入随机目标？
2. taunt 覆盖：单目标进攻若敌方存在 taunt 标记 > 0，是否改选 taunt 最高者（同值按入场序）；`enemy:all` 是否不受 taunt 影响？
3. 选择器是否为纯函数 `selectTargets(unit, battle, targeting): BattleUnitRuntime[]`，供主动 Ability 与测试直接调用？
4. 无有效目标时：该主动 Ability 是否视为不可用（不选、不扣费、不进冷却）？

产出：targeting 策略类型与纯函数选择器契约。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 策略集合**：纯确定集合 `enemy:first` / `enemy:all` / `enemy:lowestHp` / `ally:self` / `ally:lowestHpPercent` / `ally:all`；首版不引入随机目标。
- **D2 taunt 覆盖**：单目标敌方选择若存在 taunt 标记 > 0，改选 taunt 最高者（同值按入场序）；`enemy:all` 不受 taunt 影响。
- **D3 选择器**：纯函数 `selectTargets(unit, battle, targeting): BattleUnitRuntime[]`，供主动 Ability 与测试直接调用。
- **D4 无目标**：该主动 Ability 视为不可用（不选、不扣费、不进冷却）。
