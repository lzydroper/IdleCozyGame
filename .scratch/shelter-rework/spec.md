# 后勤模块改造规范（shelter-rework）

Status: ready-for-agent

## Problem Statement

后勤页面（`ShelterTab`）是游戏中的第 3 个 tab，承载基建升级、温室种植、工业产线、远征探索四大功能。但当前实现存在严重的代码质量与功能完整性问题：

1. **顶部资源指示器冗余**：废旧金属 / 合金板 / 口粮 / 魔能储备的微型指示器占用顶部空间，且这些信息在背包中已可见。
2. **单一长滚动页面**：基建 / 温室 / 产线 / 远征 / 日志五个区块垂直堆叠，玩家需不断向下滑动，且样式不统一。
3. **指派操作员功能半成品**：ADR-0007 设计了设施驻守机制（英雄驻守冶炼炉/组装台提供 `dutyMeta` 加成），代码做到一半--9 个英雄都配了 `dutyMeta`、`logisticsFacilityId` 字段、上阵过滤、英雄详情文案都有了，但缺指派 setter 且产线 tick 不消费它。同时存在两套并行指派系统（`shelter.assigned*` 单值岗 vs `hero.logisticsFacilityId` 设施驻守）。
4. **远征不正常工作**：4 个救援地点（`green_ruins` / `signal_tower` / `collapsed_subway` / `military_depot`）`scavengeInterval: 0` + `lootTable: []`，代码不禁止派遣，玩家正常消耗口粮但永远 0 产出。远征仍用已废弃的 `SURVIVORS_CONFIG.role` 做职业判定，不贴合当前英雄设计版本（`HEROES_CONFIG` 的 `heroClass` / `faction`）。
5. **后勤工作日志冗余**：日志 tab 已提供完整的日志查看与分类过滤功能，后勤页面内的日志区块重复。
6. **大量硬编码**：`s === 'mei'` 浇水推荐、`s === 'zero'` 探索推荐、`THEME_MAP` 配色、`replantCropId` 默认值、`any` 类型等散落各处。

## Solution

将后勤页面重构为**全页分 tab 架构**（基建 / 温室 / 产线 / 远征），梦魇警报常驻顶部。统一后勤指派为 `hero.logisticsFacilityId` 结构化对象（`DutyAssignment`），补全设施驻守机制（`dutyMeta` 接入产线 tick），重新设计远征（改用 `heroClass` / `faction`、口粮地点配置驱动），移除资源指示器与后勤日志，系统性清理硬编码。

## User Stories

### 分 tab 架构

1. 作为玩家，我想在后勤页面看到分 tab 导航（基建 / 温室 / 产线 / 远征），这样我可以快速切换功能区而不需不断滚动。
2. 作为玩家，我想看到每个 tab 的状态计数（如温室"可收割 3"、远征"进行中"），这样我可以快速了解各功能区状态。
3. 作为玩家，我想看到梦魇警报常驻在 tab 栏上方，这样紧急事件始终可见。
4. 作为玩家，我不想在后勤页面顶部看到资源指示器（废旧金属等），因为这些信息在背包中已可见。

### 基建 tab

5. 作为玩家，我想在基建 tab 查看并升级蓄电池 / 发电机 / 回收站，这样我可以提升避难所基建能力。
6. 作为玩家，我想看到每个基建升级项的当前等级、效果和下一级消耗，这样我可以决策是否升级。

### 温室 tab

7. 作为玩家，我想在温室 tab 查看培养槽网格，这样我可以管理作物种植。
8. 作为玩家，我想点击空槽位播种作物，这样我可以种植资源。
9. 作为玩家，我想点击成熟作物收割，这样我可以获得产出。
10. 作为玩家，我想一键浇水和一键收割并播种，这样我可以批量管理温室。
11. 作为玩家，我想指派英雄为浇水操作员，这样温室作物自动浇水（生长速度翻倍）。
12. 作为玩家，我想看到当前浇水操作员是谁，这样我可以了解温室托管状态。

### 产线 tab

13. 作为玩家，我想在产线 tab 查看冶炼炉和组装台，这样我可以管理自动生产。
14. 作为玩家，我想为每台设施入队配方，这样设施自动按 FIFO 顺序生产。
15. 作为玩家，我想升级和扩建设施，这样我可以提升产能和并行度。
16. 作为玩家，我想为每台设施指派驻守英雄，这样英雄的 `dutyMeta` 加成生效。
17. 作为玩家，我想看到每台设施的驻守英雄及其加成预览，这样我可以了解产能加成。
18. 作为玩家，我想解除英雄的设施驻守，这样英雄可以回到空闲状态或被指派到其他岗位。

### 远征 tab

