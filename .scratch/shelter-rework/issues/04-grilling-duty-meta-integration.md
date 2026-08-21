# dutyMeta 接入产线 tick 的方式

Type: grilling
Status: claimed
Blocked by: 06

## Question

ADR-0007 设计了设施驻守机制：英雄驻守冶炼炉 / 组装台等产线设施时，提供 `dutyMeta` 加成（`facilitySpeedMultiplier` / `facilityYieldMultiplier` / `facilityCostReduction`）。9 个英雄全部配了 `dutyMeta`，但 `processFacility` / `getActualDuration` 完全不消费它。

**用户已决策：补全驻守机制**（dutyMeta 接入产线 tick），但三个字段的具体接入方式"留给 ticket 细讨论"。

本 ticket 需解决：

1. **三个字段的接入公式**：
   - `facilitySpeedMultiplier`（如 0.20 = +20% 速度）：如何缩短 `getActualDuration`？`duration / (1 + multiplier)` 还是 `duration * (1 - multiplier)`？
   - `facilityYieldMultiplier`（如 0.15 = +15% 产量）：产出数量如何增加？`floor(qty * (1 + multiplier))` 还是 `qty + ceil(qty * multiplier)`？小数如何处理？
   - `facilityCostReduction`（如 0.10 = -10% 原料）：原料消耗如何降低？`floor(qty * (1 - reduction))` 还是 `max(1, qty - ceil(qty * reduction))`？最低消耗 1 还是允许 0？
2. **加成来源聚合**：`dutyMeta` 是否是唯一的产线加成来源？当前 `getActualDuration` 还有 `speedBonus = 1 + level * 0.1`（设施等级加成），两者如何叠加？加算还是乘算？
3. **驻守 UI**：FacilityCard 中如何增加"指派驻守英雄"的入口？
   - 当前 `FacilityUnitCard`（`FacilityCard.tsx:73-361`）只有配方入队 / 队列管理 / 升级 / 扩建 / 启停，无英雄指派 UI。
   - 指派后如何展示驻守英雄（头像 + dutyMeta 加成预览）？
   - 是否复用 T1 统一的 `assignHeroToDuty` setter？
4. **多设施多英雄**：冶炼炉有多个 unit（`smelter_1` / `smelter_2`），每个 unit 是否可独立驻守 1 名英雄？还是按设施类型（所有冶炼炉共享 1 名）？
5. **驻守解除**：英雄被指派到战斗小队时是否自动解除驻守？还是必须手动解除后才能上阵？（当前 `PartySlotModal` 只是禁止选入，不解锁。）
6. **dutyMeta 数值平衡**：9 个英雄的现有配置值在新公式下是否合理？是否需要调整？

### 调查基线

- `HeroDutyMeta`：`src/data/heroes.ts:9-13`，三个可选字段。
- 9 英雄 dutyMeta 配置：`heroes.ts:69,83,97,111,125,139,153,167,181`（如 nova +25% 速度、buster +20% 产量、soldier -15% 原料）。
- `processFacility`：`src/state/facility.ts:48-123`，纯函数，入参 `(fac, inventory, seconds)`，不接收英雄参数。
- `getActualDuration`：`src/state/facility.ts:15-19`，`recipe.duration / (1 + level * 0.1)`。
- `FacilityCard.tsx`：`SmelterCard` / `AssemblerCard`（`:440-471`）-> `FacilityTypeSection`（`:366-435`）-> `FacilityUnitCard`（`:73-361`），无英雄指派 UI。
- `FacilityCard` 注释（`:104-105`）："产线纯自动：效率由设施等级决定" -- 与 ADR-0007 矛盾，需更新。

### 依赖

- Blocked by T6（FacilityCard / 产线架构调研）：需先了解 FacilityCard 完整结构和 `processFacility` 数据流，才能确定接入点。
- 与 T1（指派统一模型）强关联：setter 是否复用、字段格式是否一致。但 T1 管状态表达、T4 管加成消费，可并行推进。

### 约束

- 本 ticket 只产出**dutyMeta 接入设计决策**，不写实现代码。
- 需覆盖：三字段接入公式、加成聚合、驻守 UI、多设施语义、解除逻辑、数值平衡。

## Answer

### 1. 三字段接入公式：乘算 + 下取整 + 最低 1

基于 T6 调研的推荐方案（C+A 组合），三字段接入公式如下：

- **`facilitySpeedMultiplier`**（速度，如 0.25 = +25%）：
  - 公式：`duration / ((1 + level * 0.1) * (1 + speedMultiplier))`
  - 与设施等级加成**乘算**叠加：`(1+level*0.1)` 是等级系数，`(1+speedMult)` 是驻守系数，两者相乘。
  - 实现方式：`getActualDuration` 扩展第三参 `speedMultiplier = 0`，`Math.max(1, Math.floor(recipe.duration / ((1 + level*0.1) * (1 + speedMultiplier))))`。

- **`facilityYieldMultiplier`**（产量，如 0.20 = +20%）：
  - 公式：`Math.floor(qty * (1 + yieldMultiplier))`
  - 下取整：产出数量为整数，小数丢弃。
  - 实现方式：`processFacility` 产出环节（`facility.ts:81-84` `head.reward`）按此公式调整 qty。

