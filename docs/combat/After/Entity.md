# Entity 模块「将就」待完善清单

> 记录范围：combat-entity 实施票 01–06 完成后的已知取舍与待补强项。
> 实现基线：当前工作区（本会话完成，尚未提交 commit）。
> 语义：本文件只记录「能跑通、但为了先落地而做出的妥协」，不是 bug 清单；已通过的构建与测试不代表这些点不需要后续打磨。

## 1. 配置层仍是 TS 中间态，未完全 JSON 化

- **现状**：`EntityConfigBase / HeroConfig / EnemyConfig / OtherConfig` 是 TS interface，数据仍以 TS 常量存在：英雄在 `src/data/heroes.ts`、敌人在 `src/data/enemies.ts`。两边类型同源，但注册表仍是两处，`abilities` 也只是 `AbilityRef` 中间态。
- **妥协点**：按既定决策先做「中间态」，不做完全 JSON 化；敌人配置已从 `combatZones.ts` 抽到 `enemies.ts`，区域只引用 id。
- **待完善**：后续完全 JSON 化 effort 时，把 `EntityConfig` 最终 schema、统一注册表/加载器与内容校验一起定稿；当前不继续扩大迁移面。

## 2. `other` kind 只是预留，没有生产路径

- **现状**：`EntityKind` 含 `'other'`，`OtherConfig` 已定义，但没有工厂、转换或内容使用它；`EntityConfigRef` 也是 `{ kind: 'enemy'; id: string }`，只支持敌人。
- **妥协点**：召唤物目前一律走 enemy 配置，无法召唤英雄或未来特殊单位；`other` 语义（召唤物/可破坏物等）尚未到需要落地的机制阶段。
- **待完善**：机制明确后，扩展 `EntityConfigRef` 为 `hero | enemy | other` 判别联合，并给 `other` 一条生产转换路径。

## 3. 基础攻击是隐式兜底，无法配置替换或移除

- **现状**：`collectHeroAbilities` 与 `resolveEnemyAbilities` 都硬编码先塞 `resolveAbilityConfig(getAbilityConfig('basic_attack')!)`；即使实体配置显式写了 abilities，也只是在 basic_attack 之后追加。
- **妥协点**：为了保持与旧行为一致，未决定「基础攻击显式声明 vs 缺省兜底」；因此现在无法表达「没有普通攻击」「替换普通攻击」或「普通攻击也有实体级覆盖」。
- **待完善**：在能力配置收敛时决定 basic_attack 的装配口径，并让英雄/敌人/召唤物走同一规则。

## 4. `AbilityRef.overrides` 浅合并且无配置校验

- **现状**：`resolveEnemyAbilities` 使用 `{ ...base, ...ref.overrides, id: base.id }` 浅合并；对 `effects / passive` 等嵌套字段的覆盖语义不清晰，配置写错字段不会在编译期暴露。
- **妥协点**：当前敌人能力几乎为空，`overrides` 尚未被真实内容压测；英雄侧能力装配也没走 `AbilityRef`（觉醒技能仍直接 `getAbilityConfig`）。
- **待完善**：按 Ability 模块的类型收紧计划，明确 `overrides` 允许覆盖哪些字段（或改为显式 params），并补配置校验；英雄侧能力装配也统一为 `AbilityRef`。

## 5. `buildEntity` 只能按 hpRatio 缩放，mp 恒满魔入场

- **现状**：`buildEntity` 接受 `hpRatio`，`hp = round(maxHp × ratio)`；`mp` 永远取 `round(stats.maxMp)`。没有显式传入当前 hp/mp 的入口，也没有显式 fixval 入口（只有 `initiative?` 覆盖）。
- **妥协点**：现有英雄/敌人/梦魇都满足「满魔入场」，召唤物也暂不需要残魔；因此先接受。
- **待完善**：当出现残魔入场、召唤物初始 mp、显式先机修正等需求时，把 `BuildEntityParams` 扩展为可传 `hp / mp / initiativeFixval` 的显式形态。

## 6. `entityStats` 与 `BattleContext.resolveStats` 双展平、双口径

- **现状**：`battleEntity.entityStats` 与 `battleContext.resolveStats` 都从 `calculateEntityStats` 展平为 `BattleUnitStats`，但 clamp 口径不完全一致：`entityStats` 对 maxHp 只 `Math.round`，`resolveStats` 额外 `Math.max(1, ...)`；`resolveStats` 直接 spread primary/special，`entityStats` 逐键映射。
- **妥协点**：本 effort 只把类型抽到共享 `battleTypes.ts`，没有抽「`CalculatedEntityStats → BattleUnitStats`」的单一展平函数。
- **待完善**：抽一个 `toBattleUnitStats(calculated)`，让 `entityStats` 与 `resolveStats` 共用，并统一取整/钳制规则；顺带修复两处 maxHp 口径差异。

## 7. `createBattle.context` 在 run 前访问的契约不明确

