# 配置指南（配置侧：json 字段参考与内容配方）

> 配套文档：[dev-guide.md](dev-guide.md)（开发侧）。所有路径相对 `src/data/`。
> 标记约定：**必填** = 缺失会破坏功能或触发 devGuard；*可省* = 有明确缺省值（括号注明）。

---

## 0. 全域通用约定

### icon 单字段（视觉）

每条目恰一个 `icon` 字符串，二选一：

| 写法 | 含义 | 例 |
|---|---|---|
| `.png` 路径 | 相对 `src/assets/sprites/` 的切图；经构建管线获得哈希 URL，**路径不存在 = 构建期报错** | `"items/resources/glow_fiber.png"` |
| 其他字符串 | Lucide iconKey，查 `configs/mappings/iconMap.ts` 注册表（未知 key 回退 HelpCircle） | `"sword"`、`"rocket"` |

装配后统一为 `GameArt`（image/glyph），渲染一律走 `GameIcon` 组件。没有 sprite 坐标、没有双轨字段。

### 掉落表 DropEntry（三形态，regions/events 通用）

```jsonc
{ "kind": "fixed",   "itemId": "soul_echo", "count": 3 }
{ "kind": "chance",  "itemId": "scrap_metal", "count": 2, "chancePercent": 60 }
{ "kind": "weighted", "pool": [ { "itemId": "...", "count": 1, "weight": 5 }, ... ] }
```

### 属性修饰符 StatModifier（bonds/talents/awaken/equipment 通用）

```jsonc
{ "stat": "attack", "kind": "percent", "value": 0.1 }   // percent 传小数
{ "stat": "maxHp",  "kind": "flat",    "value": 20 }
```

### 身份法则

键控表的 key 必须等于行内 `id`；开放集合（heroes/enemies/abilities/buffs）身份取 json 内容 `id` 字段，文件夹/文件名只是约定——但新增时请遵守现有命名风格。

---

## 1. 英雄 `entities/heroes/<heroId>/`（五文件，缺省段合法）

> **新增一个英雄 = 只建这一个文件夹**。碎片条目、背包视觉自动随册派生，零其他改动。

### heroInfo.json（必建）

| 字段 | 必填 | 说明 |
|---|---|---|
| id / name / description | ✓ | 身份与文案 |
| icon | ✓ | 见通用约定（英雄立绘切图放 `sprites/entities/heroes/<id>.png`） |
| heroClass | ✓ | 职阶：attacker/guardian/…（影响天赋主干 growthByClass 键） |
| faction | ✓ | 阵营：mechanical/spirit/arcane/astral/nightmare |
| baseAttributes | ✓ | `{maxHp, attack, defense}` |
| primaryAttributes | ✓ | 六维：strength/constitution/agility/intelligence/willpower/transcendence |
| specialAttributes | *可省* | critRate/critDmg 等 |
| starter | *可省* | 初始英雄标记（全游戏应恰一人 true；STARTER_HERO_ID 由此派生） |
| order | ✓ | 图鉴/召唤池排序数字（glob 字母序不可靠，顺序靠它） |

> 不写 `kind` 字段——装配层隐含 `'hero'`。

### duty.json（*可省*：后勤驻守加成）

```jsonc
{ "bonuses": [ { "scope": {"kind":"all"}, "speedMultiplier": 0.25 } ] }
```
scope 四种：`{"kind":"all"}` / `{"kind":"facility","facilityType":"smelter"}` / `{"kind":"greenhouse","cropIds":["glow_grass"]}` / `{"kind":"expedition"}`；每条 bonus 还可带 `yieldMultiplier/costReduction/intervalReduction/lootChanceBonus`。

### awaken.json（*可省*：觉醒段；**能力本体直接内联**）

```jsonc
{
  "awakenedName": "觉醒·诺娃",
  "passive": [ { "stat": "attack", "kind": "percent", "value": 0.1 } ],
  "ability": {                       // 觉醒专属技能全量定义（无复用，不进 abilities/ 公共池）
    "id": "awaken_nova",             // 约定 awaken_<heroId>；装配后回填 AWAKEN_CONFIG.abilityId
    "name": "电涌过载", "description": "对全部敌人造成 {attackPct} 攻击的群体电击伤害。",
    "activation": "active", "targeting": "enemy:all", "cooldown": 3, "priority": 1,
    "effects": [ { "kind": "damage", "params": { "amount": { "kind": "attack", "multiplier": 0.8 } } } ]
  }
}
```
description 数值 token（`{attackPct}/{maxHpPct}/{flat}`）由 combat.loader 从同源 effects 插值——**数值只写在 effects 里**。

