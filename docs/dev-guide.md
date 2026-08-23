# 开发指南（开发侧）

> 本文是代码贡献者的完整参考：分层法则、模块地图、属性系统、战斗引擎全解、扩展菜谱。
> 配套：[config-guide.md](config-guide.md)（配置侧 json 字段参考）。命令速查见 [AGENTS.md](../AGENTS.md)。
> 文中所有行为描述均以当前代码为准；发现文档与实现不符时，以代码为准并回头修文档。

---

## 1. 分层架构

### 1.1 数据流

```
src/data/**/*.json            内容数据（纯 json，无任何代码）
   │  import / import.meta.glob(eager)
   ▼
src/configs/
   loaders/*.ts               装配：导入 + devGuard 校验 + icon 解析(GameArt) + 跨表派生
   constants/*.ts             数值常量与共享文案（可调参面）
   types/*.ts                 域接口唯一真相
   mappings/iconMap.ts        iconKey → Lucide 组件注册表（iconFor 兜底 HelpCircle）
   mappings/artMap.ts         icon 字符串 → GameArt（切图 ?url 管线 / iconKey）
   seed/initialState.ts       初始存档种子（INITIAL_STATE / createInitialHero / INITIAL_HEROES）
   │  函数调用
   ▼
src/state/*.ts                运行时逻辑：战斗引擎、各系统结算器、纯函数 UpdateResult 风格
   │  dispatch / useGame()
   ▼
src/context/GameContext.tsx   中央状态机：持有 GameState、tick 循环、离线结算、动作分发
   │  hooks
   ▼
src/components/**             UI：Tab 与弹窗；只经 useGame() 与 loader 出口取数
```

### 1.2 三条铁律

1. **data 只放 json**。任何 `.ts` 出现在 `src/data/` 都是回归（转发 shim 已于批次④清零）。
2. **消费方只准 import `configs/loaders|constants|types` 与 `state`**，禁止直读 json、禁止复制配置值。
3. **类型真相在 `configs/types`**；`src/types/game.ts`（GameState 等）与 `src/types/config.ts`（Recipe/CropConfig/UpgradePath 等跨域形状）可单向 import configs/types，反向禁止。

### 1.3 TypeScript 约束（编译器替你把关的）

- `verbatimModuleSyntax`：类型导入必须 `import type {...}`；
- `erasableSyntaxOnly`：无 enum / namespace / 参数属性，用 union + const 对象；
- `noUnusedLocals/noUnusedParameters`：未用即报错（弃名解构用 `Object.entries` 取值弃键）。

## 2. 目录导览（逐文件）

### 2.1 src/state（运行时逻辑）

**战斗核心**

| 文件 | 职责 |
|---|---|
| `combat.ts` | 编排入口：`createBattle`(建场景)、`simulateBattle`(跑完整场)、`heroToCombatant`(英雄→战斗实体)、遭遇战 `resolveEncounterBattleUpdate/fleeEncounterUpdate`、经验 `applyHeroExp`、队伍 `setPartyUpdate` |
| `turnEngine.ts` | 回合轴 + 事件总线 + 单位容器。时机常量：`TURN_TIMING_KEYS=['roundStart','turnStart','turnActive','turnEnd','roundEnd']`；战斗事件常量：`BATTLE_EVENT_KEYS=['abilityUsed','attackAfter','damageTaken','healingTaken','death','summon','effectApplied']`；`TurnEventKey = 两族 ∪ (string&{})` |
| `effectSystem.ts` | 效果主 seam：EffectInstance 统一命令层，resolveEffect 按 before→during 落地；EFFECT_EXECUTORS 注册表（详见 §4） |
| `battleTypes.ts` / `battleContext.ts` / `battleEntity.ts` | 战斗数值类型 / BattleContext(getModifiers/addModifier/setFlag/applyBuff/resolveStats…) / 实体↔Turn 单位转换 |
| `abilityTypes.ts` | AbilityConfig/ResolvedAbility/FormulaTemplate/EffectTemplate 类型契约 |
| `abilityCompiler.ts` | 纯函数：公式求值 + EffectTemplate[] 展开 EffectInstance[]（多目标拆分 × fireCount 循环；applyBuff 构造实例） |
| `abilityRuntime.ts` / `abilityPassive.ts` / `abilityTargeting.ts` | 能力释放执行 / 被动能力挂载 / 目标选择（含 taunt 覆盖单目标敌选） |
| `buffTypes.ts` / `buffSystem.ts` / `buffRuntime.ts` | Buff 类型契约 / 挂载·冲突·叠加规则 / 触发结算物化器（公式词表见 §4.5） |
| `entityFactory.ts` | 配置→战斗实体工厂；能力引用缺失抛错；完整性检查（敌人 abilityId 引用校验） |
| `modifier.ts` | 统一 Modifier `{target:'stat.X'|'effect.Y', op:'add'|'multiply', value, source?}`；applyEffectModifiers=(base+Σadd)×(1+Σmultiply) |
| `statSystem.ts` | 三层属性引擎（见 §3） |
| `battleEventPresentation.ts` | 战斗事件 → 中文文案；idleFeed 数据源 |