- **现状**：`createBattle` 返回 `get context() { return battle; }`，而 `battle` 是 `let battle!: BattleContext`，只在 `run()` 的 `setup` 里赋值。run 前访问不会在类型层报错，但运行时会得到未初始化值。
- **妥协点**：现有调用方都立即 `run()`，且测试只断言 run 后 context 存在；未做运行时守卫。
- **待完善**：把 `battle` 声明为 `BattleContext | undefined`，context getter 在未初始化时抛明确错误，或把 `run` 设计为返回 `{ result, context }`。

## 8. 召唤物 id 分配与 `summon` 事件 sourceId 仍未闭环

- **现状**：`executeSummon` 仍用 `effect.targetId` / `targetId-N` 手工拼 id；`TurnRuntime.summonUnit` 派发的 `summon` 事件来源仍是召唤物自身。Entity 工厂只负责按 configRef 生成实体，不负责唯一 id 分配与事件来源修正。
- **妥协点**：这是既定交接项，对应 `After/Effect.md #3` 与 `After/Turn.md #6`，本 effort 未抢 Effect/Turn 的职责。
- **待完善**：在 Effect/Turn 后续票中，给 `summonUnit(snapshot, sourceId?)` 增加来源参数，并在召唤 executor 引入唯一 id 分配（或运行时分配 id）。

## 9. 能力注册表完整性靠非空断言，缺配置会运行时报错

- **现状**：`collectHeroAbilities` 与 `resolveEnemyAbilities` 都写 `getAbilityConfig('basic_attack')!`；若 `basic_attack` 缺失，会在运行时炸。敌人配置引用了不存在的 abilityId 时，当前是静默 `continue`。
- **妥协点**：现有配置表完整、测试通过，因此先用非空断言和静默跳过。
- **待完善**：增加配置完整性校验（至少测试 seam）：`basic_attack` 必存在、实体引用的 abilityId 必须可解析、`AbilityRef.overrides` 字段合法。

## 10. statParams 克隆逻辑仍重复，After/Ability#12 实际只移了位置

- **现状**：`battleEntity.toTurnUnit` 手工克隆 `baseAttributes / primaryAttributes / specialAttributes / permanentModifiers`；`turnEngine.cloneSnapshotUnit` 又克隆一次 `statParams`。重复克隆没有抽成共享 helper。
- **妥协点**：本次把旧 `combat.combatantToTurnUnit` 的重复克隆移到了 `toTurnUnit`，但 `turnEngine.cloneSnapshotUnit` 那份仍在；`After/Ability.md #12` 已改回待完善标记，实际仍需抽 `cloneStatParams` / `toBattleUnitStatParams`。
- **待完善**：抽共享克隆/转换 helper，让 `toTurnUnit` 与 `cloneSnapshotUnit` 共用。

## 11. 敌人/梦魇/召唤物入口尚未完全统一

- **现状**：普通敌人走 `enemiesToEntities`（未导出，仅 combat.ts 内部），梦魇泄露走 `enemyConfigToEntity(nightmareEnemy)`，召唤物走 `createEntityFromConfig`。三者最终都到 `BattleEntity`，但入口分散。
- **妥协点**：本次只要求「同走实体工厂」，没有强求单一公开入口。
- **待完善**：在 JSON 化/统一注册表时，收口为一个 `resolveEntity(configRef | id | config)` 公开入口，减少调用方自行拼配置。

## 12. `TurnConfig.setup` 仍未前移到装配层或写入契约

- **现状**：`createBattle` 已抽出，但 Ability/Buff/被动装配仍通过 `runTurnEngine(units, { setup(runtime) { ... } })` 注入；`TurnConfig.setup` 仍存在，且没有运行时校验「不派发事件、不改 hp/先机」。
- **妥协点**：本 effort 只完成了「抽出 createBattle」，没有完成 `After/Turn.md #11` 的优选方案——把 setup 前移到装配层、让 `runTurnEngine` 保持干净。
- **待完善**：二选一——(a) 把 setup 契约正式写入 spec/Turn.md；(b) 更优：`createBattle` 在调用 `runTurnEngine` 前完成注册，Turn 配置中移除 setup seam。

## 建议处理顺序

1. **低风险收口**：抽 `toBattleUnitStats`（#6）、`cloneStatParams`（#10）、明确 `createBattle.context` 契约（#7）、收口 `TurnConfig.setup`（#12）。
2. **召唤闭环**：扩展 `EntityConfigRef`（#2）+ id 唯一分配 + `summon` sourceId（#8）。
3. **能力装配收敛**：basic_attack 显式化（#3）、`AbilityRef` 覆盖语义与校验（#4、#9）、英雄/敌人能力入口统一（#11）。
4. **配置层下一跳**：完全 JSON 化、统一注册表、`other` 落地（#1、#2、#5），建议与 Level 破坏性重构合并进行。
