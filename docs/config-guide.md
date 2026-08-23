# 配置指南（配置侧）

> 本文是内容/策划配置的完整参考：每个 json 文件的字段、类型、必填性、缺省值、交叉引用与校验方式。
> 配套：[dev-guide.md](dev-guide.md)（开发侧）。所有数据路径相对 `src/data/`，切图相对 `src/assets/sprites/`。
> 标记：**必填**＝缺失会破坏功能或触发 DEV 守卫；*可省*＝有明确缺省值（注明）。
> 通用校验：键控表的 key 必须等于行内 `id`（devGuard 开发期强检）；开放集合身份取 json 内容字段，文件夹命名仅是约定。

---

## 0. 全域通用形状

### 0.1 icon 单字段（视觉）

每条目**恰一个** `icon` 字符串：

| 写法 | 解析 | 约束 |
|---|---|---|
| `"items/resources/glow_fiber.png"` | 相对 `src/assets/sprites/` 的切图 → 构建期哈希 URL | **路径必须真实存在**，否则构建报错 |
| `"sword"` / `"rocket"` 等 | Lucide iconKey → `configs/mappings/iconMap.ts` 注册表 | 未知 key 回退 HelpCircle 并 DEV 告警 |

装配后统一为 `GameArt`；渲染一律 `GameIcon`。禁止再写 `sprite`/`iconKey` 字段。

### 0.2 属性修饰符 StatModifier

```jsonc
{ "stat": "attack", "kind": "percent", "value": 0.1 }   // percent 传小数；多来源加算
{ "stat": "maxHp",  "kind": "flat",    "value": 20 }
```
`stat` 可用全集（21）：基础 attack/defense/maxHp/maxMp/critRate/critDmg；元属性 strength/constitution/agility/intelligence/willpower/transcendence；特殊 arcaneBoost/arcaneResistance/mechanicalLoad/mechanicalEvolution/nightmareErosion/voidSpirit/spiritInspire/astralGuidance/soulsealDrive。
`source` *可省*：来源标注字符串，UI 分解展示用（战斗内 statModify 会自动盖 Buff 来源戳）。

### 0.3 掉落表 DropEntry（regions/events 通用）

```jsonc
{ "kind": "fixed",    "itemId": "soul_echo", "count": 3 }
{ "kind": "chance",   "itemId": "scrap_metal", "count": 2, "chancePercent": 60 }
{ "kind": "weighted", "pool": [ { "itemId": "...", "count": 1, "weight": 5 } ] }
```

### 0.4 升级等级 UpgradeLevel（facilities/shelterUpgrades 通用）

```jsonc
{ "level": 2, "cost": { "scrap_metal": 20 }, "effectValue": 0.1, "effectText": "效率 110%", "duration": 1800 }
```
`duration`＝升到该级施工秒数；level 1 惯例为初始档（cost 空、duration 0）。

### 0.5 数值 token 与公式

- 能力 description 用 token：`{attackPct}/{maxHpPct}/{flat}` ← 同源 effects 参数插值（数值唯一真相在 effects）；
- params 内数值可写公式对象：能力侧 `{kind:'attack',multiplier}`/`{kind:'maxHp',percent}`/`{kind:'flat',value}`；Buff 侧另有 perStack/livingEnemies（见 §4）。

---

## 1. 英雄 `entities/heroes/<heroId>/`（五文件）

> **新增一个英雄 = 只建这一个文件夹**：碎片条目、碎片视觉、背包侧零额外配置（items.loader 派生）。

### 1.1 heroInfo.json（必建；单对象非行表）

| 字段 | 必填 | 类型/说明 |
|---|---|---|
| id | ✓ | 全局英雄 id（= 文件夹名约定；shard_<id>/STARTER 派生依据） |
| name / description | ✓ | 展示名与档案文案 |
| icon | ✓ | 见 §0.1（立绘惯例 `entities/heroes/<id>.png`） |
| heroClass | ✓ | 职阶——决定 talentTrunks/growthByClass 的键与图鉴分组 |
| faction | ✓ | mechanical/spirit/arcane/astral/nightmare |
| baseAttributes | ✓ | `{attack, defense, maxHp}` 必填三件；maxMp/critRate/critDmg *可省*(默认 50/0.05/1.5) |
| primaryAttributes | ✓ | 六维齐全书写（strength…transcendence） |
| specialAttributes | *可省* | 九项特殊属性，缺省全 0 |
| starter | *可省*(false) | 初始英雄标记；全游戏应恰一人 true |
| order | ✓ | 图鉴/召唤池发布序数字 |

> **不写 `kind` 字段**——装配层隐含 `'hero'`。

### 1.2 duty.json（*可省*：后勤驻守）