**养成系统**

| 文件 | 职责 |
|---|---|
| `equipment.ts` | 穿戴/强化/套装阈值/神话锻造结算（消费 equipmentConstants + EQUIPMENT_CONFIG/SETS） |
| `awakening.ts` | 升星（碎片消耗 `shard_<heroId>` 先专属后共鸣）与觉醒（AWAKEN_CONFIG.passive 注入 + abilityId 接入） |
| `summon.ts` | 抽卡：概率/软保底/重复转 `shard_<heroId>` |
| `talents.ts` / `talentsTree.ts` | 天赋投入结算 / 树构建与布局（buildTalentTree/formatTalentGate） |
| `heroGrowth.ts` | 成长公式：getHeroGrowth/getLevelMilestoneBonus/getMilestoneModifiers/heroBaseAttributes |
| `bonds.ts` | 羁绊判定：heroes 组合与 factions 计数条件 → bonus StatModifier[] |

**探索与后勤**

| 文件 | 职责 |
|---|---|
| `levelCombat.ts` / `explorationProgress.ts` / `stamina.ts` | 关卡战斗编排 / 区域探索进度与里程碑 / 体力恢复结算 |
| `dropEngine.ts` | DropEntry 三形态掉落判定 |
| `workshop.ts` | 手动合成（cost→reward 校验） |
| `facility.ts` / `shelter.ts` / `greenhouse.ts` / `duty.ts` | 产线任务推进 / 基建升级施工 / 温室种植收获 / 驻守加成解析(DutyScope 四种) |
| `nightmare.ts` / `env.ts` | 梦魇泄露防御模拟 / 环境事件 |
| `tick.ts` / `offline.ts` / `persistence.ts` | 在线心跳聚合 / 离线收益结算（受蓄电池 upgrade 上限约束）/ localStorage 读写 |
| `logs.ts` / `idleFeed.ts` / `types.ts` | 日志结构 / 挂机信息流环形缓冲(容量50) / UpdateResult 公共类型 |

### 2.2 src/configs/loaders（装配出口一览）