- **`facilityCostReduction`**（原料，如 0.15 = -15%）：
  - 公式：`Math.max(1, Math.floor(qty * (1 - costReduction)))`
  - 下取整 + 最低消耗 1：每种原料至少消耗 1 个，不允许 0。
  - 实现方式：`processFacility` 扣料环节（`facility.ts:95/104` `consumeInputs`）按此公式调整 qty。

### 2. 加成来源聚合

- **等级加成**（`1 + level * 0.1`）与 **dutyMeta 速度加成**（`1 + speedMultiplier`）**乘算**叠加。
- dutyMeta 是产线加成的**唯一英雄来源**（远征不接入 dutyMeta，T2 已决议）。
- 多个 dutyMeta 字段可同时生效（如 catherine 有 `facilitySpeedMultiplier: 0.15` + `facilityYieldMultiplier: 0.10`，两个字段独立计算）。

### 3. 注入点（T6 调研方案 C+A）

- **新增 `resolveDutyBonus(state, type, unitIndex) -> HeroDutyMeta | null`**（放 `src/state/facility.ts`）：解析 `DutyAssignment { type: 'facility', targetId: '${type}_${index}' }`（T1 决议格式），反查 `state.heroes` 找到驻守英雄，返回其 `dutyMeta`。
- **`getActualDuration` 扩展第三参** `speedMultiplier = 0`：保持向后兼容（UI 不传时行为不变）。
- **`processFacility` 扩展第四参** `dutyMeta?: HeroDutyMeta`：内部影响 duration（:72/113）、reward qty（:81-84）、cost qty（:95/104）。
- **`tick.ts:115` / `offline.ts:215`** 调用 `processFacility` 前先 `resolveDutyBonus(state, type, unitIndex)` 传入。

### 4. 驻守 UI

- **插入位置**：`FacilityUnitCard` 标题栏区域（`FacilityCard.tsx:141-192`），在副信息行（:151-155）下方，与"效率 XX%"（:152）并列展示驻守英雄徽章。
- **展示内容**：驻守英雄头像 + 名称 + dutyMeta 加成预览（如"+25% 速度"）。
- **交互入口**：点击徽章弹出英雄选择器。选择器复用 `PartySlotModal` 模式或新增轻量选择器，过滤掉已驻守其他设施/已上阵的英雄。
- **未驻守状态**：显示"点击指派驻守英雄"占位。
- **文案**：使用"驻守"而非"指派"（避开 `FacilityCard.test.tsx:27` 的断言 `/指派.*产线|派遣.*设施/`，或更新该断言）。
- **调用**：点击选择英雄后调用 `assignHeroToDuty(heroId, { type: 'facility', targetId: '${type}_${index}' })`（T1 统一 setter）。解除驻守调用 `assignHeroToDuty(heroId, null)`。

### 5. 多设施语义：每 unit 独立驻守

每个 unit（如 `smelter_1`、`smelter_2`）可独立驻守 1 名英雄，各提供独立加成。与 ADR-0007"每台设施可驻守 1 名英雄"一致。扩建多台设施的意义在于可同时驻守多名英雄、获得多份加成。

- `DutyAssignment.targetId` 格式 `'${facilityType}_${unitIndex}'`（T1 决议）。
- `resolveDutyBonus(state, type, unitIndex)` 按 targetId 精确匹配。
- 扩建新 unit 时（`expandFacilityUpdate`），新 unit 初始无驻守（T6 确认）。

### 6. 驻守解除逻辑

- **手动解除**：在 FacilityUnitCard 驻守徽章上提供"解除"按钮，调用 `assignHeroToDuty(heroId, null)`。
- **自动解除**：英雄被指派到其他岗位（浇水/探索/其他设施）时，`assignHeroToDuty` 内部先清旧岗位（T1 决议的排他性），自动解除原设施驻守。
- **上阵不自动解除**：英雄驻守中禁止选入战斗小队（`PartySlotModal` 过滤，T1 决议），需手动解除后才能上阵。不自动解除避免误操作丢失驻守配置。

### 7. dutyMeta 数值平衡

9 个英雄的现有 dutyMeta 配置在新公式下评估：

| 英雄 | dutyMeta | 新公式效果 |
|---|---|---|
| nova | speed +25% | duration / 1.25（约 -20% 耗时） |
| buster | yield +20% | 产出 × 1.2（下取整） |
| soldier | cost -15% | 原料 × 0.85（最低 1） |
| catherine | speed +15%, yield +10% | duration / 1.15, 产出 × 1.1 |
| roy | speed +30% | duration / 1.30（约 -23% 耗时） |
| mei | yield +25% | 产出 × 1.25 |
| zero | speed +20% | duration / 1.20 |
| healer | cost -20% | 原料 × 0.80（最低 1） |
| apprentice | yield +15%, cost -10% | 产出 × 1.15, 原料 × 0.90 |

数值合理，无需调整。roy（+30% 速度）最强但需救援获取；mei（+25% 产量）是温室最佳人选（与浇水推荐一致）。具体数值微调归汇编 spec（T7）时如有需要再定。

### 领域术语更新

- **设施驻守加成 (Facility Duty Bonus)**：英雄驻守产线设施时通过 `dutyMeta` 提供的三种加成（速度 / 产量 / 原料），与设施等级加成乘算叠加。
- **驻守解除 (Duty Release)**：手动或自动（指派到其他岗位时）解除英雄的设施驻守状态。

Status: resolved