```jsonc
{ "bonuses": [
  { "scope": { "kind": "facility", "facilityType": "smelter" },
    "speedMultiplier": 0.25, "yieldMultiplier": 0, "costReduction": 0,
    "intervalReduction": 0, "lootChanceBonus": 0 }
] }
```
scope 四种：`{"kind":"all"}`｜`{"kind":"facility","facilityType":"smelter"|"assembler"}`｜`{"kind":"greenhouse","cropIds?":[...]}`｜`{"kind":"expedition"}`；五个加成系数全部 *可省*(0)。

### 1.3 awaken.json（*可省*：觉醒段；**能力本体直接内联**）

```jsonc
{
  "awakenedName": "觉醒·诺娃",
  "passive": [ { "stat": "attack", "kind": "percent", "value": 0.1 } ],
  "ability": {
    "id": "awaken_nova",            // 约定 awaken_<heroId>
    "name": "...", "description": "对全部敌人造成 {attackPct} 攻击的群体电击伤害。",
    "activation": "active", "targeting": "enemy:all", "cooldown": 3, "priority": 1,
    "effects": [ { "kind": "damage", "params": { "amount": { "kind": "attack", "multiplier": 0.8 } } } ]
  }
}
```
装配后 combat.loader 将 ability 并入全局能力注册表、AWAKEN_CONFIG.abilityId 自动回填——运行时与公共能力同一套管线。无 ability 即视为不可觉醒。

### 1.4 talent.json（*可省*：专属节点数组 TalentNodeConfig[]）

```jsonc
[{ "id": "hero_nova_overdrive", "name": "过载引擎", "maxLevel": 3,
   "effect": [{ "stat": "attack", "kind": "percent", "value": 0.02 }],
   "pos": { "row": 1, "col": 1 },
   "requires": ["hero_nova_booster"],        // 可省：画线+阻塞父节点
   "children": ["..."],                      // 可省：布局子序
   "gate": [ { "type": "awakened" },
             { "type": "talent", "nodeId": "x", "operator": "equal", "value": 0 },
             { "type": "heroLevel", "minLevel": 10 }, { "type": "star", "minLevel": 2 } ] }]
```
gate=AND 门控（只阻塞不画线）；operator 三值 greater/equal/less 表达投入关系（equal 0 常用于互斥）。

### 1.5 growth.json（*可省*：里程碑）

```jsonc
{ "levelMilestones": { "10": { "attack": 5 }, "20": { "critRate": 0.02 } } }
```
键=等级字符串，值=StatModifier 式面板加成段落（base/primary/special 属性名直写）。

## 2. 敌人 `entities/enemies/<enemyId>.json`（一敌一文件）

```jsonc
{ "id": "wasteland_hound", "name": "废土鬣狗", "description": "饥饿的变异鬣狗。",
  "kind": "enemy",                       // 敌人必写（与英雄相反）
  "role": "normal",                      // normal|boss|nightmare
  "faction": "nightmare",
  "baseAttributes": { "maxHp": 45, "attack": 9, "defense": 3 },
  "abilities": [ { "abilityId": "basic_attack" } ],      // 可省；overrides 可覆盖参数
  "primaryAttributes": {}, "specialAttributes": {}, "modifiers": []   // 均可省
}
```
战斗图标不走 json（组件 ENEMY_ICON_MAP 注册，新敌记得去 `components/iconMaps.ts` 补一行）。

## 3. 战斗能力 `combat/abilities/<abilityId>.json`

| 字段 | 必填 | 说明 |
|---|---|---|
| id / name / description / activation | ✓ | activation: `"active"` 或 `"passive"` |
| targeting | active 必配 | `enemy:first\|enemy:all\|enemy:lowestHp\|ally:self\|ally:lowestHpPercent\|ally:all` |
| cooldown / priority / cost{resource,amount} | *可省*(0/0/无) | cooldown 受超越冷却缩减；priority＝多个可用能力间的**选用优先级**（高者先被 AI 选中，非出手顺序） |
| formula | *可省* | 面板基准量：`{kind:'attack',multiplier}` 等（供无 effects 的纯倍率场景） |
| effects[] | active 通常必配 | EffectTemplate：`{kind, params, fireCount?}`；fireCount(≥1) = 该条效果重复发次数，整组能力 fireCount 取最大值 |
| passive | passive 必配 | `{triggers:[{timing,unitRef}], effects:[EffectTemplate]}` —— 被动=自带触发的隐形 Buff 语义 |

effects[].kind 十种与 params 详见 dev-guide §4.4 表；params 数值可写公式对象由编译器按施放者面板求值。

## 4. Buff `combat/buffs/<buffId>.json`

