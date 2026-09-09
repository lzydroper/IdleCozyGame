# 06 — 敌人池统一

**Type:** grilling
**Status:** resolved
**Blocked by:** 01, 09

## Question

怪物配置如何统合进区域？需决议：

1. **`RegionConfig.enemyPool: string[]`** 声明区域全部敌人。
2. **`LevelConfig.enemies: string[]`** 从区域池取子集；BOSS 是 `ENEMY_CONFIGS` 中 `role:'boss'` 的敌人特殊实例，与普通敌人同列，不设独立 boss 字段/关卡。
3. **探索 encounter 迁移**：`RealityEvent.battle.enemies` 改为引用区域池中的敌人 id；是否仍保留事件内 `battle.drops / expReward`，还是改为引用关卡掉落表。
4. **校验**：`level.enemies` 与 `encounter.enemies` 必须是 `region.enemyPool` 子集；配置错误如何失败。

产出：敌人池与关卡/遭遇敌人引用契约，供 02/09 使用。

## Answer

（HITL grilling，全部采用推荐方案。）

- **D1 区域敌池**：`RegionConfig.enemyPool: string[]` 声明区域全部敌人。
- **D2 关卡敌人**：`LevelConfig.enemies: string[]` 从区域池取子集；BOSS 是 `ENEMY_CONFIGS` 中 `role:'boss'` 的敌人特殊实例，与普通敌人同列，不设独立 boss 字段/关卡。
- **D3 探索 encounter**：`RealityEvent.battle.enemies` 必须来自区域池；`battle.drops / expReward` 保留在事件内，但类型迁到 `DropEntry`（02 已定），不强行引用关卡掉落。
- **D4 校验失败**：开发/测试期 fail-fast（throw）；运行时把该关卡/遭遇视为配置错误——禁用入口并告警，不静默继续。