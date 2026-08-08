# 远征机制重新设计

Type: grilling
Status: claimed
Blocked by: (无)

## Question

远征当前"不正常工作"且"设计老旧不贴合英雄设计版本"。需重新设计远征机制。

**用户已决策：改用 `HEROES_CONFIG` 的 `heroClass` / `faction` 做解锁与加成**，移除对 `SURVIVORS_CONFIG.role` 的功能依赖。

本 ticket 需解决：

1. **空产出 bug 修复**：4 个救援地点（`green_ruins` / `signal_tower` / `collapsed_subway` / `military_depot`）`scavengeInterval: 0` + `lootTable: []`，代码不禁止派遣，玩家正常消耗口粮但永远 0 产出。
   - 方案 A：在 `startExpeditionUpdate` 校验 `scavengeInterval > 0 && lootTable.length > 0`，禁止派遣到无效地点。
   - 方案 B：将救援地点从 `EXPEDITION_LOCATIONS` 中移除（它们是救援剧情地点，不该用于拾荒远征）。
   - 方案 C：给这些地点配置有效 lootTable（如果设计上允许拾荒）。
2. **职业判定迁移**：当前 `requiredRole`（`'scout'` / `'engineer'` / `'guard'`）来自 `SURVIVORS_CONFIG.role`。迁移到 heroClass/faction 后：
   - 地点解锁条件改为 `requiredHeroClass`（守护者/进攻者/协奏者）还是 `requiredFaction`（奥术/机械/梦魇/英灵/星界/魂印）？还是两者皆可？
   - 现有地点的职业要求如何映射？（scout→? engineer→? guard→?）
3. **英雄加成**：远征是否接入 `dutyMeta`？还是为远征设计新的加成维度（如按 faction 提供拾荒加成）？
4. **口粮机制**：当前出发消耗 1 份口粮（仅 UI 校验，`startExpedition` 不扣减）。保留还是重设？
5. **地点数据模型**：`EXPEDITION_LOCATIONS` 是否需要重构？`requiredRole: string | null` 改为什么？是否新增 `requiredHeroClass` / `requiredFaction` / `bonusFaction` 等字段？
6. **掉落表对齐**：现有 lootTable 的物品 id 是否与当前 `ITEMS_CONFIG`（ADR-0015 单一真相源）完全对齐？是否有已废弃的物品 id？
7. **远征 UI**：当前用 `<select>` 选英雄 + 卡片选地点。是否改为英雄卡片式选择（对齐英雄列表设计语言）？

### 调查基线

- `EXPEDITION_LOCATIONS`：`src/data/expeditionLocations.ts`，11 个地点，4 个无效（scavengeInterval:0）。
- `startExpeditionUpdate`：`src/state/shelter.ts:58-88`，校验 `requiredRole` via `getHeroRole`（查 `SURVIVORS_CONFIG`），不校验口粮、不校验 scavengeInterval。
- 拾荒结算：`src/state/tick.ts:128-163`（在线）、`src/state/offline.ts:170-207`（离线），`Math.max(30, floor(scavengeInterval))` 兜底。
- 远征 UI：`ShelterTab.tsx:705-917`，已派遣 / 未派遣两态。
- `SURVIVORS_CONFIG` role 分布：engineer(roy,nova)、scout(zero,buster)、farmer(mei,catherine)、guard(soldier)、chemist(healer)、scavenger(apprentice)。
- `HEROES_CONFIG`：heroClass(guardian/attacker/conductor) + faction(arcane/mechanical/nightmare/spirit/astral/soulseal)。

### 约束

- 本 ticket 只产出**远征机制设计决策**，不写实现代码。
- 需覆盖：空产出修复方案、职业判定迁移方案、加成设计、口粮机制、地点数据模型、UI 交互方向。
- SURVIVORS_CONFIG 保留为剧情档案（ADR-0013），但功能依赖需移除。

## Answer

### 1. 空产出 bug 修复：移除救援地点

将 4 个救援地点（`green_ruins` / `signal_tower` / `collapsed_subway` / `military_depot`）从 `EXPEDITION_LOCATIONS` 中移除。它们是救援剧情地点（ADR-0013 注释已标明"英雄救援地点"），本就不该用于拾荒远征。`SURVIVORS_CONFIG.realityLocationId` 仍可引用这些 id 作为救援坐标，但远征列表不再显示它们。

移除后 `EXPEDITION_LOCATIONS` 保留 7 个有效拾荒地点：`radar_station`、`subway_station`、`bio_lab`、`poison_factory`、`ruined_armory`、`ancient_library`（均 `scavengeInterval > 0` 且 `lootTable` 非空）。

### 2. 职业判定迁移：heroClass + faction 两者皆可

地点解锁条件从 `requiredRole: string | null` 改为两个可选字段：

```typescript
interface ExpeditionLocation {
  // ...existing fields...
  requiredHeroClass?: HeroClass;    // 守护者 / 进攻者 / 协奏者
  requiredFaction?: HeroFaction;    // 奥术 / 机械 / 梦魇 / 英灵 / 星界 / 魂印
}
```

