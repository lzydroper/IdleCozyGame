# 硬编码清理与数据驱动化

Type: grilling
Status: claimed
Blocked by: 01, 02, 03

## Question

`ShelterTab` 及其依赖中散落大量硬编码，需系统性清理并改为数据驱动。

本 ticket 需解决：

1. **英雄特判硬编码**：
   - `s === 'mei'` 浇水推荐（`ShelterTab.tsx:613,626,642`）：mei 被硬编码为浇水优先推荐。应改为数据驱动（如 `HeroConfig` 增加 `dutyPreference` 字段，或从 `dutyMeta` 推导）。
   - `s === 'zero' || cfg?.role === 'scout'` 探索推荐（`ShelterTab.tsx:811`）：zero 硬编码为探索推荐。同上。
   - `getHeroName('mei')` 快捷指派（`ShelterTab.tsx:631`）："优先指派阿梅"按钮。
   - `getHeroRole` / `getHeroStatus`（`ShelterTab.tsx:200-208`）：从 `SURVIVORS_CONFIG` 查 role，从 `shelter.assigned*` 查状态。随 T1/T2 统一后需重写。
2. **THEME_MAP 硬编码**（`ShelterTab.tsx:51-91`）：基建升级的配色按 id（battery/generator/recycler）硬编码。应迁入 `SHELTER_UPGRADES` 数据配置或 `shelter/constants.ts`。
3. **replantCropId 默认值**（`ShelterTab.tsx:178`）：`useState('glow_grass')` 硬编码默认连播作物。应从数据推导（如第一个可播种作物）或持久化到 state。
4. **selectedLocationId 默认值**（`ShelterTab.tsx:182`）：`useState('radar_station')` 硬编码默认远征地点。应从数据推导（第一个可用地点）。
5. **expInterval 默认值**（`ShelterTab.tsx:271`）：`let expInterval = 300` 硬编码回退值。应从 `gameConstants` 读取。
6. **文案硬编码**：各 section 标题的中英双语（"避难所基建与挂机控制 Core Upgrades"等）、提示文案散落组件内。是否归 `shelter/constants.ts`？
7. **any 类型**：`flyingRewards: any[]`（`:116`）、`state.shelter as any`（`:192`）等。需补类型。
8. **getUpgradeLevel 硬编码**（`:188-193`）：`batteryLevel` / `generatorLevel` / `recyclerLevel` 特判 + `(state.shelter as any)[id + 'Level']` 回退。应统一为数据驱动查询。

### 依赖

- Blocked by T1：英雄特判清理依赖指派模型统一后的字段格式。
- Blocked by T2：探索推荐清理依赖远征职业判定迁移方案。
- Blocked by T3：文案 / 配色归集依赖分 tab 结构确定后的组件拆分。

### 约束

- 本 ticket 只产出**硬编码清理方案**（哪些迁数据、哪些迁 constants、哪些补类型），不写实现代码。
- 需覆盖全部 8 类硬编码点的具体处理方式。

## Answer

### 1. 英雄特判硬编码：移除推荐标签

- **`s === 'mei'` 浇水推荐**（`ShelterTab.tsx:613,626,642`）：移除"优先推荐"标签和"优先指派阿梅"快捷按钮。
- **`s === 'zero' || cfg?.role === 'scout'` 探索推荐**（`ShelterTab.tsx:811`）：移除"[推荐]"标签。
- **`getHeroName('mei')` 快捷指派**（`ShelterTab.tsx:631`）：移除整个"优先指派阿梅"按钮区块（`:626-637`）。
- **不新增 `preferredDuty` 字段**：用户决策移除推荐，玩家自行判断。
- **`getHeroRole` / `getHeroStatus`**（`:200-208`）：
  - `getHeroRole`：废弃（T2 决议，远征改用 `HEROES_CONFIG[heroId].heroClass` / `.faction`）。
  - `getHeroStatus`：重写为从 `hero.logisticsFacilityId`（T1 结构化对象）派生岗位文案，不再查 `shelter.assigned*`。

### 2. THEME_MAP 硬编码：迁入数据配置