| loader | 导出 | 装配要点 |
|---|---|---|
| `entities.loader` | ENEMY_CONFIGS, HEROES_CONFIG, AWAKEN_CONFIG, HERO_TALENTS, SURVIVORS_CONFIG, STARTER_HERO_ID | 英雄五文件按文件夹归并、order 排序、缺省段语义；awaken.json 内联 ability → abilityId 回填；starter 兜底 `'nova'` |
| `combat.loader` | ABILITY_CONFIGS, BASIC_ATTACK, getAbilityConfig, BUFF_CONFIGS, getBuffConfig | abilities glob + heroes/*/awaken.json 内联能力合并注册；description token 插值；buffs devGuard(required: durationKind/triggers/effects) |
| `items.loader` | ITEMS_CONFIG, ITEM_CATEGORIES | 合并序=派生在前显式在后：英雄碎片派生(继承英雄 GameArt)、equipment 条目派生、四张显式分表覆盖式合并 |
| `equipment.loader` | EQUIPMENT_SETS, EQUIPMENT_CONFIG, EQUIPMENT_LIST | 双表 devGuard；icon 保持原始字符串（背包条目侧才解析） |
| `event.loader` | REALITY_EVENTS, DREAM_EVENTS, RESCUE_EVENTS, RESCUE_LOCATION_NAMES/MAP | reality_* glob 归并后按 realityOrder.json 重排（保 authored 序）；dream devGuard(required: type) |
| `regions.loader` | REGION_CONFIGS | 按 regionInfo 内容组装（文件夹名仅约定）；expedition 缺省段；guard(name/order) |
| `progression.loader` | BONDS, TALENT_TRUNKS, HERO_GROWTH_BY_CLASS | 直存 cast |
| `workshop.loader` | RECIPES_CONFIG(devGuard), AUTO_RECIPES | |
| `shelter.loader` | FACILITIES_CONFIG, SHELTER_UPGRADES, isFacilityType | injectIcons：行内 icon 字符串 → resolveArtOrDefault |
| `gameplay.loader` | CROPS_CONFIG | farming 域 |
| `devGuard.ts` | devGuardTable(domain, table, {required}) | 仅 DEV 生效：条目非对象抛错、key↔row.id 一致性、必填字段检查 |

### 2.3 src/configs/constants（调参面）

| 文件 | 关键内容 |
|---|---|
| statConfig | DEFAULT_*_ATTRIBUTES、PRIMARY_STAT_SCALING_CONFIG（11 系数）、BUFF_LIMIT_CONFIG（暴击/减益上限）、COMBAT_DAMAGE_CONFIG(MIN_DAMAGE=1、BASE_DEFENSE_CONSTANT=100、MAX_VOID_SPIRIT_EXEMPTION=.9)、BaseStatsSeed 类型 |
| combatConfig | COMBAT_CONFIG：maxStamina100/staminaRegenSeconds3/partySize3/maxBattleRounds60/expPerLevel100/encounterStaminaCost5/battleDurationSeconds5/baseEventIntervalMs600 |
| summonConfig | costPerSummon100/heroBaseChance.6/pityThreshold10/pityStep.1/guaranteedAt100/shardsPerDupe1/resonancePerMiss1 |
| gameConstants | GAME_DAY_SECONDS300、温室槽位8、探索基础开销 10/10、救援开销 15/15 |
| explorationConfig | minRunSteps=7（里程碑触发需本次探索≥7步） |
| nightmareConfig | 泄露梦魇面板(dreamLeakDamage60/leakAttack14/leakDefense4)、炮塔辅助35、封锁1800s |
| equipmentConstants | ENHANCE_MAX30、MYTHIC_STAT_MULTIPLIER1.5、FACTION_EQUIPMENT_BONUS_MULTIPLIER1.3、enhanceCost(n)=1+⌊n/5⌋、FORGE_COST、EQUIPMENT_SLOTS/LABELS |
| awakeningConstants | STAR_MAX5、starUpShardCost(n)=5n、STAR_STATS_PER_STAR、AWAKEN_COST |
| heroDisplay | HERO_CLASS_LABELS/COLORS、HERO_FACTION_LABELS、PRIMARY_STAT_DESCRIPTIONS |
| workshopCategories / eventWeights / uiConstants / heroLore | 工坊分类栏 / 现实事件类别权重 / UI_TOKENS / 阵营职阶 lore |

## 3. 属性系统（stat-bonus-unification）

### 3.1 三层属性

- **Base**（6）：attack/defense/maxHp/maxMp/critRate/critDmg —— 面板直接值；
- **Primary**（6）：strength/constitution/agility/intelligence/willpower/transcendence —— 经 `PRIMARY_STAT_SCALING_CONFIG` 系数映射为 Base 加成与四个派生减免（力量→攻击+暴伤、体质→生命+防御、敏捷→暴击率+免暴、智慧→魔力+奥术增幅、意志→持续/数值双减免、超越→冷却缩减）；
- **Special**（9）：arcaneBoost/arcaneResistance/mechanicalLoad/mechanicalEvolution/nightmareErosion/voidSpirit/spiritInspire/astralGuidance/soulsealDrive。

json 书写位置：heroInfo/enemy 的 `baseAttributes`（必填三件 attack/defense/maxHp）、`primaryAttributes`、`specialAttributes`。

### 3.2 两种修饰符形状（不要混！）

```ts
// json 友好（talents/awaken/equipment/bonds 用）：经 fromStatModifier 适配
interface StatModifier { stat: StatKey; kind: 'flat'|'percent'; value: number; source?: string }

// 运行时统一（战斗内 modifier 系统）：
interface Modifier { target: `stat.${StatKey}`|`effect.${'damage'|'heal'|'value'|'duration'|'count'}`;
                     op: 'add'|'multiply'; value: number; source?: string }
```

计算语义：`final = (base + Σadd) × (1 + Σmultiply)`；元属性修饰符例外——放大映射效果量而非面板。clamp 最终级统一（暴击率 [0,100%]、暴伤 ≥100%、特殊属性 ≥0）。

### 3.3 派生属性（只算不修）

critResist←敏捷、damageReduction=DEF/(100+DEF)、durationReduction/effectReduction←意志、cooldownReduction←超越、voidSpirit←固有值。UI 来源分解走 getDerivedStatContributions。

## 4. 战斗引擎全解

### 4.1 一场战斗的生命周期

```
createBattle(options)                      combat.ts：双方 roster → entityFactory.resolveEntity → BattleContext
  └─ 回合循环（≤COMBAT_CONFIG.maxBattleRounds）
       roundStart → 依 initiative 排行动作序列（Math.round 取整）
       每单位 turnStart（快照 canAct 后再派发）→ 行动选择（active 能力冷却/MP 校验 or basic_attack）
         → abilityTargeting 选目标 → compileAbilityEffects 展开 EffectInstance[]
         → 逐个 resolveEffect()（§4.3）→ dispatchEvent('attackAfter'/'abilityUsed'/…)
       turnEnd → Buff 触发结算（settleBuffTrigger）→ temporary 时长递减 → 到期回收(statModify 来源清理)
       roundEnd → 死亡清算 / victory 判定
simulateBattle(): 跑完 → BattleOutcome（胜者/经验/事件流）
battleEventPresentation: 事件流 → 中文文案 → IdleCombatWidget 以 baseEventIntervalMs 节奏播放
```

### 4.2 EffectInstance（统一命令）

```ts
{ id, effectId /* 展示/过滤键 */, kind: EffectKind,
  sourceId, targetId,
  params: EffectParamsMap[kind],          // 已求值的最终参数
  origin: {kind:'ability'|'buff', id},    // 归因（递归防环 chainKey 默认由它拼出）
  chainKey? }
