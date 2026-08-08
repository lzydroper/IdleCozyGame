# 后勤页面 UI 打磨规范（shelter-ui-polish）

Status: ready-for-agent

## Problem Statement

shelter-rework 落地后，后勤页面仍有四个 UI 缺陷与原型不一致：

1. **三种后勤指派交互不统一**：产线驻守用内联展开按钮组（`FacilityCard.tsx:255-289`）、温室浇水用 `<select>` 下拉（`ShelterTab.tsx:598-616`）、远征探索用 `<select>` 下拉（`ShelterTab.tsx:783-799`）。原型验证的是「标题栏带背景色按钮 + 居中弹窗选英雄」。
2. **基建升级项信息显示混乱**：下一级消耗在升级按钮内和详情区重复显示（`ShelterTab.tsx:405-410` vs `:421`）；消耗显示 item id（`scrap_metal`）而非物品名。
3. **远征未派遣状态用步骤引导**：「步骤1 指派英雄 → 步骤2 选地点 → 步骤3 消耗提示」的引导式布局 + select 下拉（`ShelterTab.tsx:778-905`），与原型（标题栏派遣按钮 + 弹窗 + 卡片式选地点）差异大。
4. **图标映射仍硬编码**：`UPGRADE_ICONS`（`ShelterTab.tsx:47-54`）是组件内 `Record<string, React.ReactNode>` 映射表；`THEME_COLORS`（`:57-91`）按 glow 色值查配色。虽从配置查 key 但表本身还在组件文件里，新增升级项需改组件代码。

## Solution

将后勤页面 UI 打磨至与原型一致：① 新建 `DutyAssignModal` 通用英雄选择弹窗，统一三种指派交互；② 修复基建升级项信息显示（按钮只显「升级」、消耗明细放详情区、显示物品名）；③ 远征未派遣状态按原型重构（标题栏派遣按钮 + 弹窗 + 卡片式地点选择）；④ 图标映射解耦到 GameIcon 注册表（`upgrade` 类型 + `LucideIcon` 引用 + 全站统一配色）。

## User Stories

### 图标解耦

1. 作为开发者，我想在 `SHELTER_UPGRADES` 配置里用 `icon: LucideIcon` 声明升级项图标，这样新增升级项不需要改组件代码。
2. 作为开发者，我想通过 `<GameIcon type="upgrade" id={upgrade.id} />` 渲染升级项图标，这样复用统一的 sprite→Lucide→汉字三级回退机制。
3. 作为开发者，我想升级项配色全站统一，这样不需要为每个升级项单独配置颜色。

### 统一指派弹窗

4. 作为玩家，我想点击产线设施的「驻守」按钮弹出英雄选择弹窗，这样我可以看到所有可指派英雄及其职阶/阵营/加成。
5. 作为玩家，我想点击温室浇水操作员的「驻守」按钮弹出英雄选择弹窗，这样与产线交互一致。
6. 作为玩家，我想点击远征的「派遣」按钮弹出英雄选择弹窗，这样与产线/温室交互一致。
7. 作为玩家，我想弹窗里只显示未驻守/未上阵的英雄，这样我不会误选已在岗的英雄。
8. 作为玩家，我想看到每个英雄的职阶·阵营标签和 dutyMeta 加成角标，这样我可以判断哪个英雄最适合该岗位。

### 基建升级项信息显示

9. 作为玩家，我想升级按钮只显示「升级」，这样按钮简洁不拥挤。
10. 作为玩家，我想在卡片详情区看到下一级消耗明细（物品名而非 id），这样我知道需要准备什么材料。
11. 作为玩家，我想在详情区同时看到当前效果和下一级效果，这样我可以决策是否升级。

### 远征未派遣状态

12. 作为玩家，我想在远征卡片标题栏看到「派遣」按钮，点击弹出英雄选择弹窗选探索员。
13. 作为玩家，我想已选探索员后标题栏显示「探索员：XXX」和「更换」按钮，这样我可以重新选择。
14. 作为玩家，我想以卡片形式选择远征地点（展示间隔/掉落/门槛/口粮），这样我可以对比各地点。
15. 作为玩家，我想已派遣状态时标题栏有红色「召回」按钮，这样与未派遣状态交互一致。

## Implementation Decisions

### 1. 图标解耦到 GameIcon 注册表

- `types/config.ts` 的 `UpgradePath.icon?: string` 改为 `icon?: LucideIcon`（同 `HEROES_CONFIG.icon: LucideIcon` 模式）。
- `GameIconType` 新增 `'upgrade'`，`ICON_SOURCE_REGISTRY` 新增 `{ source: (id) => SHELTER_UPGRADES[id], expectsSprite: false }`。
- 升级项渲染用 `<GameIcon type="upgrade" id={upgrade.id} className="w-4 h-4 text-cyan-400" />`。
- **全站统一一套 cyan 配色**：
  - 删除 `SHELTER_UPGRADES.theme` 字段。
  - 删除 `THEME_COLORS` 表、`UPGRADE_ICONS` 表、`getUpgradeIcon`、`accentText` 派生。
  - `getTheme` 返回固定配色（iconBg: 'bg-cyan-950/50', iconBorder: 'border-cyan-500/30', buttonClass 三态）。
  - 卡片顶部条纹固定 `bg-cyan-500/30`。
- `SHELTER_UPGRADES` 5 个升级项更新 `icon`（Battery/Zap/RefreshCw/Flame/Cpu）并删除 `theme`。
- `ShelterTab` 清理 `Battery`/`Zap`/`RefreshCw`/`Settings` 直接 import（改由配置引用）。

### 2. DutyAssignModal 通用英雄选择弹窗