| 字段 | 必填 | 说明 |
|---|---|---|
| buffId / durationKind("forever"\|"temporary") / renew / stack / stackIncrement / triggers / effects | ✓（devGuard required 后四者+durationKind） | renew=重复获得取 max 时长；stack+stackIncrement=每次叠加层数 |
| removable | *可省*(true) | 被动生成的永久 Buff 设 false（不可驱散） |
| consumeOnTrigger | *可省*(false) | forever 消耗类每触发扣 1 层（层尽自灭） |
| triggers[] | ✓ | `{timing, unitRef:"target"\|"source"}`；timing ∈ roundStart/turnStart/turnActive/turnEnd/roundEnd + abilityUsed/attackAfter/damageTaken/healingTaken/death/summon/effectApplied |
| effects[] | ✓ | BuffEffectTemplate：`{kind, label?, targetRef?, params}`；label=effectId（展示与测试过滤键）；targetRef 缺省 holder、`eventTarget`=时机事件目标 |

**Buff 公式词表**（params 任意深度就地求值，能力侧不适用）：

| 原子 | 形状 | 语义 |
|---|---|---|
| flat | `{kind:"flat", value}` | 字面量 |
| perStack | `{kind:"perStack", base, baseOverrideValueKey?}` | base×当前层数；挂载时 values[key] 有数字则整体覆盖 |
| livingEnemies | `{kind:"livingEnemies", per}` | per × 持有者对侧存活数 |
| attack / maxHp | `{kind:"attack", multiplier}` / `{kind:"maxHp", percent}` | 来源解析面板乘算 |

现成样例：burn.json（灼烧 perStack tick）、stun/foldFlame/warSpirit。

## 5. 装备 `equipment/`

- **equipmentSets.json**：键=系列 id；`id/name/faction/factionLabel/tierEffects[{threshold, bonus[StatModifier]}]` 必填；`mythicAffix[StatModifier]`（神话穿戴通用词条）。阈值=该系列穿戴装备强化总和。
- **equipment.json**：12 装备槽表；`id/name/mythicName/slot(weapon|armor|trinket)/set/faction/baseStats/statPerEnhance/source/description` 必填；`blueprintId`（source="blueprint" 时必配）；`icon`(iconKey，惯用 sword/shield/gem)。baseStats/statPerEnhance 一律 flat StatModifier。
- 强化素材/图纸是普通物品（items 表）；强化上限等数值在 configs/constants/equipmentConstants。

## 6. 物品 `items/` 四表

| 文件 | category 分表默认 | 放什么 |
|---|---|---|
| consumables.json | item | 可主动使用的道具 |
| resources.json | resource | 材料/种子/货币/场景装置 |
| shards.json | shard | **仅两通用碎片** arcane_orb/resonance_shard；英雄灵魂碎片自动派生，勿手写 |
| equipmentItems.json | equipment | 仅独立物品（enhance_stone/blueprint_*）；12 件系列装备条目自动派生，勿手写 |

行字段：`id/name/description/icon` 实际全填；`category` 不要显式写（等于分表默认）；`useEffect?`：
`{ stats?:{food?,energy?,sanity?}, pollution?, capsuleCharge?:{"sanity_capsule"|"warp_capsule":n}, heroExp?:n }`。
守卫：items.registry.test 断言分类计数（12/39/14/2+英雄数）、派生一致性、icon 完整性——增删物品先跑它。

## 7. 区域 `regions/<NN_name>/`（一区一夹三文件）

- **regionInfo.json**：`id/name/description/order/recommendedLevel/enemyPool[]/explorationEvents[](事件id池)/explorationStepsToClear/explorationMilestones[{atPercent,eventId}]` 必填；`unlock?`/`initialCost?{food,energy}`/`isTestZone?` *可省*。
- **levels.json**：LevelConfig[]（数组有序，末位=关底）：`id/name/enemies[](⊆enemyPool)/staminaCost/drops[]` 必填；`firstClearDrops?` 可省。
- **expedition.json**（*可省*，无文件即无远征点）：`id/name/displayName/scavengeInterval(秒)/lootTable[]` 必填；`shortName/requiredHeroClass/requiredFaction/rationCost/rationConsumptionRate` *可省*。

unlock 词表：`{type:'regionExplored',regionId,percent}`｜`{type:'levelCleared',regionId,levelId}`｜`{type:'itemHeld',itemId,count}`。

## 8. 事件 `events/`

| 文件 | 形状 | 要点 |
|---|---|---|
| dreamEvents.json | 键控行 DreamEvent | `id/title/description/type(welfare\|common\|danger\|signal)/choices{A,B}` 必填；choice=`{text, results:{stats?{sanity,pollution,resonance}, items?, logText}}`；resonance+targetHeroId 驱动救援共鸣；`weight?`(100) |
| reality_<type>.json ×7 | 键控行 RealityEvent（type∈common/danger/combat/welfare/relic/anomaly/encounter，文件名即类别） | `choices{A,B}?` 与 `battle?{enemies[],expReward,drops[]}` 按 type 二选一；`weight?`(100) |
| realityOrder.json | 字符串数组 | **全部现实事件 id 的发布序清单**——新事件必须登记；loader 先按单归并再依此重排，漏登记排尾部 |
| rescueEvents.json | 键控行（type=combat 语义） | 九人救援剧情；requirements 表达选项消耗（如 defensive_turret×1） |
| rescueLocations.json | `{names:{locId:{displayName,shortName?}}, eventToLocation:{locId:rescueEventId}}` | 与 survivors.realityLocationId 对齐 |

