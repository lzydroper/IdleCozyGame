# 战斗 Level 模块重构（combat-level）— Wayfinder Map

## Destination

锁定「Level（区域与关卡）」模块的设计决策集，产出可直接交给 `/to-spec`、`/to-tickets` 的实现规格：Region/Level 双表数据模型、区域与关卡解锁、荒野探索进度与里程碑、探索事件池与初始消耗、敌人池统一、掉落模型（整数百分比 + exp_tome/soul_echo 物品化）、挂机远征映射与状态/持久化改造。**仅覆盖 Level 模块**；UI / Offline / 生产代码不在本 effort。

## Notes

- **领域**：AetherGarden 废土魔导温室放置游戏，战斗系统重构（`docs/combat/readme.md`）。
- **交付形态**：决策集 + 可交付规格（不直接实现生产代码）。
- **范围**：仅 Level 模块；UI / Offline 各自另立 effort，本 effort 只留对接 seam。
- **Region 统一范围**：手动荒野探索 + 挂机战斗 + 挂机远征三者共享 Region；梦境探索不纳入。
- **破坏性重构**：游戏未发布、无真实旧存档，不向后兼容；旧测试不符新功能一律删除（`docs/combat/readme.md`）。
- **术语**：退役「战斗区域 (Combat Zone)」，立 **区域 (Region)** 与 **关卡 (Level)**；BOSS 是关卡内敌人的特殊实例（`role:'boss'`），不是独立关卡。
- **chart 阶段已确认方向（仍需逐票决议后落成 spec）**：
  - 配置层：单文件 `src/data/regions.ts`，Region 内嵌有序 `levels`；Level 只带区域内稳定 local id，无全局 id / 无 regionId。
  - 解锁分场景：荒野探索 N = 区域 N-1 已解锁 + 区域 N-1 探索度 100% + 可选特殊需求；挂机战斗/远征 N = 区域 N-1 已解锁 + 本区域荒野探索度 100% + 可选特殊需求；区域内关卡线性。
  - 探索进度：`regionProgress` 存累计完成步数，`explorationStepsToClear` 定义 100%；里程碑一次性，`{ atPercent, eventId }`，全局 `minRunSteps`（数据层暂定 7）；到达里程碑后、未完成该里程碑前不累加进度。
  - 事件池：`RegionConfig.explorationEvents` 显式事件 id 池；救援特殊触发。
  - 敌人：`RegionConfig.enemyPool` + `LevelConfig.enemies` 子集 + 探索 encounter 复用区域池。
  - 掉落：`kind` 可辨识联合 + 整数百分比；经验复用 `exp_tome` 物品掉入背包；`soul_echo` 作为普通物品条目。
  - 远征：`RegionConfig.expedition` 可选配置块；`levels` 纯战斗。
