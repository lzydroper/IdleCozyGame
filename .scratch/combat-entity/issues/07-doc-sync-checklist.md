# 07 — After/*.md 文档勾除清单

**Type:** task
**Status:** resolved

## Question

实施 Entity effort 时，需要同步勾除哪些 After/*.md 将就项？

## Answer

直接勾除：

- After/Turn.md #11（setup seam 契约）、#12（createBattle）、#13（两套战斗单位形状并存）、#10（BattleUnitStatParams 类型解耦）
- After/Ability.md #1（BattleUnitAbility 强类型）、#9（collectHeroAbilities 返回 ResolvedAbility[]）、#14（BattleUnitStatParams 位置）、#12（statParams 克隆重复）

不勾除（后续票）：

- After/Effect.md #3（召唤 id 分配）
- After/Turn.md #6（召唤事件来源）
- After/Effect.md #7（fixture 去重）