19. 作为玩家，我想在远征 tab 选择探索员和探索地点，这样我可以派遣远征。
20. 作为玩家，我想以卡片形式选择英雄（展示职阶 / 阵营 / 职业匹配状态），这样我可以直观判断谁能派遣。
21. 作为玩家，我想以卡片形式选择地点（展示拾荒间隔 / 掉落表 / 门槛 / 口粮消耗），这样我可以决策去哪里。
22. 作为玩家，我想看到远征进行中的状态（探索员 / 地点 / 倒计时 / 战利品表），这样我可以了解远征进度。
23. 作为玩家，我想召回远征探索员，这样我可以停止远征并结算收益。
24. 作为玩家，当口粮耗尽时远征自动召回，这样我不会因口粮不足而无法召回。
25. 作为玩家，我不想看到空产出的救援地点出现在远征列表中，因为它们不是拾荒地点。

### 指派统一

26. 作为玩家，我想英雄被指派到任何后勤岗位（浇水 / 探索 / 设施驻守）后禁止选入战斗小队，这样后勤与战斗互斥。
27. 作为玩家，我想英雄同一时间只能担任一种后勤职务，这样不会出现兼任冲突。
28. 作为玩家，我想指派英雄到新岗位时自动解除原岗位，这样切换岗位不需手动先解除。

## Implementation Decisions

### 1. 后勤指派统一模型

- `HeroState.logisticsFacilityId` 从 `string | null` 改为结构化对象 `DutyAssignment | null`：
  ```
  type DutyType = 'waterer' | 'explorer' | 'facility';
  interface DutyAssignment {
    type: DutyType;
    targetId: string;  // waterer: 'greenhouse'; explorer: locationId; facility: '${facilityType}_${unitIndex}'
  }
  ```
- `shelter.assignedWatererId` / `assignedExplorerId` 保留为**缓存索引**（真相源是 `hero.logisticsFacilityId`，缓存由 setter 维护一致性，O(1) 查询）。
- `shelter.expedition`（`locationId` / `startTime` / `lastScavengeTime`）保留在 shelter 上（远征运行状态是 shelter 级）。
- 废除 `assignHeroJob` / `startExpedition` / `stopExpedition` 三个入口，统一为 `assignHeroToDuty(heroId, duty: DutyAssignment | null): boolean`：
  - null（解除）：清 `hero.logisticsFacilityId` + 对应 shelter 缓存；若原指派是 explorer，同步清 `shelter.assignedExplorerId` + 重置 `shelter.expedition`。
  - 'waterer'：先清旧岗位，写 `hero.logisticsFacilityId` + `shelter.assignedWatererId` 缓存。
  - 'explorer'：先清旧岗位；扣口粮（`rationCost`）；校验地点有效性 + 职业匹配；写 `hero.logisticsFacilityId` + `shelter.assignedExplorerId` + 初始化 `shelter.expedition`。
  - 'facility'：先清旧岗位；校验目标设施存在 + 原驻守英雄被替换；写 `hero.logisticsFacilityId`。
- **排他性**：强制单岗，`assignHeroToDuty` 先清该英雄在所有岗位的占用再设新岗位。
- **上阵过滤**：`PartySlotModal` 的 `Boolean(heroState?.logisticsFacilityId)` 逻辑不变，覆盖三种指派。
- **旧存档**：沿用 ADR-0013 alpha 不迁移，旧字段直接丢弃。

### 2. 远征机制重设计

- 从 `EXPEDITION_LOCATIONS` 移除 4 个救援地点（`green_ruins` / `signal_tower` / `collapsed_subway` / `military_depot`），保留 7 个有效拾荒地点。
- `requiredRole: string | null` 改为两个可选字段：
  - `requiredHeroClass?: HeroClass`（守护者 / 进攻者 / 协奏者）
  - `requiredFaction?: HeroFaction`（奥术 / 机械 / 梦魇 / 英灵 / 星界 / 魂印）
  - 两者皆有时需同时满足。
- 现有地点门槛映射：`subway_station` -> `requiredFaction: 'soulseal'`；`bio_lab` / `poison_factory` -> `requiredFaction: 'mechanical'`；`ruined_armory` -> `requiredHeroClass: 'guardian'`；`radar_station` / `ancient_library` -> 无门槛。
- 口粮改地点配置驱动：`rationCost?`（出发消耗）+ `rationConsumptionRate?`（持续消耗，秒/份）。持续消耗在 tick/offline 拾荒结算时扣减；口粮耗尽自动召回。
- 校验内化到 `assignHeroToDuty`，UI 层不校验（按钮 disabled 仅视觉提示）。
- 远征不接入英雄加成（产出仅由地点配置决定）。
- 废弃 `getHeroRole`（`shelter.ts:9-10`），远征校验改查 `HEROES_CONFIG[heroId].heroClass` / `.faction`。
- UI 改英雄卡片式（对齐 `HeroListModal` / `PartySlotModal`）+ 地点卡片式。

