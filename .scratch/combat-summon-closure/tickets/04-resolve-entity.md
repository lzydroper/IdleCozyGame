# 04 resolveEntity 收口

Type: task
Status: resolved

## 内容

M4 / En#2：`resolveEntity(configRef | id | config)` 单一公开入口；EntityConfigRef 扩展为 hero | enemy 判别联合；enemiesToEntities 转内部薄壳。

## Answer（实施记录）

- entityFactory 重写：`resolveEntity(source, overrides?)` 三态归一（字符串=敌人 id / ref 按 kind 查注册表 / EnemyConfig 对象直入）；`EntityConfigRef = {kind:'hero'} | {kind:'enemy'}`（other 待内容落地，维持 roadmap 桶 D 记录）；hero 分支产出**基础形态**实体（养成加成仍走 combat.heroToCombatant，文件头已注明）。
- effectSystem.executeSummon 与 combat.enemiesToEntities 均改走 resolveEntity；createEntityFromConfig 移除。
- 共享 `resolveEntityAbilities` 供敌我两路（含引用缺失抛错校验）。
