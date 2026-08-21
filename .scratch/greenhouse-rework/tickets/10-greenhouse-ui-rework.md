# 10 — 温室 UI 重构

**What to build:** 温室页按原型改为小号卡片种植槽：卡片显示主产物产出 icon、作物名、进度条、湿润/缺水状态与单槽操作按钮；按钮区改为驻守卡片下方一行——左侧垂直排列「批量浇水」（上）与「批量收割」（下，只收割不播种），右侧为挂机区域（启用/关闭开关、选种按钮、状态文案）；驻守卡片显示英雄特殊加成徽章与效果文案；删除连播选择器及相关死代码；播种与挂机选种接入 09 弹窗。

**Blocked by:** 06, 07, 08, 09

**Status:** resolved

- [x] 种植槽小卡片（grid-cols-2，原型 card 风格）：主产物产出 icon（GameIcon，作物图标退役）、进度条、生长倒计时、单槽收割/浇水按钮；湿润蓝色水滴、未湿润「缺水」橙色警示
- [x] 空槽卡片：占位 + 「点击播种」，点击打开 09 弹窗；挂机开启时空槽显示「挂机托管中」并禁用播种
- [x] 按钮区一行 flex：左侧批量浇水（上）/批量收割（下，只收割不播种）；右侧挂机区域（开关/选种/状态文案，未驻守禁用启用按钮并提示）
- [x] 驻守卡片显示 dutyMeta 加成徽章（生长速度/收割产量/产线原料）与效果文案；移除「生长翻倍」表述
- [x] 删除连播选择器、replantCropId、handleBatchHarvestAndReplant；GameContext 移除 batchHarvestAndReplant action；greenhouse.ts 删除 batchHarvestAndReplantUpdate
- [x] 播种与挂机选种接入 SeedSelectModal（`seedModal` 状态区分 plant/autofarm 模式）
- [x] 组件测试更新（ShelterTab.test.tsx 8 条：卡片/按钮/挂机区域/缺水湿润/指派驻守加成/挂机流程）；`npx tsc -b` 通过；全量 vitest 除装备系统 3 个 baseline 既有失败外全绿（546 passed）
