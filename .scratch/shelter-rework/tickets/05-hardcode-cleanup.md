# 05 - 硬编码清理与数据驱动化

**What to build:** 系统性清理 ShelterTab 及其依赖中的 8 类硬编码：英雄推荐标签移除、THEME_MAP 迁数据、默认值数据推导、文案归 constants、any 类型补类型、getUpgradeLevel 改 stateKey 数据驱动。

**Blocked by:** 04 - 分 tab 结构与组件拆分

**Status:** ready-for-agent

- [ ] 移除英雄推荐标签：`s === 'mei'` 浇水推荐、`s === 'zero' || role === 'scout'` 探索推荐、"优先指派阿梅"按钮区块（不新增 preferredDuty 字段）
- [ ] `getHeroRole` 废弃（ticket 03 已完成）；`getHeroStatus` 重写为查 `hero.logisticsFacilityId` 派生岗位文案
- [ ] `THEME_MAP` / `getTheme` / `getUpgradeIcon` 迁入 `SHELTER_UPGRADES` 数据配置（新增 `stateKey` / `theme` / `icon` 字段）
- [ ] `replantCropId` 默认值改为数据推导（第一个可播种作物）；`selectedLocationId` 改为数据推导（第一个有效地点）
- [ ] `expInterval` 回退值 300 移除（无效地点已删除）
- [ ] `flyingRewards: any[]` 改为 `FlyingReward[]`（定义 `{ id, text, slotId, offsetY }` 接口）
- [ ] `getUpgradeLevel` 改为 `state.shelter[upgrade.stateKey]`（数据驱动，无特判，无 `as any`）
- [ ] 文案归 `shelter/constants.ts`
- [ ] 验证：`npm run lint` 无 `any` 类型警告、无未使用变量
