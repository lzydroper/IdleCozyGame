# 03 - 远征机制重设计

**What to build:** 重新设计远征--移除 4 个空产出救援地点，职业判定从 `SURVIVORS_CONFIG.role` 迁移为 `requiredHeroClass` / `requiredFaction`，口粮改地点配置驱动（出发消耗 + 持续消耗 + 耗尽自动召回），UI 改英雄卡片式 + 地点卡片式。校验内化到 `assignHeroToDuty`，UI 层不校验。

**Blocked by:** 01 - 后勤指派模型统一

**Status:** ready-for-agent

- [ ] `EXPEDITION_LOCATIONS` 移除 4 个救援地点（`green_ruins` / `signal_tower` / `collapsed_subway` / `military_depot`）
- [ ] `ExpeditionLocation` 接口重构：移除 `requiredRole`，新增 `requiredHeroClass?` / `requiredFaction?` / `rationCost?` / `rationConsumptionRate?`
- [ ] 现有地点门槛映射：subway_station->魂印、bio_lab/poison_factory->机械、ruined_armory->守护者
- [ ] `assignHeroToDuty` 的 explorer 分支：校验地点有效性 + heroClass/faction 匹配 + 扣 rationCost + 初始化 `shelter.expedition`
- [ ] `tick.ts` / `offline.ts` 远征结算增加持续口粮消耗（按 `rationConsumptionRate`），口粮耗尽时自动召回（调用 `assignHeroToDuty(heroId, null)`）
- [ ] 废弃 `getHeroRole`（`shelter.ts`），远征校验改查 `HEROES_CONFIG[heroId].heroClass` / `.faction`
- [ ] 远征 UI 改英雄卡片式选择（展示职阶/阵营/匹配状态）+ 地点卡片式选择（展示拾荒间隔/掉落表/门槛/口粮消耗）
- [ ] state 层测试：explorer 指派校验、口粮扣减、持续消耗、自动召回
- [ ] UI 层测试：英雄卡片选择、地点卡片选择、门槛匹配状态、已派遣/未派遣两态
