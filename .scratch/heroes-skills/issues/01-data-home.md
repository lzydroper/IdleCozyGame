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

## Comments

**v1.2 修订（用户裁定：内联直配）**：Answer 中「行内引用全局注册表 abilityId」的决议被推翻——商榷查明复用纯属理论（注册表仅 basic_attack + 9 awaken 内联体，敌人零引用），且 awaken.json 早有内联先例。新决议：三行能力本体逐行内联（`ability` 字段），`abilityId`/`overrides` 移除；注册表降级为派生运行时索引（combat.loader 合并 + 重复 id 守卫）；觉醒技本体迁入槽 3，`AWAKEN_CONFIG.abilityId` 从槽 3 派生，旧英雄双轨兼容。详见 spec v1.2 修订注。