### talent.json（*可省*：专属节点数组）

TalentNodeConfig：`id/name/maxLevel/effect[StatModifier]/pos{row,col}/requires?/children?/gate?`。gate 三族：`{type:'talent',nodeId,operator:'greater'|'equal'|'less',value}`、`{type:'awakened'}`、`{type:'heroLevel'|'star', minLevel}`。

### growth.json（*可省*：里程碑）

```jsonc
{ "levelMilestones": { "10": { "attack": 5 }, "20": { "critRate": 0.02 } } }
```

## 2. 敌人 `entities/enemies/<enemyId>.json`（一敌一文件）

`id/name/description/**"kind":"enemy"**/role("normal"|"boss"|"nightmare")/faction/baseAttributes` 必填；
*可省*：primaryAttributes/specialAttributes/modifiers[StatModifier]/abilities[{abilityId, overrides?}]。
战斗图标不走 json（组件内 ENEMY_ICON_MAP）。关卡引用前先确认已建文件。

## 3. 战斗能力 `combat/abilities/<abilityId>.json`

AbilityConfig：`id/name/description/activation("active"|"passive")` 必填；`targeting/cooldown/priority/cost/formula/effects/passive` *可省*。

- targeting 词表：`enemy:first|enemy:all|enemy:lowestHp|ally:self|ally:lowestHpPercent|ally:all`
- effects[]：`{kind, params, fireCount?}`，kind 即 effectSystem 的 EffectKind（damage/heal/statModify/stun/dispel/immunityElement/immunityBuff/taunt/summon/applyBuff）；params.amount 可写公式对象 `{kind:'attack',multiplier}` / `{kind:'maxHp',percent}` / `{kind:'flat',value}`
- basic_attack.json 特殊：全体单位默认普攻，必须存在

## 4. Buff `combat/buffs/<buffId>.json`

| 字段 | 必填 | 说明 |
|---|---|---|
| buffId / durationKind("forever"\|"temporary") / renew / stack / stackIncrement / triggers / effects | ✓ | renew=重复获得取 max 时长；stack+stackIncrement=叠层增量 |
| removable | *可省*(true) | 被动生成的永久 Buff 设 false |
| consumeOnTrigger | *可省*(false) | forever 消耗类每触发扣 1 层 |
| triggers[] | ✓ | `{timing, unitRef:"target"\|"source"}`；timing 取 turnEngine 两族时机键 |
| effects[] | ✓ | `{kind, label?, targetRef?("holder"缺省\|"eventTarget"), params}`；params 数值可为公式原子：`{kind:"flat",value}` / `{kind:"perStack",base,baseOverrideValueKey?}` / `{kind:"livingEnemies",per}` / `{kind:"attack",multiplier}` / `{kind:"maxHp",percent}` |

## 5. 装备 `equipment/`（两文件）

- equipmentSets.json：键=系列 id；`id/name/faction/factionLabel/tierEffects[{threshold,bonus[StatModifier]}]/mythicAffix[StatModifier]`
- equipment.json：12 装备槽表；`id/name/mythicName/slot(weapon|armor|trinket)/set/faction/baseStats[flat]/statPerEnhance[flat]/source(workshop|blueprint|dreamscape|boss)/description` 必填，`blueprintId`（source=blueprint 时）、`icon`（iconKey，如 sword/shield/gem）
- 强化素材/图纸是普通物品（items 表），不是本域数据

## 6. 物品 `items/` 四表

| 文件 | 装配 category 缺省 |
|---|---|
| consumables.json → item · resources.json → resource · shards.json → shard（仅两通用碎片；**英雄碎片自动派生勿手写**）· equipmentItems.json → equipment（仅强化魔晶/图纸等独立物品；**装备条目从 equipment.json 自动派生勿手写**） | 是 |

行字段：`id/name/description/icon` 必填；`category` *可省*=分表默认（不要显式写等于默认值的值）；`useEffect?{stats{food,energy,sanity}, pollution?, capsuleCharge?, heroExp?}`。
数量守卫：items.registry.test 校验分类计数与派生一致性，删物品先看测试预期。

## 7. 区域 `regions/<NN_name>/`（三文件，expedition 可省）

