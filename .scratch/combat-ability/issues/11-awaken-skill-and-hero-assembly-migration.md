# 11 — 觉醒技能迁移与英雄能力装配

Type: grilling
Status: resolved
Blocked by: 02, 03

## Question

现有觉醒技能如何迁入 abilities 配置注册表，英雄能力列表如何装配？

1. `src/data/abilities.ts` 是否定义 `basic_attack` + 每条觉醒技能（如 `awaken_nova`）？
2. `AwakenConfig.skill` 是否改为 `abilityId`，`getAwakenSkill` 改为返回 `AbilityConfig`（或解析后的 `BattleUnitAbility`）？
3. 是否新增 `collectHeroAbilities(hero, config, ...)`：`basic_attack` + 觉醒技能（若觉醒）+ 未来触发被动接入点，替换 `combatantToTurnUnit` 手工映射？
4. `createDefaultActionExecutor` / `DefaultAbility` 是否删除或收编？

产出：迁移方案与 `collectHeroAbilities` 装配函数契约。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 配置迁移**：`src/data/abilities.ts` 定义 `basic_attack` + 每条觉醒技能（如 `awaken_nova`）。
- **D2 AwakenConfig**：`AwakenConfig.skill` 改为 `abilityId`；`getAwakenSkill` 改为返回 `AbilityConfig`（或解析后的 `BattleUnitAbility`）。
- **D3 装配函数**：新增 `collectHeroAbilities(hero, config, ...)` = `basic_attack` + 觉醒技能（若觉醒）+ 未来触发被动接入点；替换 `combatantToTurnUnit` 手工映射。
- **D4 旧适配器**：删除/收编 `createDefaultActionExecutor` 与 `DefaultAbility`。
