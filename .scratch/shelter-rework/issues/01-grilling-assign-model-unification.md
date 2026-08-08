# 后勤指派统一为 logisticsFacilityId 的数据模型与迁移

Type: grilling
Status: claimed
Blocked by: (无)

## Question

当前存在两套并行的指派系统：

1. **已生效的单值岗**（`shelter.assignedWatererId` / `shelter.assignedExplorerId` + `shelter.expedition`）：浇水岗全局 1 人、探索岗全局 1 人，有完整 setter（`assignHeroJob` / `startExpedition` / `stopExpedition`）和 tick 消费（`tick.ts` / `offline.ts`）。
2. **半成品的设施驻守**（`hero.logisticsFacilityId` + `HeroConfig.dutyMeta`）：设计为每台设施 1 人，有数据结构、上阵过滤（`PartySlotModal`）、英雄详情文案（`HeroDetailModal` / `HeroDossierModal`），但**无 setter、产线 tick 不消费**。

**用户已决策：统一为 `hero.logisticsFacilityId` 单一字段**，废除 `shelter.assignedWatererId` / `assignedExplorerId` 双轨。

本 ticket 需解决：

1. **字段格式**：`logisticsFacilityId` 的值空间如何设计，使其能同时表达浇水岗、探索岗、设施驻守三种语义？
   - 候选 A：纯设施 ID（如 `'greenhouse'` / `'smelter_1'` / `'assembler_2'`），探索岗用特殊值如 `'expedition:<locationId>'`。
   - 候选 B：结构化对象 `{ type: 'waterer' | 'explorer' | 'facility', targetId: string }`（需改字段类型）。
   - 候选 C：保留 `logisticsFacilityId` 为字符串但约定前缀（如 `'facility:smelter_1'` / `'expedition:radar_station'` / `'waterer:greenhouse'`）。
2. **浇水岗统一后的语义**：浇水是"驻守温室设施"还是保留为独立概念？统一后"自动浇水"逻辑（当前 `assignedWatererId !== null` -> 全局湿润）如何表达？
3. **探索岗统一后的语义**：探索岗写入 `logisticsFacilityId` 后，`shelter.expedition` 的 `locationId` / `startTime` / `lastScavengeTime` 是否保留在 `shelter` 上（远征是设施级状态还是 shelter 级状态）？
4. **setter 统一**：`assignHeroJob` / `startExpedition` / `stopExpedition` 是否合并为一个统一的 `assignHeroToDuty(heroId, dutyTarget)` / `unassignHeroFromDuty(heroId)`？还是保留各自入口但内部统一写 `logisticsFacilityId`？
5. **排他性**：一个英雄能否同时浇水 + 驻守设施？当前 `assignHeroJob` 会清空双岗位防兼任，统一后是否仍强制单岗？
6. **旧字段迁移**：`shelter.assignedWatererId` / `assignedExplorerId` 移除后，旧存档如何处理？（ADR-0013 定调 alpha 不做迁移，需确认沿用。）
7. **上阵过滤**：`PartySlotModal` 当前查 `heroState?.logisticsFacilityId`，统一后逻辑不变，但需确认所有三种指派都应禁上阵。

### 调查基线

- `assignHeroJob` 实现：`src/state/shelter.ts:14-54`，写 `shelter.assignedWatererId` / `assignedExplorerId` / `shelter.expedition.startTime/lastScavengeTime`，不碰 `logisticsFacilityId`。
- `logisticsFacilityId` 使用点：`src/types/game.ts:54`（定义）、`PartySlotModal.tsx:48`（上阵过滤）、`HeroListModal.tsx:75`（角标）、`initialState.ts:29`（初始 null）。无 setter。
- `getHeroStatus`（`ShelterTab.tsx:204-208`）从 `shelter.assigned*` 派生岗位文案，统一后需改查 `logisticsFacilityId`。
- ADR-0007（设施驻守设计）、ADR-0013（单轨英雄制，alpha 不迁移）。

### 约束

- 本 ticket 只产出**数据模型决策**，不写实现代码。
- 决策需覆盖字段格式、setter 签名、排他性、旧字段处理、上阵过滤一致性。
- dutyMeta 如何接入产线 tick 归 T4，本 ticket 只管"指派状态如何表达"。

## Answer

### 1. 字段格式：结构化对象

`hero.logisticsFacilityId` 从 `string | null` 改为结构化对象：

```typescript
type DutyType = 'waterer' | 'explorer' | 'facility';

interface DutyAssignment {
  type: DutyType;
  targetId: string;  // waterer: 'greenhouse'; explorer: locationId; facility: 'smelter_1' / 'assembler_2'
}

// HeroState.logisticsFacilityId: DutyAssignment | null
```

