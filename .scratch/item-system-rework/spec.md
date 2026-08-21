# 物品系统重构 Spec：四分类、全面物品化与单一真相源

Status: ready-for-agent

## Problem Statement

物品系统存在三类结构性问题，玩家与开发者都受影响：

1. **分类语义错乱**：背包物品分五类（seed/material/food/equipment/special），其中「装备」类混入大量消耗品（能量补充剂、废土肾上腺素、军用水壶等），玩家切到「装备」页看到的不是装备；种子被归入「材料」页、梦境碎片被归入「碎片」页，分类靠 UI 匹配函数纠偏，玩家直觉与页面内容对不上。
2. **经济实体游离于背包**：灵魂残响、共鸣碎片、英雄专属灵魂碎片是背包外的隐藏字段，玩家在背包中看不到自己的召唤货币与升星素材；而奥术星体又走背包——同类资源两套存储，玩家无法统一管理。
3. **数据配置零碎（开发者视角）**：同一物品的定义分散在元数据表、图标索引表、Lucide 回退表与各处掉落/配方引用中；12 件系列装备双份定义；存在 sprite 索引冲突、无物品定义的装饰图标、无人引用的贴图、死字段与作物单图遗留，改一处容易漏一处。

## Solution

1. **四分类**：物品分类收敛为「道具 / 资源 / 碎片 / 装备」四类（数据层枚举 `'item' | 'resource' | 'shard' | 'equipment'`），背包分类页直接绑定枚举，删除匹配函数。语义边界：道具=可主动使用（食物/药剂/部署装置）；资源=生产消耗物（原料/种子/货币）；碎片=英雄碎片与觉醒素材；装备=系列装备本体与装备生态（强化素材/图纸）。
2. **全面物品化**：灵魂残响（`soul_echo`）、共鸣碎片（`resonance_shard`）、英雄专属灵魂碎片（`shard_<heroId>`，每英雄一个背包条目）进入 `inventory`；召唤、升星、战斗掉落、离线结算全部改读背包。体力与胶囊充能保持独立资源不物品化。
3. **单一真相源**：物品定义重组为分域目录（道具/资源/碎片/装备各一文件 + 聚合注册表），sprite 图标索引并入物品定义；装备物品条目由装备配置派生，不再双份定义；新增物品只需改一处。
4. **作物清理**：删除作物单图引用与图片文件，作物图标以 Lucide 占位（后续补 sprite 时走统一配置）。
5. **旧存档**：不做任何兼容，读取时按新默认初始化（alpha 阶段，旧档均为测试数据）。

## User Stories

