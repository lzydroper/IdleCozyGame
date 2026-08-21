# 09 — 内容盘点与迁移映射

**Type:** research
**Status:** resolved
**Blocked by:** None

## Question

盘点现状配置并产出一份 Region/Level/Event/EnemyPool/Drop 迁移映射草稿。需覆盖：

1. 现有 `COMBAT_ZONES`（含测试区）逐区列出：敌人、boss、stamina、exp、drops、soulEcho、recommendedLevel；按新模型建议 region id / level ids / enemyPool / drops（整数百分比 + exp_tome/soul_echo 物品化）的对应值。
2. 现有 `REALITY_EVENTS` 全部事件（含 3 个 encounter）按区域建议分组为 `explorationEvents` 池；救援事件单列。
3. 现有 `EXPEDITION_LOCATIONS` 6 个地点如何映射 `region.expedition`。
4. 建议主线区域顺序与每个区域的 `explorationStepsToClear` 初值。
5. 明确哪些旧字段可删、哪些需新增、哪些数值需要拍板。

产出：事实清单 + 映射表（file:line 引用），作为 02/03/04/05/06/07 的输入，不替代最终决议。

## Answer

（research 子代理，2026-08-21；完整报告：[`.scratch/combat-level/research/09-content-mapping.md`](../research/09-content-mapping.md)）

- **COMBAT_ZONES**：4 个 zone 复用旧 id 作 region id，每区拆 2 关（`{regionId}_1` 普通 / `{regionId}_2` 关底）；BOSS 仅作为 `role:'boss'` 敌人放进末关 `enemies`；enemyPool 按区汇总。
- **掉落转换草案**：`chancePercent = round(chance × 100)`；`count = minQty === maxQty ? minQty : round((min+max)/2)`；`100% + 范围` 无法无损表达（仅测试区 `enhance_stone` 30–50）；`soulEchoMin/Max` → 固定 `soul_echo` 均值；`expReward` → 保底 1 本 `exp_tome`。所有范围塌缩/经验换算均标为需 02 票拍板。
- **事件池**：31 个 `REALITY_EVENTS` 分入 3 主线区域；9 个救援事件单列。发现 `collapsed_subway` vs `subway_station` id 不一致、`ancient_library` 事件与远征地点撞 id。
- **远征**：6 个 `EXPEDITION_LOCATIONS` 建议各自成为 expedition-only region（`levelIds: []`），字段原样映射；解锁顺序与 lootTable 是否迁三形态留 07 票。
- **主线顺序**：`wasteland_entrance → old_town_ruins → radiated_workshop`；`explorationStepsToClear` 初值 10/15/20（测试区除外），为待 04 票拍板草案。

**Top 5 需后续决策**：① minQty/maxQty → 单 count 塌缩与 100%+范围表达；② soulEcho 固定值；③ expReward → exp_tome 换算；④ 远征是否各自成区、levelIds 可否为空、lootTable 是否迁三形态；⑤ explorationStepsToClear / minRunSteps / 里程碑配合与测试区最终表达。
