# 统一后勤指派交互为弹窗选英雄

Type: grilling
Status: claimed
Blocked by: (无)

## Question

三种后勤指派（产线驻守/温室浇水/远征探索）的英雄选择交互不统一：

- **产线驻守**（`FacilityCard.tsx:255-289`）：内联展开按钮组（`showGarrisonPicker` 时显示英雄按钮流），展示 hero 名 + dutyMeta 速/产/省角标。
- **温室浇水**（`ShelterTab.tsx:598-616`）：`<select>` 下拉。
- **远征探索**（`ShelterTab.tsx:783-799`）：`<select>` 下拉，已拼接职阶/阵营标签。

**用户已决策：统一为居中弹窗选英雄**。调查结论：无现成通用英雄选择弹窗，`PartySlotModal`（上阵选人）语义相反、不展示职阶/阵营/dutyMeta；建议新建 `DutyAssignModal`（基于 PartySlotModal 3 列网格骨架改造）。

需解决：

1. **DutyAssignModal 的 props 设计**：统一处理三种指派，还是每种指派一个变体？
   - 候选 A：`{ isOpen, heroes, onSelect(heroId), onClose, title }` 通用弹窗，调用方决定 `onSelect` 里调 `assignHeroToDuty` 的哪种 duty。
   - 候选 B：`{ isOpen, dutyType, targetId, onClose }` 内部自己调 `assignHeroToDuty`。
2. **可指派英雄过滤**：只列 `!hero.logisticsFacilityId`（未驻守/未上阵）的英雄。是否也过滤 `wounded`（重伤）？是否过滤已在远征/浇水的？
   - 原型中只列 duty===null。当前产线过滤 `!h.logisticsFacilityId`（`FacilityCard.tsx:130-132`）。统一后确认过滤条件。
3. **卡片内容**：头像 + 名称 + 职阶·阵营标签（`HERO_CLASS_LABELS/HERO_FACTION_LABELS`）+ dutyMeta 加成角标（速/产/省）。与原型一致。
4. **温室浇水交互**：当前是 select（可看所有英雄含在岗的）。改为弹窗后，浇水岗的"解除"按钮保留，弹窗只列可指派英雄。
5. **产线驻守交互**：`showGarrisonPicker` 内联展开改为弹窗。`FacilityUnitCard` 是多个实例（每 unit 一个），弹窗状态如何管理（每卡一个 showState 还是提升到父级）？
6. **弹窗样式**：用 `UI_TOKENS.modalBackdrop/Sub + modalContainerStandard`（对齐全项目）还是保持原型风格？调查显示 PartySlotModal/HeroListModal 未用 token（与全项目不一致），建议顺手统一。

### 调查基线

- `PartySlotModal.tsx`：3 列网格 + createPortal + 选中高亮 + 确认按钮组，是最近模板。
- `UI_TOKENS`：`src/data/uiConstants.ts:9-23`（modalBackdrop/Sub + modalContainerStandard/Compact/Scroll）。
- 现有指派交互：`FacilityCard.tsx:255-289`、`ShelterTab.tsx:598-616`、`ShelterTab.tsx:783-799`。
- 可指派过滤：`FacilityCard.tsx:130-132`。
- 原型交互：`src/components/shelter/prototype.html`（标题栏驻守/派遣按钮 + 居中英雄选择弹窗 + dutyMeta 加成标签）。

### 约束

- 本 ticket 只产出**弹窗组件设计决策**，不写实现代码。
- 需覆盖：props 设计、过滤条件、卡片内容、三处接入点、弹窗样式、多实例状态管理。

## Answer

### 1. DutyAssignModal props：通用回调式（用户决策）

新建 `DutyAssignModal` 组件（基于 `PartySlotModal` 3 列网格骨架改造），props：

```typescript
interface DutyAssignModalProps {
  isOpen: boolean;
  title: string;                 // 弹窗标题（如「指派驻守英雄 · 冶炼炉」「指派浇水操作员」「指派远征探索员」）
  heroes: Record<string, HeroState>;  // 全部英雄（内部过滤可指派）
  onSelect: (heroId: string) => void; // 调用方决定调 assignHeroToDuty 的哪种 duty
  onClose: () => void;
}
```

- 弹窗通用，不耦合 state 层。三种指派接入点各自传 `onSelect` 回调：
  - 产线驻守：`(id) => assignHeroToDuty(id, { type: 'facility', targetId: 'smelter_0' })`
  - 温室浇水：`(id) => assignHeroToDuty(id, { type: 'waterer', targetId: 'greenhouse' })`
  - 远征探索：`(id) => assignHeroToDuty(id, { type: 'explorer', targetId: locationId })`

### 2. 过滤条件：只过滤 logisticsFacilityId（用户决策）

- 只列 `!hero.logisticsFacilityId` 的英雄（未驻守/未上阵/未在岗）。
- **不额外过滤 `wounded`**：重伤英雄仍可驻守后勤（与上阵无关，当前产线过滤即此语义）。
- 与产线现有过滤 `!h.logisticsFacilityId`（`FacilityCard.tsx:130-132`）一致。

### 3. 卡片内容

每张英雄卡（3 列网格，参照 `PartySlotModal:140-201` 骨架）展示：
- 头像：`<GameIcon type="hero" id={heroId} />`
- 名称
- 职阶·阵营标签：`HERO_CLASS_LABELS[cfg.heroClass]` / `HERO_FACTION_LABELS[cfg.faction]`
- dutyMeta 加成角标：`facilitySpeedMultiplier` → 速、`facilityYieldMultiplier` → 产、`facilityCostReduction` → 省（参照 `FacilityCard.tsx:274-277`）
- 数据源：`HEROES_CONFIG[id].heroClass/faction/dutyMeta`（`heroes.ts`）

### 4. 三处接入点

| 场景 | 现有交互 | 改为 |
|---|---|---|
| 产线驻守 | 内联展开按钮组（`FacilityCard.tsx:255-289`） | 标题栏「驻守」按钮 → DutyAssignModal |
| 温室浇水 | select 下拉（`ShelterTab.tsx:598-616`） | 标题栏「驻守」按钮 → DutyAssignModal（「解除」按钮保留） |
| 远征探索 | select 下拉（`ShelterTab.tsx:783-799`） | 标题栏「派遣」按钮 → DutyAssignModal |

### 5. 弹窗样式：用 UI_TOKENS 统一（用户决策）

- 遮罩：`UI_TOKENS.modalBackdrop`（`z-[10000] bg-black/75`）。
- 容器：`UI_TOKENS.modalContainerStandard`（`bg-zinc-900 rounded-2xl w-[92%] max-w-[380px]`）。
- 结构：`createPortal(document.body)` + 点遮罩关闭 + 居中卡片 + Header（X 关闭）+ 可滚动内容区。
- 对齐全项目其他 Modal（PartySlotModal/HeroListModal 未用 token 是历史不一致，新建组件顺手统一）。

### 6. 多实例状态管理

- `FacilityUnitCard` 是多个实例（每 unit 一个）。`showGarrisonPicker` 提升到各卡自身 `useState` 即可（每个 unit 一个弹窗开关），或由 `FacilityTypeSection` 管理。
- 建议：每个 `FacilityUnitCard` 内部 `useState<boolean>` 控制弹窗开关（与当前 `showGarrisonPicker` 同模式，只是从内联展开改为弹窗）。

### 领域术语更新

- **后勤指派弹窗 (Duty Assign Modal)**：选择英雄指派后勤岗位的通用弹窗组件，props 通用回调式，只列可指派英雄（未驻守/未上阵）。

Status: resolved
