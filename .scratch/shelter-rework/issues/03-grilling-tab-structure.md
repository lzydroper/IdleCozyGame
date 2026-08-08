# 分 tab 结构与设计语言

Type: grilling
Status: claimed
Blocked by: (无)

## Question

当前 `ShelterTab` 是单一长滚动页面，区块顺序：资源指示器 → 梦魇警报 → 基建升级 → 温室 → 产线 → 远征 → 后勤日志。

**用户已决策：全页分 tab**，对齐工坊（`WorkshopCategoryBar`）和背包（`LogTab`）的设计语言。

本 ticket 需解决：

1. **Tab 划分**：确切的 tab 列表与每个 tab 的内容边界。
   - 候选：基建（基建升级 + 梦魇警报？）/ 温室 / 产线 / 远征 -- 4 个 tab。
   - 梦魇警报（`DreamLeakAlertPanel`）是常驻顶部还是归入某个 tab？
   - 顶部资源指示器（废旧金属 / 合金板 / 口粮 / 魔能）**用户已要求移除**，移除后魔能储备信息是否迁到别处？
2. **Tab 组件复用**：是否直接复用 `WorkshopCategoryBar`？还是新建 `ShelterCategoryBar`？tab 的图标 / 标签 / 计数如何设计？
   - 工坊的 tab 有计数（可见配方数），后勤的 tab 是否也需要计数（如"可收割 N 个作物" / "远征进行中"）？
3. **每个 tab 内部布局**：
   - 基建 tab：基建升级列表（当前 `max-h-64 overflow-y-auto`）是否仍需内部滚动，还是 tab 切换后全展示？
   - 温室 tab：培养槽网格 + 浇水操作员指派 + 一键操作。浇水指派 UI 是否随 T1 统一模型而变？
   - 产线 tab：`SmelterCard` + `AssemblerCard`。是否随 T4（dutyMeta 接入）增加设施驻守 UI？
   - 远征 tab：随 T2 重设计。
4. **设计语言统一**：当前 ShelterTab 各 section 用了不一致的样式（`bg-gradient-to-b from-zinc-900/90 to-zinc-950/90` vs `bg-zinc-900/60`，`rounded-3xl` vs `rounded-2xl`，标题颜色 cyan/emerald/amber 混用）。分 tab 后如何统一？
   - 是否定义 `shelter/constants.ts`（类比 `workshop/constants.ts`）收纳 tab 配置和样式 token？
5. **"后勤工作日志"移除**：**用户已要求移除**（日志 tab 已提供完整功能）。移除后 `log.type === 'logistics'` 的日志是否仍写入（供日志 tab 的"后勤"分类过滤）？还是连日志分类也移除？

### 调查基线

- `WorkshopTab`：`src/components/workshop/WorkshopTab.tsx`，`WorkshopCategoryBar` + 配方网格，分类栏 + 空态。
- `WorkshopCategoryBar`：`src/components/workshop/WorkshopCategoryBar.tsx`，5 类按钮，计数显示。
- `LogTab`：`src/components/LogTab.tsx`，分类过滤含 `logistics` 分类（`:139`）。
- ShelterTab 当前区块：资源指示器（`:324-354`）、梦魇警报（`:357`）、基建（`:359-435`）、温室（`:437-690`）、产线（`:692-703`）、远征（`:705-917`）、日志（`:919-945`）。
- `THEME_MAP` / `getTheme`（`ShelterTab.tsx:51-91`）：基建升级的配色硬编码。

### 约束

- 本 ticket 只产出**分 tab 结构决策**，不写实现代码。
- 需覆盖：tab 列表与边界、组件复用方案、内部布局、设计语言统一、日志移除确认。
- 温室浇水指派 UI 随 T1、产线驻守 UI 随 T4，本 ticket 只定 tab 框架。

## Answer

### 1. Tab 划分与梦魇警报位置

**4 个 tab**：基建 / 温室 / 产线 / 远征。梦魇警报（`DreamLeakAlertPanel`）常驻顶部（tab 栏上方），不受 tab 切换影响。

| Tab | 内容 |
|---|---|
| 基建 | 基建升级（电池/发电机/回收站） |
| 温室 | 培养槽网格 + 浇水操作员指派 + 一键操作 |
| 产线 | 冶炼炉（SmelterCard）+ 组装台（AssemblerCard），含设施驻守 UI（T4） |
| 远征 | 远征派遣/召回面板（T2 重设计） |

