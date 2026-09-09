# 07 — 远征映射到 Region

**Type:** grilling
**Status:** resolved
**Blocked by:** 01, 03

## Question

挂机远征（`EXPEDITION_LOCATIONS`）如何并入 Region/Level 模型？需决议：

1. **`RegionConfig.expedition?` 配置块**：`scavengeInterval / lootTable / rationCost / rationConsumptionRate / requiredHeroClass? / requiredFaction?` 是否完整迁入。
2. **`levels` 只表达战斗关卡**，远征不是关卡。
3. **远征解锁**：继承区域解锁状态（本区域荒野探索 100% + 上一区域已解锁 + 可选特殊需求）。
4. **旧表迁移**：现有 `EXPEDITION_LOCATIONS` 的 6 个地点如何映射为 region（与 09 内容映射协同）；旧 `ExpeditionLocation` 类型是否退役。
5. **expedition-only region**：research 09 建议 6 个远征地点各自成为独立 region 且 `levelIds: []`——需确认 `levelIds` 是否允许为空，以及是「各自成区」还是「并入战斗区」。
6. **expedition.lootTable 是否也迁三形态**：当前 `lootTable` 仍是 `chance 0-1 / minQty / maxQty`，与新 DropEntry 不一致；是否统一迁移（否则两套掉落模型并存）。
7. **远征区域解锁顺序**：独立 region 后是插进主线顺序，还是挂在对应战斗 region 之后，还是保持各自独立解锁。

产出：`RegionConfig.expedition` 契约与旧表迁移边界。

## Answer

（HITL grilling，用户决定：**保持单条 `expedition?`，迁移期只留 1 个远征样本，其余丢弃**。）

- **D1 schema**：`RegionConfig.expedition?: ExpeditionConfig` 保持单条，不采用数组。
- **D2 语义**：`levels` 只表达战斗关卡，远征不是关卡。
- **D3 解锁**：`expedition` 继承宿主 region 的解锁状态（本区域荒野探索 100% + 上一区域已解锁 + 可选特殊需求）。
- **D4 迁移样本**：只保留 `radar_station` 挂在 `wasteland_entrance` 上作为兼容样本（选哪个不重要，用户已确认；后续可能破坏性修改）。其余 5 个（`subway_station / bio_lab / poison_factory / ruined_armory / ancient_library`）从配置中丢弃，`ExpeditionLocation` 类型退役。
- **D5 lootTable**：`expedition.lootTable` 按 02 规则迁到 `DropEntry`（整数百分比 + 单 `count` = 四舍五入均值）。