# 后勤指派统一为 DutyAssignment 结构化对象

Status: accepted

## 背景

ADR-0007 设计了设施驻守机制：英雄驻守冶炼炉/组装台等产线设施时提供 `dutyMeta` 加成。但代码长期停留在半成品状态--`hero.logisticsFacilityId` 字段、上阵过滤（`PartySlotModal`）、英雄详情文案（`HeroDetailModal`/`HeroDossierModal`）都有了，唯独缺指派 setter 且产线 tick 不消费 `dutyMeta`。同时存在两套并行指派系统：`shelter.assignedWatererId`/`assignedExplorerId`（单值岗，已生效）vs `hero.logisticsFacilityId`（设施驻守，半成品）。

## 决策

- **`hero.logisticsFacilityId` 改为结构化对象 `DutyAssignment | null`**：
  ```
  type DutyType = 'waterer' | 'explorer' | 'facility';
  interface DutyAssignment { type: DutyType; targetId: string; }
  ```
  统一表达浇水岗、探索岗、设施驻守三种语义。
- **`shelter.assignedWatererId`/`assignedExplorerId` 保留为缓存索引**（真相源是 `hero.logisticsFacilityId`，缓存由 setter 维护一致性，O(1) 查询）。
- **`shelter.expedition` 保留在 shelter 上**（远征运行状态是 shelter 级，不是设施级）。
- **废除 `assignHeroJob`/`startExpedition`/`stopExpedition` 三入口**，统一为 `assignHeroToDuty(heroId, duty: DutyAssignment | null)`：
  - `waterer`：写 `hero.logisticsFacilityId` + `shelter.assignedWatererId` 缓存。
  - `explorer`：校验地点 + `heroClass`/`faction` 门槛 + 扣口粮；写 `hero.logisticsFacilityId` + `shelter.assignedExplorerId` + 初始化 `shelter.expedition`。
  - `facility`：校验目标设施存在 + 替换原驻守英雄；写 `hero.logisticsFacilityId`。
  - `null`（解除）：清 `hero.logisticsFacilityId` + 对应缓存 + expedition（若 explorer）。
- **排他性**：强制单岗，`assignHeroToDuty` 先清该英雄在所有岗位的占用再设新岗位。
- **dutyMeta 接入产线 tick**：`resolveDutyBonus(state, type, unitIndex)` 反查驻守英雄的 `dutyMeta`，`getActualDuration` 扩展第三参 `speedMultiplier`，`processFacility` 扩展第四参 `dutyMeta`，影响速度（乘算）、产量（下取整）、原料（最低 1）。
- **远征门槛迁移**：`requiredRole`（来自 `SURVIVORS_CONFIG`）迁移为 `requiredHeroClass` + `requiredFaction`（来自 `HEROES_CONFIG`），移除对 `SURVIVORS_CONFIG` 的功能依赖。
- **口粮配置驱动**：`rationCost`（出发消耗）+ `rationConsumptionRate`（持续消耗），耗尽自动召回。校验内化到 state 层。
- **alpha 不迁移旧存档**：沿用 ADR-0013 决策，旧字段直接丢弃。

## Considered Options

- **保留双轨（`shelter.assigned*` + `hero.logisticsFacilityId` 并存）**：改动最小但维护两套指派系统。否决。
- **全部迁到 hero 侧（移除 `shelter.assigned*`）**：单点存储但查询 O(n) 遍历 heroes。否决，保留缓存索引兼顾 O(1) 查询。
- **`logisticsFacilityId` 保留 string 格式**：改动最小但探索岗需编码 locationId，解析需 split 字符串。否决，结构化对象更类型安全。

## Consequences

- ADR-0007 的"每台设施驻守 1 名英雄"决策得到完整实现。
- `shelter.assignedWatererId`/`assignedExplorerId` 降级为派生缓存，不再是独立真相源。
- 旧存档中 `logisticsFacilityId`（string 格式如 `'smelter_1'`）和 `shelter.assigned*` 直接丢弃，按新默认初始化。
- `SURVIVORS_CONFIG` 保留为剧情档案（ADR-0013），但远征功能不再依赖它。
- `PartySlotModal` 的上阵过滤逻辑 `Boolean(heroState?.logisticsFacilityId)` 不变，覆盖三种指派。