- regionInfo.json：`id/name/description/order/recommendedLevel/enemyPool/explorationEvents/explorationStepsToClear/explorationMilestones[{atPercent,eventId}]` 必填；`unlock?[RegionUnlockRequirement]、initialCost?{food,energy}、isTestZone?` *可省*
- levels.json：LevelConfig[]，`id/name/enemies/staminaCost/drops` 必填（enemies ⊆ regionInfo.enemyPool；末位=关底），`firstClearDrops?` 可省
- expedition.json：`id/name/displayName/scavengeInterval/lootTable` 必填；`shortName/requiredHeroClass/requiredFaction/rationCost/rationConsumptionRate` *可省*

解锁条件词表：`{type:'regionExplored',regionId,percent}` / `{type:'levelCleared',regionId,levelId}` / `{type:'itemHeld',itemId,count}`

## 8. 事件 `events/`

- dreamEvents.json：DreamEvent 键控行。`id/title/description/type(welfare|common|danger|signal)/choices{A,B}` 必填；choice=`{text, results{stats?{sanity,pollution,resonance}, items?, logText}, targetHeroId?}`；`weight?`(100)。resonance + targetHeroId 驱动救援共鸣链
- reality_<type>.json ×7：RealityEvent 键控行，type∈common/danger/combat/welfare/relic/anomaly/encounter；`choices?` 与 `battle?{enemies[],expReward,drops[]}` 二选一按 type；`weight?`(100)
- realityOrder.json：**全量事件 id 清单，控制合并发布序**——新事件必须登记此处
- rescueEvents.json / rescueLocations.json：九人救援剧情与地点映射（names + eventToLocation），与 survivors.json 的 realityLocationId 对齐

## 9. 养成 `progression/`

- bonds.json：BondConfig[]——`id/name/description/heroes[]/factions{阵营:最少人数}/bonus[StatModifier]`（heroes 与 factions 至少一组非空）
- talentTrunks.json：`Record<职阶, TalentNodeConfig[]>` 职阶公共主干
- growthByClass.json：`Record<职阶, {attackPerLevel, defensePerLevel, maxHpPerLevel, maxMpPerLevel, critRatePerLevel, critDmgPerLevel}>`

## 10. 后勤三域

- farming/crops.json：`id/name/growthTime/yields{item:n}/seedCost{seed:n}/description`
- workshop/recipes.json：手动配方 `id/cost/reward` 必填，`special/capsuleTarget/capsuleAmount/blueprintId/facilityId/category/displayName` *可省*
- workshop/autoRecipes.json：自动产线另需 `duration`(秒) + `facilityId`
- shelter/facilities.json：`id/name/shortName?/description/icon/effectLabel/levels[{level,cost,effectValue,effectText,duration}]/expansion{maxUnits,costs[],durations[]}`
- shelter/shelterUpgrades.json：UpgradePath——`id/name/description/category(base|facility)/effectLabel/icon/levels[同上结构]`

## 11. survivors.json（幸存者档案，ADR-0013）

9 人叙事层：`id/name/role(roleLabel 中文职位)/backstory/dreamTrigger/realityLocationId`。服务梦境文案与救援定位；id 必须与英雄 id 一致。**新增英雄需同步补一行。**

---

## 附：高频内容任务速查

| 任务 | 步骤 |
|---|---|
| 新英雄 | 建 entities/heroes/&lt;id&gt;/ 五件套（duty/talent/growth/awaken 按需省略）→ survivors.json 补档案 → items.registry.test 的碎片计数会自动通过（派生）→ 若有立绘放 sprites/entities/heroes/&lt;id&gt;.png |
| 新敌人 | entities/enemies/&lt;id&gt;.json → 引入区域 enemyPool/levels.enemies 或事件 battle.enemies → iconMaps.ts 补 Lucide |
| 新能力 | combat/abilities/&lt;id&gt;.json（被动能力走 passive.triggers+effects）→ 实体 abilities[].abilityId 引用 |
| 新 Buff | combat/buffs/&lt;buffId&gt;.json → 由 applyBuff 效果或代码 ctx.applyBuff 挂载 |
| 新区域 | regions/&lt;NN_id&gt;/ 三文件 → realityOrder 无关；unlock 需求写在 regionInfo |
| 新现实事件 | events/reality_&lt;type&gt;.json 加行 → **realityOrder.json 登记** |
| 新配方/作物/设施/升级 | 对应域 json 追加行即可，装配全自动 |
