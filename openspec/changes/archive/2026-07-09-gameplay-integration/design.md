## Context

上一阶段已完成 21 个新物品 + 3 个新幸存者的数据/图标注册，以及被动系统重构。当前状态：
- 9 个种子在 `ITEMS_CONFIG` 中但不在 `CROPS_CONFIG` 中
- 6 个新材料 + 6 个新补给在 `ITEMS_CONFIG` 中但无任何配方使用
- 3 个新幸存者在 `SURVIVORS_CONFIG` 中但无救援事件、梦境信号、真实地点
- 新物品未出现在任何远征掉落表或地表事件奖励中
- 部分新补给（口粮罐头、兴奋剂等）有 `useEffect` 但无来源

本设计聚焦于将这些数据接入完整的游戏循环系统。

## Goals / Non-Goals

**Goals:**
- 为 9 种新种子定义完整的作物数据（生长时间、产出、种子消耗）
- 为 6 个新材料 + 6 个新补给设计合成配方和自动化工序，使它们可通过制造获得
- 为 3 个新幸存者设计救援事件、梦境信号事件、远征探索地点
- 将新材料/补给加入现有远征地点掉落表和地表随机事件奖励池
- 新增 3 个远征探索地点（作为新幸存者的救援/信号目标地点）
- 所有新增数据保持与现有格式完全一致（无架构变更）
- 所有内容均有合理的游戏内产出源（种/造/搜/救）

**Non-Goals:**
- 不改动现有系统架构、接口定义、核心逻辑
- 不新增消耗品 `useEffect` 类型（沿用现有 `stats.hp/food/energy/sanity + pollution`）
- 不修改现有已有内容（不调整已存在的作物/配方/事件的数据平衡）
- 不新增图片资源（新作物使用占位符或复用现有图片）

## Decisions

### 1) 新作物生长时间与产出设计

沿用现有 `CROPS_CONFIG` 格式，生长时间分布在 60–1500s 范围内：

| 作物 ID | 生长时间 | 主要产出 | 次要产出 |
|---------|---------|---------|---------|
| echo_shroom | 90s | mana_dust x2 | glow_fiber x1 |
| magnetic_clover | 180s | rusted_spring x1 | scrap_metal x2 |
| solar_cactus | 360s | plasma_cell x1 | glow_fiber x2 |
| stellar_rose | 540s | dream_shard x2 | mana_dust x2 |
| nebula_moss | 660s | nightmare_tear x1 | aether_pulp x2 |
| storm_sprout | 840s | plasma_arc x1 | plasma_cell x1 |
| crystal_reed | 300s | crystal_silicon x1 | steel_petal x2 |
| shadow_fern | 1080s | void_essence x2 | dream_shard x1 |
| chrono_vine | 1500s | aether_ingot x1 | void_essence x2 |

**原理：** 每种作物的产出直接或间接供给一种新材料/补给，形成"种→造"循环。

### 2) 新配方设计

**合成配方 (RECIPES_CONFIG)：**

| 配方 ID | 材料消耗 | 产出 |
|---------|---------|------|
| aether_ingot_smelt | aether_pulp x3 + scrap_metal x2 | aether_ingot x1 |
| crystal_silicon_refine | crystal_silicon + | — 通过作物直接产出，无需配方 |
| — | — | — |
| ration_deluxe_recipe | ration x2 + aether_pulp x1 | ration_deluxe x1 |
| stimpack_recipe | nanite_injector x1 + glow_fiber x2 | stimpack x1 |
| geiger_counter_recipe | crystal_silicon x1 + scrap_metal x2 | geiger_counter x1 |
| canteen_recipe | alloy_plate x1 + scrap_metal x1 | canteen x1 |
| deflective_lens_recipe | crystal_silicon x1 + mana_dust x3 | deflective_lens x1 |
| dream_lantern_recipe | dream_shard x3 + void_essence x1 | dream_lantern x1 |
| nanite_slurry_recipe | mana_dust x3 + glow_fiber x2 | nanite_slurry x1 |
| plasma_arc_craft | plasma_cell x2 + alloy_plate x1 | plasma_arc x1 |
| rusted_spring_craft | scrap_metal x3 | rusted_spring x2 |

**自动化工序 (AUTO_RECIPES)：**

