## Why

上一阶段（被动系统重构+数据填充）已将 21 个新物品和 3 个新幸存者加入代码库，但它们没有任何游戏玩法连接：种子不可种植、材料不可合成、幸存者不可遭遇。本变更将这些占位数据接入完整的游戏循环，使新内容真正"可玩"。

## What Changes

- **9 个新作物定义** — 为所有新种子创建 `CROPS_CONFIG` 条目（生长时间、产出、种子消耗）
- **6 个新材料 + 6 个新补给** — 创建合成配方（`RECIPES_CONFIG`）和自动化配方（`AUTO_RECIPES`），包含批量产出配方
- **幸存者消耗品 useEffect** — 为 `purifying_serum`、`hot_stew`、`nanite_injector` 等道具实现实际效果（理智恢复、生命恢复等）
- **3 个新幸存者游戏内出现** — 设计救援事件（`rescueEvents.ts`）、梦境信号事件（`dreamEvents.ts`）、指定现实地点（`expeditionLocations.ts` 新增 3 个地点）
- **掉落表整合** — 新材料/补给加入现有远征地点掉落池和地表随机事件奖励池
- **3 个新远征地点** — 为幸存者救援创建可探索地点，包含独特掉落

## Capabilities

### New Capabilities
- `new-crops`: 定义 9 种新作物的生长参数、产出物、种子消耗
- `new-recipes`: 为新材料和新补给创建合成配方和自动化工序
- `survivor-events`: 为 3 名新幸存者设计救援事件、梦境信号、远征地点
- `loot-tables`: 将新材料、补给加入现有远征掉落表和地表事件奖励

### Modified Capabilities
<!-- None — all areas are new -->

## Impact

- `src/data/crops.ts` — 新增 9 个条目
- `src/data/recipes.ts` — 新增 ~12 个配方
- `src/data/autoRecipes.ts` — 新增 ~6 个自动化工序
- `src/data/rescueEvents.ts` — 新增 3 个救援事件
- `src/data/dreamEvents.ts` — 新增 3 个梦境信号事件
- `src/data/expeditionLocations.ts` — 新增 3 个地点、修改现有地点掉落表
- `src/data/realityEvents.ts` — 修改奖励池
- `src/context/GameContext.tsx` — 新增消耗品效果处理
- 可能需要新增作物图片资源