- **浇水岗**：`{ type: 'waterer', targetId: 'greenhouse' }`
- **探索岗**：`{ type: 'explorer', targetId: locationId }`
- **设施驻守**：`{ type: 'facility', targetId: '${facilityType}_${unitIndex}' }`（如 `'smelter_1'`）

类型安全，解析清晰，无需字符串 split。需同步修改 `PartySlotModal.tsx:48`、`HeroListModal.tsx:75`、`initialState.ts:29`、`heroesDuty.test.ts`、`PartySlotModal.test.tsx` 中的字段使用（从 `Boolean(heroState?.logisticsFacilityId)` 不变，但 mock 数据从 `'smelter_1'` 改为 `{ type:'facility', targetId:'smelter_1' }`）。

### 2. 远征状态位置：保留 shelter.expedition

`shelter.expedition`（`locationId` / `startTime` / `lastScavengeTime`）保留在 shelter 上，不迁移。理由：远征是全局唯一单例（同时只有 1 个远征），属 shelter 级运行状态。hero.logisticsFacilityId 管"英雄能否上阵"，shelter.expedition 管"远征运行进度"，两者分离。

### 3. Setter：全部统一为一个接口

废除 `assignHeroJob` / `startExpedition` / `stopExpedition` 三个入口，统一为：

```typescript
assignHeroToDuty(heroId: string, duty: DutyAssignment | null): boolean
```

内部按 `duty.type` 分支处理：
- **null**（解除）：清 hero.logisticsFacilityId；若原指派是 explorer，同步清 shelter.assignedExplorerId 缓存 + shelter.expedition；若原指派是 waterer，清 shelter.assignedWatererId 缓存。
- **'waterer'**：先清旧岗位（防兼任），写 hero.logisticsFacilityId + shelter.assignedWatererId 缓存。
- **'explorer'**：先清旧岗位；扣口粮（内化到统一接口）；校验地点有效性 + 职业匹配（T2 确定改用 heroClass/faction）；写 hero.logisticsFacilityId + shelter.assignedExplorerId 缓存 + 初始化 shelter.expedition。
- **'facility'**：先清旧岗位；校验目标设施存在 + 原驻守英雄被替换；写 hero.logisticsFacilityId。

### 4. 浇水查询：保留 shelter 缓存索引

`shelter.assignedWatererId` / `shelter.assignedExplorerId` **不废除**，作为缓存索引保留。真相源是 `hero.logisticsFacilityId`，缓存由 `assignHeroToDuty` 维护一致性。

- tick / UI 频繁查询"当前浇水员 / 探索员是谁"时走缓存 O(1)，无需遍历 heroes。
- 缓存与 hero 字段在 `assignHeroToDuty` 内原子同步（先清旧、再设新）。
- **注意**：`shelter.assignedWatererId` / `assignedExplorerId` 是派生缓存，不是独立真相源。读取时等价于"查找 `heroes` 中 `logisticsFacilityId.type === 'waterer'/'explorer'` 的英雄"。

### 5. 排他性：强制单岗

沿用现有逻辑：`assignHeroToDuty` 先清该英雄在所有岗位的占用（hero.logisticsFacilityId 置 null + 对应 shelter 缓存置 null），再设新岗位。一个英雄同一时间只能担任一种后勤职务。

### 6. 旧字段迁移：沿用 alpha 不迁移

沿用 ADR-0013 决策：旧存档中 `shelter.assignedWatererId` / `assignedExplorerId`（string 格式）和 `hero.logisticsFacilityId`（旧 string 格式如 `'smelter_1'`）直接丢弃，按新默认初始化。alpha 阶段不做迁移。

### 7. 上阵过滤：所有三种指派都禁上阵

`PartySlotModal.tsx:48` 现有逻辑 `Boolean(heroState?.logisticsFacilityId)` 不变（非 null 即禁选），覆盖浇水 / 探索 / 设施驻守三种语义。`HeroListModal.tsx:75` 的"后勤"角标同理。

### 领域术语更新（供 domain-modeling 沉淀）

- **后勤指派 (Duty Assignment)**：英雄被指派到浇水岗 / 探索岗 / 设施驻守的统称，统一表达为 `hero.logisticsFacilityId: DutyAssignment | null`。
- **后勤职务类型 (Duty Type)**：`'waterer'`（浇水操作员）/ `'explorer'`（远征探索员）/ `'facility'`（设施驻守员）。

Status: resolved