| 工序 ID | 输入 | 产出 | 时长 | 设施 |
|---------|------|------|------|------|
| craft_rusted_spring | scrap_metal x3 | rusted_spring x2 | 25s | assembler |
| craft_nanite_slurry | mana_dust x3 + glow_fiber x2 | nanite_slurry x1 | 35s | smelter |
| craft_crystal_silicon | steel_petal x3 + mana_dust x1 | crystal_silicon x1 | 40s | smelter |
| craft_aether_ingot | aether_pulp x4 + scrap_metal x2 | aether_ingot x1 | 50s | smelter |
| craft_plasma_arc | plasma_cell x2 + alloy_plate x1 | plasma_arc x1 | 45s | assembler |
| craft_ration_deluxe | ration x2 + aether_pulp x1 | ration_deluxe x1 | 30s | assembler |

### 3) 新远征地点设计

三个新地点对应三个新幸存者的救援场所：

| 地点 ID | 名称 | 需求职业 | 搜刮间隔 | 掉落表 |
|---------|------|---------|---------|-------|
| poison_factory | 废弃制药厂 | engineer (工程师) | 420s | crystal_silicon(0.4), nanite_slurry(0.2), scrap_metal(0.6), ration(0.2) |
| ruined_armory | 坍塌军械库 | guard (卫兵) | 360s | rusted_spring(0.5), alloy_plate(0.3), mana_dust(0.4), seed_crystal_reed(0.15) |
| ancient_library | 旧世大图书馆 | null | 300s | dream_shard(0.3), mana_dust(0.5), nightmare_tear(0.05), seed_stellar_rose(0.1) |

RESCUE_LOCATION_MAP 新增映射：
- poison_factory → rescue_soldier
- ruined_armory → rescue_healer
- ancient_library → rescue_apprentice

### 4) 新幸存者救援/梦境事件设计

**救援事件：**

- `rescue_soldier` (铁卫)：废弃制药厂，描述与变异生化怪物战斗/解救人质。A 选项消耗防御炮塔，B 选项消耗生命+魔能硬闯
- `rescue_healer` (艾拉)：坍塌军械库，描述被倒塌的金属架压住，需纳米修复针或能量补充剂救援
- `rescue_apprentice` (小米)：旧世大图书馆，描述被困在崩塌的书架之间，需口粮或魔能移开障碍

**梦境信号事件：**

- `soldier_signal`：铁卫的梦境信号——表现为钢铁锻造的敲击声与战吼
- `healer_signal`：艾拉的梦境信号——表现为草药清香气与医疗广播音
- `apprentice_signal`：小米的梦境信号——表现为翻书声与收音机杂音

### 5) 掉落表整合策略

将新物品逐步注入现有的远征地点和地表事件掉落表，遵循"1-2 个新物品/地点"原则，避免打断现有的平衡。

- 已有地点掉落表微调：在多个现有地点追加低概率的新材料掉落
- 地表事件奖励微调：在多个 6 类事件（common/danger/combat/welfare/relic/anomaly）中随机替换/追加新资源

### 6) 图片资源决策

新作物不新增专门图片资源，短期允许：
- 无 `image` 属性的情况回落为默认展示（作物名+emoji 占位）
- 或将 `image` 设置为空，由 GameIcon 兜底显示文字

## Risks / Trade-offs

- **[平衡性]** 新数据未经游戏测试，数值（生长时间、配方消耗、掉落率）可能需要后续调整。→ 保持与现有同类数据一致的区段，确保不会大幅改变游戏节奏。
- **[图片缺失]** 新作物无专门 crop_*.jpg 图片。→ 组件层处理 `undefined image` 回退逻辑，显示种子emoji+名字。
- **[范围膨胀]** 一次变更覆盖 5 个领域，可能超出单次改动合理范围。→ 严格限于数据层追加，不涉及系统重构或组件重写。
- **[旧数据冲突]** `expeditionLocations.ts` 中已有 `collapsed_subway`（但名称为"坍塌地铁站"，与巴斯特共用）。→ 新地点使用唯一 ID 避免覆盖。
- **[配方依赖]** 部分新补给（ration_deluxe、stimpack、canteen）需现有物品（ration、nanite_injector）作为原料，与现有配方形成层级依赖。→ 这是正常的合成树，不会造成循环依赖。