### 3. 分 tab 结构

- 4 个 tab：基建 / 温室 / 产线 / 远征。
- 梦魇警报（`DreamLeakAlertPanel`）常驻顶部（tab 栏上方）。
- 顶部资源指示器整段移除（魔能储备不迁移）。
- 后勤工作日志区块移除（`log.type === 'logistics'` 分类保留，供日志 tab 过滤）。
- 新建 `ShelterTabBar` 组件（类比 `WorkshopCategoryBar`），状态计数：温室可收割数 / 产线队列数 / 远征进行中标签。
- 统一 section 样式为 `bg-zinc-900/60 border border-zinc-800 rounded-3xl backdrop-blur-md`（对齐 WorkshopTab）。
- 移除各 section 内部嵌套滚动区域（`max-h-64` / `max-h-72` / `max-h-[500px]`），tab 切换后全展示。
- 组件拆分到 `src/components/shelter/` 子目录：`ShelterTab` / `ShelterTabBar` / `BaseUpgradeSection` / `GreenhouseSection` / `ExpeditionSection` / `constants.ts`。产线 tab 复用 `FacilityCard.tsx`。

### 4. dutyMeta 接入产线 tick

- 三字段公式（乘算 + 下取整 + 最低 1）：
  - 速度：`duration / ((1 + level * 0.1) * (1 + speedMultiplier))`，与等级加成乘算叠加。
  - 产量：`floor(qty * (1 + yieldMultiplier))`，下取整。
  - 原料：`max(1, floor(qty * (1 - costReduction)))`，最低消耗 1。
- 注入方案（C+A 组合）：
  - 新增 `resolveDutyBonus(state, type, unitIndex) -> HeroDutyMeta | null`（`state/facility.ts`），解析 `DutyAssignment.targetId` 反查 `state.heroes`。
  - `getActualDuration` 扩展第三参 `speedMultiplier = 0`（向后兼容）。
  - `processFacility` 扩展第四参 `dutyMeta?: HeroDutyMeta`，内部影响 duration / reward qty / cost qty。
  - `tick.ts` / `offline.ts` 调用 `processFacility` 前先 `resolveDutyBonus` 传入。
- **多设施语义**：每 unit 独立驻守 1 名英雄，各提供独立加成。
- **驻守 UI**：插入 `FacilityUnitCard` 标题栏区域（与"效率 XX%"并列），展示英雄头像 + 加成预览，点击弹出英雄选择器。
- **驻守解除**：手动（徽章"解除"按钮）+ 自动（指派到其他岗位时由 `assignHeroToDuty` 排他性清除）；上阵不自动解除（需手动解除后才能上阵）。

### 5. 硬编码清理

- 英雄推荐标签（mei / zero 特判）移除，不新增 `preferredDuty` 字段。
- `getHeroRole` 废弃；`getHeroStatus` 重写为查 `hero.logisticsFacilityId` 派生岗位文案。
- `THEME_MAP` / `getTheme` / `getUpgradeIcon` 迁入 `SHELTER_UPGRADES` 数据配置（`stateKey` / `theme` / `icon` 字段）。
- `replantCropId` 默认值改为数据推导（第一个可播种作物）；`selectedLocationId` 改为数据推导（第一个有效地点）；`expInterval` 回退值 300 移除。
- 文案归 `shelter/constants.ts`（tab 配置 / 样式 token / toast 文案）。
- `flyingRewards: any[]` 改为 `FlyingReward[]`（定义接口）。
- `getUpgradeLevel` 改为 `state.shelter[upgrade.stateKey]`（数据驱动，无特判）。

### 6. 数据文件变更清单

- `src/types/game.ts`：`HeroState.logisticsFacilityId` 类型改 `DutyAssignment | null`；`ExpeditionLocation` 接口重构（移除 `requiredRole`，新增 `requiredHeroClass` / `requiredFaction` / `rationCost` / `rationConsumptionRate`）。
- `src/data/expeditionLocations.ts`：移除 4 个救援地点；现有地点新增门槛字段和口粮配置。
- `src/data/shelterUpgrades.ts`：新增 `stateKey` / `theme` / `icon` 字段。
- `src/data/heroes.ts`：无变更（`dutyMeta` 配置保留）。
- `src/state/shelter.ts`：`assignHeroJobUpdate` / `startExpeditionUpdate` / `stopExpeditionUpdate` 合并为 `assignHeroToDutyUpdate`；废弃 `getHeroRole`。
- `src/state/facility.ts`：新增 `resolveDutyBonus`；`getActualDuration` 扩展第三参；`processFacility` 扩展第四参。
- `src/state/tick.ts` / `src/state/offline.ts`：调用 `processFacility` 时传入 `resolveDutyBonus` 结果；远征持续口粮消耗 + 自动召回逻辑。

