# 数据归属：英雄三技能的配置结构

Type: grilling
Status: resolved

## Question

三个英雄技能槽位的配置住在哪？觉醒技要不要从 awaken.json 迁出统一管理？

## Answer

- 每英雄一张表 `src/data/entities/heroes/<id>/skills.json`，row 数组、**永远恰好三行**：
  - 槽位 1 / 槽位 2：引用全局能力注册表的 abilityId（与敌人使用的 `AbilityRef { abilityId }` 同构），可选 overrides；
  - 槽位 3：引用本英雄 `awaken.json` 内联能力的 abilityId。
- 觉醒技**本体**留在 awaken.json 不迁移（与觉醒素材、觉醒名同生命周期）；`unlock / growth / milestones` 等成长元数据统一住 skills.json——一处看全，本体各回各家。
- 全局能力注册表（`ABILITY_CONFIGS`）仍是唯一效果真相源，不因英雄侧接入而改变。