- **技能**：决策票用 `grilling`、`domain-modeling`、`codebase-design`；research 票用 `research`。决策解决后接 `/to-spec` → `/to-tickets`。
- **关键文件**：`docs/combat/Level.md`、`docs/combat/readme.md`、`docs/combat/Offline.md`（只读）、`docs/combat/UI.md`（只读）、`src/data/combatZones.ts`、`src/data/expeditionLocations.ts`、`src/data/realityEvents.ts`、`src/data/enemies.ts`、`src/state/combat.ts`、`src/state/shelter.ts`、`src/state/tick.ts`、`src/state/offline.ts`、`src/types/game.ts`。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [01 — Region/Level 数据模型](issues/01-region-level-config-model.md) — 单文件 `regions.ts`，Region 内嵌有序 `levels`；Level 只带区域内 local id，含 staminaCost/drops/firstClearDrops；通关记录为 `Record<regionId, localId[]>`。
- [02 — 掉落模型与旧表迁移](issues/02-drop-model-and-migration.md) — DropEntry 三形态 + 整数百分比；exp 改为 exp_tome（按 3 人总经验换算）；soul_echo 固定均值；blueprint_ember_armory 改首通保底；100%+范围塌缩单值。
- [03 — 区域与关卡解锁模型](issues/03-unlock-model.md) — 荒野探索/挂机战斗/挂机远征三套解锁谓词；关卡线性；特殊需求最小三成员 union；测试区 isTestZone。
- [04 — 荒野探索进度与里程碑](issues/04-exploration-progress-milestones.md) — regionProgress 累计步数；里程碑一次性 {atPercent,eventId}；EXPLORATION_CONFIG.minRunSteps=7；pendingMilestones 暂停累计；encounter 不可撤离/失败保留 pending，choice 选择即完成。
- [05 — 探索事件池与初始消耗](issues/05-exploration-event-pool-cost.md) — 区域显式事件池；普通探索 initialCost 入 Region，救援常量保留；救援坐标不建 region；统一 subway id；ancient_library 事件改名；空池不可探索。
- [06 — 敌人池统一](issues/06-enemy-pool-unification.md) — Region.enemyPool + Level.enemies 子集 + encounter 复用；encounter 掉落保留事件内但迁 DropEntry；校验 fail-fast/运行时禁用。
- [07 — 远征映射到 Region](issues/07-expedition-mapping.md) — 保持单条 expedition?；迁移期只留 radar_station 挂 wasteland_entrance，其余 5 个丢弃；lootTable 迁 DropEntry。
- [10 — 全 JSON 化兼容边界](issues/10-json-compatibility-boundary.md) — 纯数据 + satisfies + 仅 tsc；不实际迁 JSON，只保证未来可承载。
- [08 — 战斗/探索状态与持久化](issues/08-state-and-persistence.md) — clearedLevels: Record<regionId, localId[]>；regionId+levelId 取代 zoneId；regionProgress/pendingMilestones 入 exploration；旧字段彻底删除、无迁移。
- [09 — 内容盘点与迁移映射](issues/09-content-inventory-and-mapping.md) — 4 zone 复用为 region id、每区拆 2 关；31 个现实事件分入 3 主线区域；6 个远征地点建议各自成 expedition-only region；掉落/经验/灵魂残响转换草案与 top 5 拍板点已列。

## Not yet specified

<!-- fog：转向本 destination 但尚无法精确提问的决策 -->

- 特殊需求的扩展成员（`heroLevel / heroClass / faction`）与玩家可见文案——03 只定最小三成员（`regionExplored / levelCleared / itemHeld`），扩展位未来再议。
- 20% / 100% 里程碑的具体事件内容与文案——04 只定机制，具体事件内容由 spec / 内容设计阶段填充。
- 远征迁移样本（当前只留 `radar_station`）后续可能破坏性调整——07 已记录用户「后续可能会破坏性修改」的意图。

## 🏁 地图完成

combat-level 全部 10 张 tickets 已解决，Level 模块决策集完整，way 到 destination 已清晰，可交给 `/to-spec`（出规格）→ `/to-tickets`（出实现票）。

**Destination 达成**：Region = 现实侧统一地点（手动荒野探索 / 挂机战斗 / 挂机远征共享），内嵌有序 `levels`；Level 只带区域内 local id；解锁、探索进度/里程碑、事件池、敌人池、掉落与状态/持久化契约全部敲定。

**决策集速览**：① Region/Level 数据模型 ② 掉落与迁移 ③ 解锁模型 ④ 探索进度/里程碑 ⑤ 事件池与消耗 ⑥ 敌人池 ⑦ 远征映射 ⑧ 状态与持久化 ⑨ 内容映射 ⑩ JSON 兼容。

## Out of scope

- **UI / Offline 两个模块** —— 各自另立 effort（本 effort 只留 seam）。
- **生产代码实现** —— 本 effort 只到规格交接。
- **梦境探索及其污染 / 封锁 / 梦魇泄露** —— 保持现状。
- **敌人配置内容与数值平衡** —— 本 effort 只定模型与迁移映射，不重做数值。
- **完整 JSON 化工程迁移** —— 本 effort 只做 schema 兼容铺垫，不把 TS 数据迁成 JSON 文件。