### 7. ADR 更新

- 新建 ADR 覆盖 ADR-0007 的半成品状态：`logisticsFacilityId` 改为结构化对象 `DutyAssignment`，补全设施驻守机制，`shelter.assigned*` 降级为缓存索引。ADR-0007 的"每台设施驻守 1 名英雄"决策得到完整实现。

## Testing Decisions

### 测试原则

只测试外部行为，不测试实现细节。优先复用现有测试 seam。

### 测试 seam

1. **state 层**（纯函数测试，最高优先级）：
   - `assignHeroToDutyUpdate`：指派 / 解除 / 排他性 / 缓存同步 / 口粮扣减 / 职业校验 / 自动召回。
   - `processFacility` + `resolveDutyBonus`：dutyMeta 三字段加成公式（速度 / 产量 / 原料）、等级与 dutyMeta 乘算叠加、无驻守时行为不变。
   - `getActualDuration`：扩展第三参向后兼容（不传时行为不变）。
   - 远征 tick：持续口粮消耗 + 耗尽自动召回 + `shelter.expedition` 状态正确更新。
   - 先例：`src/data/heroesDuty.test.ts`、`src/state/` 下的纯函数测试。

2. **UI 层**（组件测试）：
   - `ShelterTab`：分 tab 渲染、tab 切换、状态计数显示、梦魇警报常驻顶部、资源指示器已移除。
   - `ExpeditionSection`：英雄卡片式选择、地点卡片式选择、门槛匹配状态、已派遣 / 未派遣两态、召回按钮。
   - `FacilityCard` / `FacilityUnitCard`：驻守英雄徽章展示、指派 / 解除交互、加成预览。
   - `BaseUpgradeSection`：基建升级列表、无 THEME_MAP 硬编码。
   - 先例：`src/components/ShelterTab.test.tsx`、`src/components/FacilityCard.test.tsx`、`src/components/workshop/WorkshopTab.test.tsx`。

3. **迁移 seam**（存档兼容）：
   - 旧存档加载时 `shelter.assigned*`（string）和 `hero.logisticsFacilityId`（旧 string）被丢弃，按新默认初始化。
   - 先例：ADR-0013 的 alpha 不迁移决策。

### 测试适配

- `ShelterTab.test.tsx`：现有 3 个用例适配分 tab（培养槽测试需先切到温室 tab）。
- `PartySlotModal.test.tsx`：mock 数据从 `logisticsFacilityId: 'smelter_1'` 改为 `{ type: 'facility', targetId: 'smelter_1' }`。
- `heroesDuty.test.ts`：同上 mock 数据调整。
- `FacilityCard.test.tsx`：更新"指派产线"相关断言（文案改"驻守"或更新断言）。

## Out of Scope

- **SURVIVORS_CONFIG 删除**：SURVIVORS_CONFIG 保留为剧情档案（ADR-0013），仅移除远征功能对它的依赖。backstory / dreamTrigger / realityLocationId 等剧情字段保留。
- **温室机制重设计**：温室的种植 / 浇水 / 收割逻辑保留现有设计，仅适配指派模型统一（T1）和分 tab 结构（T3）。
- **基建升级机制重设计**：基建升级的等级 / 消耗 / 效果逻辑保留，仅清理硬编码（T5）。
- **梦魇警报重设计**：`DreamLeakAlertPanel` 保留原位，仅位置调整为常驻顶部。
- **新英雄 / 新地点 / 新配方**：本 spec 不新增游戏内容，仅重构现有功能。
- **旧存档迁移**：沿用 ADR-0013 alpha 不迁移决策。

## Further Notes

- 本 spec 基于 wayfinder 地图 `.scratch/shelter-rework/` 的 6 个决策 ticket（T1-T6）汇编而成，每个决策的详细论证见对应 ticket 的 `## Answer`。
- 实施前需新建 ADR 覆盖 ADR-0007 的半成品状态（见 Implementation Decisions 第 7 节）。
- 远征地点的具体 `rationCost` / `rationConsumptionRate` 数值需在实施时根据游戏平衡确定，本 spec 只定机制不定数值。
- 掉落表物品 id 需在实施时与 `ITEMS_CONFIG`（ADR-0015 单一真相源）逐项核对。
- 9 个英雄的 `dutyMeta` 数值评估合理（见 T4 Answer 第 7 节），无需调整。
