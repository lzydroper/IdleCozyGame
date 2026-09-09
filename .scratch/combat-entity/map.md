# combat-entity

## Destination

锁定「Entity（参战实体）」模块的设计决策集，产出可直接交给 `/to-spec`、`/to-tickets` 的实现规格：统一配置层（`HeroConfig` / `EnemyConfig` / `OtherConfig` 同源）、运行时 `BattleEntity`、唯一转换缝 `toTurnUnit`、`createBattle` 装配工厂与召唤物工厂边界。Level / UI / Offline 与生产实现不在本 effort。

## Notes

- 领域：AetherGarden 废土魔导温室放置游戏，战斗系统重构（`docs/combat/readme.md`）。
- 破坏性重构：不向后兼容旧存档；旧测试不符即删。
- 中间态：不做完全 JSON 化、不做 Level 重构；敌人配置从 `combatZones.ts` 抽到 `src/data/enemies.ts` 即可。
- 术语：`faction` 专属六阵营；`side` 表示 hero/enemy；顶层 `kind` = hero/enemy/other；敌人子字段 `role` = normal/boss/nightmare。
- `description` 取代英雄 `backstory`；`description/sprite/icon` 属配置层，不进运行时。
- `abilities` 用 `AbilityRef = { abilityId, overrides? }`。
- 实施时按 [07 — After/*.md 文档勾除清单](issues/07-doc-sync-checklist.md) 同步勾除。
- 后续会话先读本 map 与 `docs/combat/Entity.md`、`docs/combat/After/*.md`；实现规格由 `/to-spec` 生成。

## Decisions so far

- [01 — 统一配置层：EntityKind/EnemyRole 与 HeroConfig/EnemyConfig](issues/01-config-layer-unification.md) — 顶层 kind=hero/enemy/other；敌人 role=normal/boss/nightmare；配置组合式统一，敌人数据抽到 enemies.ts。
- [02 — 公共字段集、faction/side 术语与 abilities 引用形态](issues/02-common-fields-and-terms.md) — 公共字段 9 项；faction 六阵营 / side hero|enemy；abilities 用 AbilityRef。
- [03 — 英雄专有系统边界与 enemies.ts 中间态](issues/03-hero-systems-and-enemy-data.md) — talent/bonds/equipment 独立注册表；HeroConfig 保留 heroClass/levelMilestones/dutyMeta；enemies.ts 只抽敌人定义。
- [04 — 运行时 BattleEntity 形状与双轨收敛](issues/04-runtime-entity-shape.md) — 运行时仅 recipe+hp/mp+resolved abilities+initiative；side 显式；删除 flat/snapshot 双轨。
- [05 — createBattle 装配工厂与唯一转换缝](issues/05-assembly-and-conversion.md) — toTurnUnit 唯一转换点；createBattle 上移装配；simulateBattle 薄壳化。
- [06 — 召唤物边界](issues/06-summon-boundary.md) — Entity 提供 createEntityFromConfig；召唤改引用配置；id/事件来源留 Effect/Turn。
- [07 — After/*.md 文档勾除清单](issues/07-doc-sync-checklist.md) — 勾除 After/Turn #10-#13 与 After/Ability #1/#9/#12/#14。

## Not yet specified

- 完全 JSON 化后的 `EntityConfig` 最终 schema（本 effort 只定 TS 类型中间态）。
- Level.md 破坏性重构后的敌人/区域/关卡关系（影响 `enemies.ts` 最终归属，本 effort 不碰）。
- `other` kind 的具体内容物与 `side` 规则（召唤物/可破坏物等，等机制落地再定）。
- 召唤物 id 唯一分配与 `summon` 事件 sourceId 修正（已交接，见 06）。
- 基础攻击（basic_attack）在 `abilities` 中的显式/兜底装配方式、`toTurnUnit` 内部细节——由 `/to-spec` 定稿。

## Out of scope

- Level / UI / Offline 三模块。
- 敌人内容补全（description/sprite/icon/abilities 的实际填充）。
- 完全 JSON 化。
- Ability / Buff / Effect 引擎内部改动（仅做 seam 对接）。
- 数值平衡与内容设计。
- 生产代码实现（本 effort 只到规格交接）。
