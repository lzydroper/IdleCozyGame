# 04-温室UI改造

Type: grilling
Status: resolved
Blocked by: 01, 05

## Question

温室 UI 改造方案（集中在 `src/components/ShelterTab.tsx`）：

1. **种植槽小卡片**：按原型 `card()` 模板（`src/components/shelter/prototype.js` L151-176）改为 `grid grid-cols-2` 小卡片——顶部 glow 线、图标、槽位名、作物名·进度、进度条、收割按钮；作物图标退役，卡片图标直接复用对应**产出物品的 icon**（`GameIcon type="item"`，主产物取 `yields` 第一个键）。
2. **按钮区**：一键手动浇水→「批量浇水」；一键收割并播种→「批量收割」（只收割不播种，改用 `batchHarvest`）；按钮改垂直排列、收割在浇水下方；删除连播选择器与 `replantCropId` 状态及 `handleBatchHarvestAndReplant`。
3. **驻守卡片显示加成**：浇水操作员卡片展示驻守英雄的 dutyMeta 加成（速/产徽章 + 效果文案，如「生长速度 +25%」「收割产量 +25%」）。
4. **挂机区域 UI**：启用/关闭按钮、选种按钮（打开 T05 的 SeedSelectModal）、当前状态文案（所选作物/开启中/种子耗光已停止）；未驻守时禁用并提示。

## Context

- 现状 UI：`ShelterTab.tsx` L363-605（温室 tab）；种植槽是大方格（aspect-square + Sprout 占位）；播种弹窗内联于 L863-925（遍历 CROPS_CONFIG、不隐藏无种子、不走物品系统）；连播选择器 L583-601。
- 原型参考：prototype.js 的 `renderGreenhouse()`（卡片 + 浇水操作员卡片 + 按钮行）。
- 产出 icon 用 `GameIcon type="item" id={主产物}`；种子 icon 同理（seed_ 前缀物品有 sprite，见 `src/data/items/resources.ts`）。
- 挂机区域的状态来自 T03 的 `greenhouse.autoFarm` 与 action（本 ticket 只做展示与交互接线）。
- 飞字特效（`triggerFlyingRewards`）保留；空槽点击播种、单槽收割/浇水保留。

## 实现范围（grill 敲定后）

grill 目标：与用户敲定并记录本 ticket Question 中的决策（卡片信息呈现、按钮布局、加成文案、挂机区域交互）。决策敲定后，实现阶段落实：

- 上述 UI 全部落地；删除连播相关死代码（`replantCropId`、`handleBatchHarvestAndReplant`、连播 select）。
- 组件测试更新（`src/components/ShelterTab.test.tsx`）：卡片渲染、批量浇水/收割按钮、隐藏无种子、挂机区域交互。
- 全量 `npx vitest run` + `npm run build` + `npm run lint` 绿。

## Answer

grilling（HITL）敲定，决策记录：

1. **种植槽小卡片**（原型 card 风格）：`grid grid-cols-2 gap-3`，每卡 = 顶部 emerald glow 线 + 图标 + 槽位名/作物名 + 进度条 + 操作按钮：
   - 有作物：图标 = **主产物产出 icon**（`GameIcon type="item" id={Object.keys(yields)[0]}`，作物图标退役）；副标题 = 作物名 · 进度%；进度条（成熟前 purple / 成熟后 emerald 脉冲）；生长倒计时。
   - **湿润状态**：湿润槽位显示蓝色水滴标记；未湿润（停滞）槽位显示橙色警示水滴 + 「缺水」标记（进度条停住，T01 语义）。
   - 成熟槽：收割按钮（保留单槽收割 + 飞字特效）；未成熟未湿润槽：单槽浇水按钮（保留）。
   - 空槽：占位图标 + 「点击播种」（点击打开 SeedSelectModal）。
2. **按钮区 + 挂机区域**（驻守卡片下方一行 flex）：
   - **左侧垂直列**：批量浇水（上，调 `batchWater`）→ 批量收割（下，调 `batchHarvest`，只收割不播种）。
   - **右侧挂机区域**：启用/关闭开关 + 选种按钮（显示当前所选作物名，打开 SeedSelectModal 选种模式）+ 状态文案（「挂机中：种植 X」「种子已耗光，挂机已停止」「未驻守」）。
   - 未驻守：开关禁用 + 提示「需先指派驻守」；挂机开启：播种按钮/空槽点击禁用（T03 决策）。
3. **驻守卡片**：显示驻守英雄名 + dutyMeta 加成徽章（速/产）+ 效果文案（如「生长速度 +25%」「收割产量 +25%」）；文案体现新职责「自动浇水 / 自动收割并播种 / 特殊加成」（移除「生长翻倍」表述）。
4. **删除**：`replantCropId` 状态、连播 select、`handleBatchHarvestAndReplant`；GameContext 的 `batchHarvestAndReplant` action 一并移除（确认无其他引用后）。
5. **弹窗接入**：播种（title「选择种植作物」→ `plantCrop`）与挂机选种（title「选择挂机作物」、`selectedCropId=autoFarm.cropId` → `setAutoFarmCrop`）复用 SeedSelectModal（T05）。

实现范围（本 ticket）：`ShelterTab.tsx` 温室 tab 重构；删除连播死代码；GameContext action 清理；组件测试更新（卡片渲染/状态标记、批量浇水/收割、挂机区域交互、驻守加成显示）。