```

### 4.3 resolveEffect 管线

1. **chainKey 防环**：默认 `${origin.id}:${effectId}:${sourceId}->${targetId}`，活跃链命中 → `interrupted:'recursion'`；
2. **before 审核**（applyBefore）：
   - 源/目标存在性（summon 豁免目标检查）→ 否则 `invalid`；
   - `resist:'will'` 的 kind 走二元意志对抗：source.willpower < target.willpower → `resisted`；
   - 免疫 flag：executor.immunityFlag(effect) 命中 target 的 flag → `negated`；
   - executor.before 参数修正：效果数值过 `applyEffectModifiers(v, target 侧 mods, 'effect.*')`；负面类再乘 `(1-effectReduction)`；时长类乘 `(1-durationReduction)` 后向上取整；summon 的 count 取**来源侧**修正且 clamp≥1。
3. **during 执行**（executor.during）：写 ctx.turn（dealDamage/applyHeal/addModifier/setFlag/applyBuff/removeBuff/summonUnit…），返回 `EffectResult{applied, interrupted?, values, targetDied?, modifierId?}`；
4. **applied=true** → dispatch `effectApplied` 事件。

中断码全集：`resisted`（意志不足）/`negated`（免疫）/`invalid`（源目标缺失、未知 buffKind）/`recursion`/`zeroed`（如 stun 时长被削至 0 = 自然失效，区别于免疫）/`sourceConflict`（不同 source 挂同种互斥 Buff）。

### 4.4 EffectKind 完整参考（新增必读 §6 菜谱 A）

| kind | params（编译后） | 免疫 flag | 意志对抗 | 备注 |
|---|---|---|---|---|
| damage | `{amount:number, element?:DamageElement, isCrit?:boolean}` | `immunityElement:<el>`(有元素时) | ✗ | 伤害公式见 §4.6 |
| heal | `{amount}` | — | ✗ | 上限钳制前先同步 target.maxHp=resolveStats（增益 buff 抬上限语义） |
| statModify | `{modifier:Modifier}` | — | ✗ | 返回 modifierId 供 Buff 到期移除；value<0 受 effectReduction |
| stun | `{duration}` | `immunityBuff:stun` | ✗ | 内部挂 `stun` Buff；duration≤0 → zeroed |
| dispel | `{buffKind?}` | — | ✓ | 移除目标该 kind Buff |
| immunityElement | `{element}` | — | ✗ | setFlag |
| immunityBuff | `{buffKind}` | — | ✓ | setFlag |
| taunt | `{value}` | — | ✓ | setFlag('taunt')，影响敌方单目标选策 |
| summon | `{count, configRef:EntityConfigRef}` | — | ✗ | count 取来源侧修正 clamp≥1；首单位沿用请求 id 冲突即抛错 |
| applyBuff | `{buffInstance}` | `immunityBuff:<buffId>` | ✗ | duration 过效果时长修正；冲突 → sourceConflict |

元素集 DamageElement：`physical|arcane|mechanical|nightmare|spirit|astral|soulseal`。目前仅 arcane(增幅/抵抗)、mechanical(进化放大) 有结算分支，其余作为标签预留。

### 4.5 Buff 系统

**配置(json) → 挂载(buffSystem.applyBuff：renew 取 max 时长 / stack 叠 stackIncrement / 同 source 冲突拒绝) → 触发(settleBuffTrigger：timing 命中 → 物化) → 到期(temporary 递减；forever+consumeOnTrigger 每触发扣 1 层)。**

物化器公式词表（params 内任意深度就地求值）：

| 原子 | 形状 | 语义 |
|---|---|---|
| flat | `{kind:'flat', value}` | 字面量 |
| perStack | `{kind:'perStack', base, baseOverrideValueKey?}` | base×stacks；values[overrideKey] 数字存在时覆盖 |
| livingEnemies | `{kind:'livingEnemies', per}` | per × 持有者对侧存活数 |
| attack | `{kind:'attack', multiplier}` | 来源解析面板 attack × multiplier |
| maxHp | `{kind:'maxHp', percent}` | 来源解析面板 maxHp × percent |

targetRef：缺省 `holder`；`eventTarget`=时机事件的目标（如反伤打攻击者）。statModify 类触发前先 removeModifiersBySource(buffModifierSource(instance)) 防重复叠加。effectId=纯 label。

### 4.6 伤害公式

```
raw = amount
element==='arcane'    → raw × (1+arcaneBoost) × (1−min(.9, arcaneResistance))
element==='mechanical'→ raw × (1+mechanicalEvolution)
isCrit                → raw × attacker.critDmg
afterDef = raw × 100/(100+defense)
final    = max(1, round(afterDef × (1−min(.9, voidSpirit))))
```

## 5. GameContext 动作面（组件只经 useGame() 调这些）

温室：plantCrop/waterSlot/batchWater/harvestSlot/batchHarvest/batchPlant/setAutoFarmCrop/setAutoFarmEnabled ·
工坊：craftItem/supplyItem · 后勤：assignHeroToDuty/startTask/cancelTask/expandFacility/upgradeShelterStat ·
召唤：summonHero/summonBatch/openSummonModal/closeSummonModal ·
英雄养成：levelUpWithTome/equipItem/unequipItem/enhanceItem/forgeMythic/allocateTalent/unallocateTalent/resetTalents/starUpHero/awakenHero/setParty/healWoundedHero(es) ·
探索战斗：startLevelCombat/startLevelIdle/stopLevelIdle/resolveEncounterBattle/fleeEncounter/defendDreamLeak ·
账户：switchAccount/resetGame/addLog。

state 纯函数层与 context 动作一一对应（`xxxUpdate(state,…): UpdateResult<T>` 风格），新功能先写 state 纯函数+测试，再在 context 包一层。

## 6. 扩展菜谱

### A. 新增一个 EffectKind（例：护盾 shield）

1. `effectSystem.ts`：EffectKind 联合加 `'shield'`；EffectParamsMap 加 `shield:{amount:number}`；EFFECT_AUDIT 加 `{affinity:'beneficial', resist:'none'}`；EFFECT_EXECUTORS 用 `defineExecutor<'shield'>` 注册（before 里 amount 过 applyEffectModifiers(…,'effect.value')；during 写 setFlag 或新机制；present 给文案）。需要免疫拦截就给 immunityFlag。
2. `abilityCompiler.effectParamsForKind` 补 case（json params → 强类型 params）；若 Buff 也要能发，`buffRuntime` 无需改（params 深遍历自动求值）。
3. 若有新参数键参与修正，扩 `EffectParamKey`（'damage'|'heal'|'value'|'duration'|'count'）并在 applyBefore 中接线。
4. 测试：combat.test 族补行为用例（含免疫/抵抗/中断码断言）。

### B. 新增 Buff —— 只写 json（见 config-guide §4），零代码。

### C. 新增战斗时机

turnEngine 常量元组追加键 → 循环相应节点 dispatchEvent → json triggers.timing 即可引用。勿依赖 `(string&{})` 宽尾写裸字符串（无编译期保护）。

### D. 新增属性

statSystem 三层接口之一加字段 → STAT_META 补展示行（TS 会强制）→ statConfig 补 DEFAULT/系数 → json 相应段落书写 → 如属派生属性，getDerivedStatContributions 补贡献分解。

### E. 新公式原子（Buff 词表）

buffRuntime FORMULA_KINDS + resolveValue case → buffTypes 词表注释同步 → integrity 测试补样例。

### F. 新增整个内容域（json 域）

1. `configs/types/<domain>.types.ts` 定型接口；
2. `data/<domain>/` 放 json；
3. `configs/loaders/<domain>.loader.ts`：glob 或显式 import → cast → devGuardTable(domain, rows, {required:[…]}) → export；
4. 消费方从 loader 出口取用；integrity 测试照 `farming.integrity.test` 样板。

### G. 新 UI Tab / 弹窗

组件进 components/（测试文件同目录 `.test.tsx`，jsdom 注解+localStorage 种子+Provider 包裹，见 AGENTS.md）；App.tsx 注册 Tab；图标一律 GameIcon。

## 7. 测试与验证纪律

- 单测 741 个：state 纯函数为主 + loader integrity + 组件渲染。命名 `<module>.test.ts`。
- 三绿收工：`npm run build`（tsc -b && vite build）→ `npx vitest run` → `npm run lint`。
- devGuard 仅 DEV 生效（生产零开销）；坏配置必须开发期暴露，不要在生产兜底静默。