## 9. 养成 `progression/`

- bonds.json：BondConfig[]：`id/name/description/heroes[]/factions{阵营:最少人数}/bonus[StatModifier]`；heroes 与 factions 至少一组非空。
- talentTrunks.json：`Record<职阶, TalentNodeConfig[]>` 职阶公共主干（结构同 §1.4）。
- growthByClass.json：`Record<职阶, {attackPerLevel, defensePerLevel, maxHpPerLevel, maxMpPerLevel, critRatePerLevel, critDmgPerLevel}>`。

## 10. 后勤三域

| 文件 | 行字段 |
|---|---|
| farming/crops.json | CropConfig：`id/name/growthTime(秒)/yields{item:n}/seedCost{seed:n}/description` |
| workshop/recipes.json | Recipe：`id/cost{}/reward{}` 必填；`blueprintId/special:'capsule_charge'/capsuleTarget/capsuleAmount/facilityId/category/displayName` *可省*（displayName 仅无 reward 建筑类兜底） |
| workshop/autoRecipes.json | 手动字段 + `duration`(秒) + `facilityId` 必填 |
| shelter/facilities.json | FacilityConfig：`id/name/shortName?/description/icon/effectLabel/levels[UpgradeLevel]/expansion{maxUnits,costs[],durations[]}` |
| shelter/shelterUpgrades.json | UpgradePath：`id/name/description/category('base'\|'facility')/effectLabel/icon/levels[UpgradeLevel]`；`unlockRequirements?[{type:'upgrade_level'\|'item_count', id, minValue}]` |

## 11. survivors.json（幸存者档案，ADR-0013）

数组九行：`id(=英雄id)/name/role(farmer|engineer|scout|guard|chemist|scavenger)/roleLabel/backstory/dreamTrigger/realityLocationId`。
用途：梦境共鸣文案（backstory/dreamTrigger）、救援坐标锁定与现实点显示（realityLocationId ↔ rescueLocations.eventToLocation）。**新增英雄必须同步补一行。**

---

## 附 A. 高频任务配方

| 任务 | 步骤 |
|---|---|
| 新英雄 | ① 建 `entities/heroes/<id>/`：heroInfo(+duty/talent/growth/awaken 按需)；② survivors.json 补一行；③ 立绘放 `sprites/entities/heroes/<id>.png` 并在 heroInfo 写 icon 路径；④ 跑 items.registry.test（碎片计数自动含新英雄）。零代码改动。 |
| 新敌人 | ① `entities/enemies/<id>.json`；② `components/iconMaps.ts` ENEMY_ICON_MAP 补 Lucide；③ 引入 regionInfo.enemyPool / levels.enemies / 事件 battle.enemies |
| 新主动能力 | `combat/abilities/<id>.json`（targeting+effects）→ 实体 abilities[].abilityId 或 awaken.json 引用；description 数值只经 token |
| 新被动能力 | 同上但 `activation:"passive"` + `passive:{triggers,effects}`；挂载于实体的 abilities 列表 |
| 新 Buff | `combat/buffs/<buffId>.json` → 由 applyBuff 效果引用（json）或 ctx.applyBuff（代码） |
| 新区域 | `regions/<NN_id>/` 三件套 → 敌人入池 → 前置区域 unlock 若需要 |
| 新现实事件 | 对应 reality_<type>.json 加行 → **realityOrder.json 登记** |
| 新梦境事件 | dreamEvents.json 加行（weight 控制权重） |
| 新配方/作物/设施/升级 | 对应域 json 追加行即可 |
| 新切图接入 | png 放 sprites/ 对应域夹 → 数据行 icon 写相对路径（构建期校验存在性） |

## 附 B. 校验清单（改完配置自查）

1. `npm run build`——resolveJsonModule 下坏路径/类型不符编译期暴露；icon png 缺失构建失败；
2. DEV 启动看控制台——devGuard 抛 key/id 不一致、必填缺失；
3. `npx vitest run src/configs/loaders`——items.registry（计数/派生/icon）、heroes/heroesDuty/abilities/regions integrity；
4. 交叉引用 grep：新 itemId 是否被 recipes/drops/costs 引用拼写一致；eventId 是否登记 realityOrder；enemies ⊆ enemyPool。