1. As a player, I want the backpack to have four category tabs（道具/资源/碎片/装备）, so that items are grouped by intuitive semantics instead of the current confusing five-way split.
2. As a player, I want consumables like energy refills and stimpacks to appear under the「道具」tab instead of「装备」, so that I can find usable items where I expect them.
3. As a player, I want seeds to appear under the「资源」tab, so that production inputs are grouped with other consumable-by-production items.
4. As a player, I want the Dream Shard（梦境碎片）to appear under「资源」, so that items whose name contains "shard" but are not hero shards are not misleadingly filed under「碎片」.
5. As a player, I want my Soul Echoes（灵魂残响）to be visible in the backpack, so that I can see my summon currency while managing inventory.
6. As a player, I want my Resonance Shards（共鸣碎片）to be visible in the backpack, so that I can track my universal star-up material.
7. As a player, I want my hero-exclusive Soul Shards to be visible in the backpack as per-hero entries (e.g. shard_nova), so that I can see exactly how many shards each hero has.
8. As a player, I want summoning to consume Soul Echoes from the backpack, so that spending and remaining currency are consistent with what the backpack shows.
9. As a player, I want a duplicate hero on summon to convert into that hero's shard in the backpack, so that duplicate conversion is visible and trackable.
10. As a player, I want a failed summon to award a Resonance Shard into the backpack, so that consolation rewards are not hidden outside my inventory.
11. As a player, I want star-up to consume the hero's exclusive shards first and then universal Resonance Shards, both from the backpack, so that the existing 1:1 hybrid cost behaviour is preserved.
12. As a player, I want combat drops of Soul Echoes to land in the backpack, so that battle rewards are unified with other loot.
13. As a player, I want offline idle settlements to credit Soul Echoes into the backpack, so that offline earnings appear in the same place as online ones.
14. As a player, I want equipment enhancement materials (Enhance Stones) to appear under「装备」, so that gear-related items are grouped with gear.
15. As a player, I want equipment blueprints to appear under「装备」, so that crafting unlocks are filed with the equipment system they belong to.
16. As a player, I want the 12 set equipment pieces to appear under「装备」, so that wearable gear is exactly what the gear tab shows.
17. As a player, I want the Arcane Orb（奥术星体）to appear under「碎片」, so that awakening materials are grouped with other hero-shard items.
18. As a player, I want crop icons in the greenhouse to no longer rely on the removed single images, so that crops still display recognizably after the cleanup.
19. As a player, I want the shelter's energy reserve display to stop borrowing an item icon, so that the HUD stays correct after the item icon registry is cleaned up.
20. As a developer, I want every item defined in exactly one place with its metadata and icon together, so that adding an item never requires editing multiple files.
21. As a developer, I want equipment item entries to be derived from the equipment config, so that names and descriptions cannot drift between two definitions.
22. As a developer, I want a data-layer consistency test that catches orphan ids, duplicate sprite indices, and invalid categories, so that configuration rot is caught by the test suite.
23. As a developer, I want dead fields and unreferenced assets removed, so that the codebase no longer carries misleading leftovers.

## Implementation Decisions

**分类与物品化（ADR-0014）**

- 物品分类枚举收敛为四值：`'item'`（道具）/ `'resource'`（资源）/ `'shard'`（碎片）/ `'equipment'`（装备）。背包分类 tab 直接绑定枚举，删除匹配函数。
- `GameState` schema 变更：删除 `soulEchoes` / `resonanceShards` / `soulShards` 顶层字段，全部并入 `inventory`。新物品 id：`soul_echo`、`resonance_shard`、`shard_<heroId>`（按英雄配置的 9 位英雄各一条）。初始值沿用原值（灵魂残响 500）。
- 经济逻辑模块（召唤、升星/觉醒、战斗结算、离线结算）的读取与写入改走 `inventory`；数值与规则不变（召唤消耗 100、重复转化 1 碎片、未中奖 +1 共鸣碎片、升星先扣专属再扣通用、满星溢出 1:1 转化）。
- 体力与胶囊充能**不**物品化（可再生的独立资源，保持独立字段）。
- 旧存档不兼容：读取时按新默认初始化，无迁移代码。

**配置重组（ADR-0015）**

- 物品定义重组为分域目录：道具 / 资源 / 碎片 / 装备各一个数据文件 + 聚合索引导出唯一注册表。
- `ItemMeta` 扩展：category 四值 + sprite（sheet + index）+ Lucide 回退映射。sprite 索引从图标组件内的静态表移入物品定义，图标组件变为纯渲染器（未命中 sprite 时 Lucide 占位，保留「sprite 待补」标记）。
- 装备物品条目（名称/描述/分类）由装备配置派生，不在物品定义中重复。
- 作物：删除 `CropConfig.image` 字段与 7 张单图文件，作物图标以 Lucide 占位（spritesheet 无作物 sprite，补图走统一配置）。
- 清理：装饰图标（魔能储备）从物品图标注册表剥离，改由所在组件直接渲染 Lucide；删除无引用的 `spritesheet_items.png`；删除 `discoveredBlueprints` 死字段；修正虚空核心与虚空精华的 sprite 索引冲突。
- 全部现有物品的归类与新增物品 id 以「物品归属映射表」（下表）为实施基准——该表是 grilling 阶段确认的决策编码，逐项调整需重新确认。

### 物品归属映射表（实施基准）