- 新建 `DutyAssignModal`（基于 `PartySlotModal` 3 列网格骨架）：
  ```typescript
  interface DutyAssignModalProps {
    isOpen: boolean;
    title: string;
    heroes: Record<string, HeroState>;
    onSelect: (heroId: string) => void;
    onClose: () => void;
  }
  ```
- 过滤条件：只列 `!hero.logisticsFacilityId`（不过滤 wounded）。
- 卡片内容：头像（GameIcon hero）+ 名称 + 职阶·阵营标签（`HERO_CLASS_LABELS`/`HERO_FACTION_LABELS`）+ dutyMeta 角标（速/产/省）。
- 弹窗样式：`UI_TOKENS.modalBackdrop` + `modalContainerStandard`，createPortal 到 body。
- 三处接入：
  - 产线驻守（FacilityCard）：标题栏「驻守」按钮 → 弹窗，`onSelect: (id) => assignHeroToDuty(id, { type: 'facility', targetId: '${type}_${index}' })`。替换内联 `showGarrisonPicker` 按钮组。
  - 温室浇水（ShelterTab）：标题栏「驻守」按钮 → 弹窗，`onSelect: (id) => assignHeroToDuty(id, { type: 'waterer', targetId: 'greenhouse' })`。「解除」按钮保留。
  - 远征探索（ShelterTab）：标题栏「派遣」按钮 → 弹窗，`onSelect: (id) => setSelectedExpExplorerId(id)`（实际派遣走 startExpedition 流程）。
- FacilityUnitCard 多实例：各卡自身 `useState` 控制弹窗开关。

### 3. 基建升级项信息显示

- 升级按钮只显示「升级」（或「已满级/MAX」），移除内嵌 GameIcon + qty。
- 详情区统一显示：
  ```
  当前效果  {currentConfig.effectText}
  下一级    {nextConfig.effectText}
  下一级消耗  {ITEMS_CONFIG[item]?.name || item}×{qty} · ...
  ```
- 消耗用物品名（`ITEMS_CONFIG[item]?.name || item`），多材料「 · 」分隔。
- 未解锁升级项继续隐藏（保持 filter 逻辑）。

### 4. 远征未派遣状态重构

- 未派遣状态（原步骤1/2/3 移除）：
  - 标题栏右侧「派遣」按钮（cyan）→ DutyAssignModal 选探索员。
  - 已选后标题栏显示「探索员：{name} [职阶 · 阵营]」+「更换」按钮。
  - 卡片主体：地点卡片列表（名称/门槛徽章/间隔/拾得/口粮）+ 口粮提示 + 开始派遣按钮。
- 已派遣状态：召回按钮移标题栏（红色 `bg-rose-500/10`），移除底部全宽召回按钮。
- 地点卡片选中/门槛警告逻辑保留。

### 5. 数据文件变更清单

- `src/types/config.ts`：`UpgradePath.icon?: string` → `icon?: LucideIcon`；删除 `theme`。
- `src/data/shelterUpgrades.ts`：5 项 icon 改 Lucide 引用，删除 theme。
- `src/components/GameIcon.tsx`：`GameIconType` 加 `'upgrade'`，注册表加一行。
- `src/components/DutyAssignModal.tsx`：新建。
- `src/components/FacilityCard.tsx`：驻守按钮改弹窗，删除 `showGarrisonPicker` 内联组。
- `src/components/ShelterTab.tsx`：删除 `UPGRADE_ICONS`/`THEME_COLORS`/`getUpgradeIcon`/`accentText`；温室浇水改弹窗；远征重构。

## Testing Decisions

### 测试原则

只测试外部行为，不测试实现细节。优先复用现有测试 seam。

### 测试 seam

1. **UI 层**（组件测试）：
   - `DutyAssignModal`：渲染可指派英雄、职阶/阵营/加成标签、点击 onSelect 回调、空态（无可用英雄）。
   - `ShelterTab`：温室浇水弹窗（驻守按钮打开弹窗、选英雄后指派）；远征未派遣（派遣按钮、已选后显示探索员+更换、开始派遣 disabled 逻辑）；基建升级卡（按钮只显升级、详情区消耗物品名）。
   - `FacilityCard`：驻守按钮打开弹窗、选英雄后驻守、解除按钮。
   - 先例：`PartySlotModal.test.tsx`、`ShelterTab.test.tsx`、`FacilityCard.test.tsx`。

### 测试适配

- `ShelterTab.test.tsx`：基建 tab 断言适配（升级按钮文案变化）。
- `FacilityCard.test.tsx`：驻守交互断言更新（内联按钮组 → 弹窗）。

## Out of Scope

- **锁定升级卡片**：未解锁升级项继续隐藏，不加锁定卡片（用户决策）。
- **弹窗复用抽象**：不抽公共 HeroCard（调查结论：当前一次需求不必过度抽象，未来有第三个"选英雄"弹窗可回看）。
- **其他 tab 的 select → 弹窗改造**：仅后勤三种指派（产线/温室/远征），不动工坊/背包等其他页面的选择器。
- **GameIcon 其他类型重构**：不动 item/hero/enemy/zone 现有注册逻辑，仅新增 upgrade 类型。

## Further Notes

- 本 spec 基于 wayfinder 地图 `.scratch/shelter-ui-polish/` 的 4 个决策 ticket（T01-T04）汇编而成。
- 原型：`src/components/shelter/prototype.html`（验证的交互：标题栏驻守/派遣按钮 + 居中英雄选择弹窗 + dutyMeta 加成标签）。
- `DutyAssignModal` 建议新建于 `src/components/`（与 PartySlotModal 同级），不放入 `shelter/` 子目录（它是通用组件）。