- 梦魇警报常驻顶部：紧急事件始终可见，与 workshop-rework ticket 05 的迁入决策一致。
- 顶部资源指示器（废旧金属/合金板/口粮/魔能储备）**全部移除**，魔能储备不迁移（玩家可在其他地方查看）。
- 后勤工作日志区块**移除**（日志 tab 已提供完整功能）。

### 2. 顶部资源指示器移除

- 废旧金属 / 合金金属板 / 压缩口粮：在背包中可见，移除无影响。
- 魔能储备（`energy` / `maxEnergy`）：不迁移，直接移除。玩家可在梦境探索页或其他状态栏查看。
- 相关代码（`ShelterTab.tsx:324-354`）整段删除。

### 3. Tab 组件复用与状态计数

- 新建 `ShelterTabBar` 组件（类比 `WorkshopCategoryBar`），复用其设计语言（按钮样式、active 态、过渡动画）。
- **状态计数**：每个 tab 显示状态指示而非数量计数：
  - 基建：无计数（或显示可升级数）
  - 温室：可收割作物数（如"3"表示 3 个作物可收割）
  - 产线：队列中配方数 / 总容量（如"2/5"）
  - 远征：进行中显示"进行中"标签，未派遣无计数
- Tab 配置（id / 标签 / 图标 / 计数 selector）归 `shelter/constants.ts`（类比 `workshop/constants.ts`）。

### 4. 每个 tab 内部布局

- **基建 tab**：基建升级列表，移除内部 `max-h-64 overflow-y-auto`，tab 切换后全展示（内容不多）。
- **温室 tab**：培养槽网格（`grid grid-cols-2`）+ 浇水操作员指派（随 T1 统一为 `assignHeroToDuty`）+ 一键操作按钮。
- **产线 tab**：`SmelterCard` + `AssemblerCard`，移除内部 `max-h-[500px] overflow-y-auto`，增加设施驻守 UI（T4）。
- **远征 tab**：英雄卡片式选择 + 地点卡片式选择（T2 重设计）。
- 各 tab 内不再有嵌套滚动区域，整体页面仅 tab 栏固定 + 内容区滚动。

### 5. 设计语言统一

- **统一 section 样式**：当前混用 `bg-gradient-to-b from-zinc-900/90 to-zinc-950/90` 和 `bg-zinc-900/60`。统一为 `bg-zinc-900/60 border border-zinc-800 rounded-3xl`（对齐 WorkshopTab 的 `p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md`）。
- **统一标题样式**：当前 cyan/emerald/amber 混用。改为每个 tab 用统一标题色（`text-zinc-100` 或 tab 主题色），副标题用 `text-zinc-400`。
- **`THEME_MAP` / `getTheme`**（`ShelterTab.tsx:51-91`）：基建升级配色硬编码迁入 `SHELTER_UPGRADES` 数据配置或 `shelter/constants.ts`（归 T5 硬编码清理）。
- **`shelter/constants.ts`**：收纳 tab 配置、样式 token、toast 文案（类比 `workshop/constants.ts`）。

### 6. 后勤日志移除 + logistics 分类保留

- **ShelterTab 内的日志区块**（`:919-945`）整段移除。
- **`log.type === 'logistics'` 分类保留**：后勤操作（播种/收割/升级/派遣等）仍写入 `log.type='logistics'`，供日志 tab（`LogTab.tsx:139`）的"后勤"分类过滤显示。
- **`addLog` 调用保留**：ShelterTab 各操作中的 `addLog(..., 'logistics')` 调用不变，仅移除日志展示区块。

### 7. 组件拆分

参照 workshop-rework 的组件拆分模式，将 ShelterTab 拆为：
- `src/components/shelter/ShelterTab.tsx`（容器 + tab 栏 + 路由）
- `src/components/shelter/ShelterTabBar.tsx`（tab 栏）
- `src/components/shelter/BaseUpgradeSection.tsx`（基建 tab）
- `src/components/shelter/GreenhouseSection.tsx`（温室 tab）
- `src/components/shelter/ExpeditionSection.tsx`（远征 tab）
- `src/components/shelter/constants.ts`（tab 配置 + 样式 token + toast 文案）
- 产线 tab 复用现有 `FacilityCard.tsx`（含 T4 驻守 UI 改造）
- `DreamLeakAlertPanel.tsx` 保留原位（常驻顶部）

Status: resolved