**道具 (item) — 15 项**：ration、hot_stew、ration_deluxe（原 food）；energy_refill、stimpack、canteen、defensive_turret、shield_battery、geiger_counter（原 equipment 错标修正）；sanity_capsule、warp_capsule、nanite_injector、purifying_serum、deflective_lens、dream_lantern（原 special）。

**资源 (resource) — 35 项**：glow_fiber、mana_dust、aether_pulp、steel_petal、alloy_plate、scrap_metal、magma_core、frost_crystal、plasma_cell、void_essence、aether_ingot、crystal_silicon、nanite_slurry、rusted_spring、plasma_arc（原 material 15 项）；nightmare_tear、void_core、dream_shard（原 special 转资源）；seed_glow_grass … seed_void_lotus、seed_echo_shroom … seed_chrono_vine（原 seed 16 项）；**soul_echo**（新增，原顶层字段）。

**碎片 (shard) — 12 项**：arcane_orb（原 special，不变）；**resonance_shard**（新增，原顶层字段）；**shard_nova / shard_buster / shard_soldier / shard_catherine / shard_roy / shard_mei / shard_zero / shard_healer / shard_apprentice**（新增，原顶层字段按英雄展开）。

**装备 (equipment) — 14 项**：wasteland / dreamveil / ember / starcore 四系列共 12 件（由装备配置派生，不重复定义）；enhance_stone（原 special 转装备）；blueprint_ember_armory（原 special 转装备）。

## Testing Decisions

- **好测试的标准**：只断言外部行为——货币/碎片的增减数值、物品的分类归属、图标渲染结果；不断言内部实现（如不直接断言辅助函数、不依赖存储字段的存在性）。
- **三层测试 seam**（已与用户确认）：

  1. **状态层 seam（主 seam）**：经济行为的不变性。召唤、升星、战斗掉落、离线结算的纯函数测试沿用现有模式（构造状态 → 调用模块函数 → 断言结果），断言路径从顶层字段改为 `inventory` 条目，数值断言不变（扣 100 灵魂残响、转化 1 专属碎片、先扣专属再扣通用等）。先例：`src/state/` 下的 summon / awakening / combat / idle 测试。
  2. **组件层 seam**：背包四分类 tab 与枚举一一对应、货币与碎片在召唤页/英雄详情页的展示、温室作物占位图标、魔能储备图标剥离。沿用现有模式（localStorage 预置存档 → 渲染 → 交互断言）。先例：LogTab / SummonTab / HeroTab / ShelterTab 组件测试。
  3. **数据层 seam（新增）**：注册表一致性测试——映射表全部条目可解析（无孤儿 id）、category 均为四值枚举、sprite 索引无重复冲突、装备条目与装备配置派生结果一致。先例：`src/data/` 下的数据测试（heroes 测试含 persistence 合并断言）。

- 旧存档兼容测试**不需要**（ADR-0014：不提供兼容）。
- 全量回归：`npx vitest run`、`npm run build`、`npm run lint` 全绿。

## Out of Scope

- 体力（stamina）与胶囊充能（capsulesCharge）的物品化——保持独立资源。
- 新增作物 spritesheet 美术资源——作物补 sprite 留待 sprite 化二期。
- 旧存档迁移/兼容代码——alpha 阶段直接舍弃。
- Supabase 云同步 schema 迁移——如物品化影响云同步字段，另行处理，不在本 spec。
- 掉落表、配方、数值平衡调整——只搬存储不改数值。

## Further Notes

- 决策依据：`docs/adr/0014-item-unified-model-and-four-categories.md`（物品统一模型与四分类）、`docs/adr/0015-item-config-single-source-of-truth.md`（物品配置单一真相源）。
- 领域词汇：`CONTEXT.md` 已更新「物品」章节（物品/道具/资源/碎片/装备 5 个术语），实施与测试请使用该词汇表。
- 本 spec 由 grilling 会话（三轮确认）产出，映射表与边界均经用户逐项确认；实施中如遇映射表未覆盖的新物品，按四分类语义边界自行归类并在数据层测试中体现。