- **`THEME_MAP` / `getTheme`**（`ShelterTab.tsx:51-91`）：基建升级配色（battery/generator/recycler）迁入 `SHELTER_UPGRADES` 数据配置。
- 每个升级项在 `shelterUpgrades.ts` 中新增 `theme?: { iconBg, iconBorder, buttonClass }` 字段，或提取为 `shelter/constants.ts` 中的 `SHELTER_THEMES` 映射。
- `getUpgradeIcon`（`:38-49`）同样迁入数据：升级项配置新增 `icon` 字段。

### 3. replantCropId 默认值：数据推导

- **`useState('glow_grass')`**（`:178`）：改为从数据推导默认值。初始化时取 `CROPS_CONFIG` 第一个可播种作物（按配置顺序），或取玩家库存中种子最多的作物。
- 推导逻辑放入 `shelter/constants.ts` 或 `state/shelter.ts` 的 selector 函数。

### 4. selectedLocationId 默认值：数据推导

- **`useState('radar_station')`**（`:182`）：改为从 `EXPEDITION_LOCATIONS` 第一个有效地点推导（按配置顺序）。
- 推导逻辑：`Object.keys(EXPEDITION_LOCATIONS)[0]`。

### 5. expInterval 默认值：从 gameConstants 读取

- **`let expInterval = 300`**（`:271`）：硬编码回退值改为从 `gameConstants` 读取（如 `gameConstants.expedition.defaultInterval`），或直接取 `expLocation.scavengeInterval`（移除无效地点后所有地点都 > 0，回退值不再需要）。
- T2 决议移除 4 个 `scavengeInterval: 0` 地点后，回退值 300 可完全移除。

### 6. 文案硬编码：归 shelter/constants.ts

- 各 section 标题的中英双语（"避难所基建与挂机控制 Core Upgrades"等）归 `shelter/constants.ts`。
- 提示文案（如"托管效应"、"派遣口粮消耗给养"等）归 `shelter/constants.ts`。
- toast 文案（如"作物已播种入培养槽！"等）归 `shelter/constants.ts`。
- 参照 `workshop/constants.ts` 的组织模式。

### 7. any 类型：补类型

- **`flyingRewards: any[]`**（`:116`）：定义 `FlyingReward` 接口 `{ id: number; text: string; slotId: number; offsetY: number }`。
- **`state.shelter as any`**（`:192`）：`getUpgradeLevel` 重写为从 `SHELTER_UPGRADES` 配置查 `stateKey` 字段，不再用 `id + 'Level'` 字符串拼接 + `as any`。
- 其他 `any` 类型（如有）在组件拆分时一并补齐。

### 8. getUpgradeLevel 硬编码：数据驱动

- **`getUpgradeLevel`**（`:188-193`）：`batteryLevel` / `generatorLevel` / `recyclerLevel` 特判 + `(state.shelter as any)[id + 'Level']` 回退。
- 改为：`SHELTER_UPGRADES` 配置新增 `stateKey: keyof ShelterStats` 字段（如 battery -> `batteryLevel`），`getUpgradeLevel` 改为 `state.shelter[upgrade.stateKey] || 0`。
- 完全数据驱动，无特判。

### 汇总

| 硬编码点 | 处理方式 |
|---|---|
| 英雄特判（mei/zero 推荐） | 移除推荐标签，不新增字段 |
| getHeroRole / getHeroStatus | 废弃 / 重写为查 logisticsFacilityId |
| THEME_MAP / getTheme / getUpgradeIcon | 迁入 SHELTER_UPGRADES 数据配置 |
| replantCropId 默认值 | 数据推导（第一个可播种作物） |
| selectedLocationId 默认值 | 数据推导（第一个有效地点） |
| expInterval 默认值 300 | 移除（无效地点已删除） |
| 文案硬编码 | 归 shelter/constants.ts |
| any 类型 | 定义 FlyingReward 接口 + stateKey 数据驱动 |
| getUpgradeLevel | SHELTER_UPGRADES 配置 stateKey 字段 |

Status: resolved