- 地点可声明 `requiredHeroClass`、`requiredFaction`、两者皆有、或都不声明（无门槛）。
- 两者皆有时，英雄需**同时满足**两个条件才能派遣。
- **现有地点映射**（旧 role -> 新字段）：
  - `subway_station`（旧 scout）：`requiredFaction: 'soulseal'`（zero 是魂印系侦察兵）或 `requiredHeroClass: 'conductor'`（侦察兵偏协奏）。**推荐 `requiredFaction: 'soulseal'`**，门槛更精细。
  - `bio_lab`（旧 engineer）：`requiredFaction: 'mechanical'`（roy/nova 是机械系工程师）。
  - `poison_factory`（旧 engineer）：`requiredFaction: 'mechanical'`。
  - `ruined_armory`（旧 guard）：`requiredHeroClass: 'guardian'`（soldier 是守护者卫兵）。
  - `radar_station` / `ancient_library`：无门槛（保留 `requiredRole: null` 语义）。
- **校验逻辑**内化到 `assignHeroToDuty` 统一接口（T1 决议），不留在 UI 层。

### 3. 远征加成：无英雄加成

远征不接入英雄加成（不接入 `dutyMeta`，也不新增 faction 远征加成）。英雄只影响"能否派遣"（职业匹配），不影响产出效率。产出仅由地点配置（`lootTable` / `scavengeInterval`）决定。

理由：远征是挂机拾荒，产出由地点决定更直观；英雄差异已通过职业门槛体现；避免加成公式复杂化。

### 4. 口粮机制：地点配置驱动 + 持续消耗 + 自动召回

口粮机制重新设计为**地点配置驱动**，校验内化到 state 层（解耦 UI）：

```typescript
interface ExpeditionLocation {
  // ...existing fields...
  rationCost?: number;              // 出发时一次性消耗的口粮数量（默认 0 = 免费出发）
  rationConsumptionRate?: number;   // 持续消耗：每 N 秒消耗 1 份口粮（0 = 不持续消耗）
}
```

- **出发消耗**：`assignHeroToDuty('explorer', locationId)` 内部校验 `getInvQty('ration') >= loc.rationCost`，不足则拒绝；足够则扣减。
- **持续消耗**：tick / offline 在远征拾荒结算时，按 `rationConsumptionRate` 计算应消耗口粮数并扣减。若口粮耗尽，**自动召回**（调用 `assignHeroToDuty(heroId, null)` 清除探索岗 + 重置 `shelter.expedition`）。
- **现有地点配置**：`radar_station` / `subway_station` 等的 `rationCost` / `rationConsumptionRate` 具体数值归汇编 spec 时确定（T7），本 ticket 只定机制。
- **UI 层不校验**：派遣按钮的 disabled 状态仅用于视觉提示（如口粮不足时标红），实际校验在 `assignHeroToDuty` 内部，失败返回 false + toast。

### 5. 地点数据模型

`EXPEDITION_LOCATIONS` 重构后：

```typescript
interface ExpeditionLocation {
  id: string;
  name: string;
  displayName: string;
  shortName?: string;
  scavengeInterval: number;          // 拾荒间隔（秒），> 0
  lootTable: LootEntry[];            // 非空
  requiredHeroClass?: HeroClass;     // 可选职阶门槛
  requiredFaction?: HeroFaction;     // 可选阵营门槛
  rationCost?: number;               // 出发口粮消耗
  rationConsumptionRate?: number;    // 持续口粮消耗（秒/份）
}
```

- 移除 `requiredRole: string | null`。
- `SURVIVORS_CONFIG.role` / `roleLabel` 不再被远征功能引用（保留为剧情档案）。
- `getHeroRole`（`shelter.ts:9-10`）废弃，远征校验改查 `HEROES_CONFIG[heroId].heroClass` / `.faction`。

### 6. 远征 UI：英雄卡片式 + 地点卡片式

- **英雄选择**：从 `<select>` 下拉改为卡片式（对齐 `HeroListModal` / `PartySlotModal` 设计语言）。卡片展示英雄头像、名称、职阶标签、阵营标签、职业匹配状态（满足/不满足地点要求时高亮/灰显）。
- **地点选择**：保留现有卡片式选择，刷新视觉对齐设计语言。卡片展示地点名、拾荒间隔、掉落表、职阶/阵营门槛、口粮消耗。
- **派遣/召回按钮**：统一设计语言（对齐 WorkshopTab 的按钮样式）。
- **已派遣状态**：展示探索员卡片 + 地点信息 + 拾荒倒计时 + 战利品表 + 召回按钮。
- 具体 UI 实现归 T3（分 tab 结构）和汇编 spec（T7）展开。

### 7. 掉落表对齐

现有 lootTable 的物品 id 需与 `ITEMS_CONFIG`（ADR-0015 单一真相源）核对。归汇编 spec（T7）时逐项校验，本 ticket 只标记需核对。

### 领域术语更新

- **远征门槛 (Expedition Requirement)**：地点对探索员的职阶 / 阵营要求，表达为 `requiredHeroClass` / `requiredFaction` 两个可选字段。
- **远征口粮 (Expedition Ration)**：出发消耗（`rationCost`）+ 持续消耗（`rationConsumptionRate`），地点配置驱动，耗尽自动召回。

Status: resolved
