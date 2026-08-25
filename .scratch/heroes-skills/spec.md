# 英雄技能系统设计 spec（heroes-skills）

状态：定稿 v1。本文汇编工单 01–08 的全部决议，实现照此执行，不再有待决事项。
决议出处见同目录 `map.md` → Decisions so far；词汇以根目录 `CONTEXT.md`「### 技能」为准。

---

## 0. 总原则

1. **不动战斗引擎**：`resolveEffect` 的 `effect.*` 收集语义（承受方视角）保持原样；一切养成数值在装配期烘焙。
2. **单一装配缝**：`resolveHeroSkills(heroId, hero)` 是英雄三技能的唯一解析出口，战斗与预览共用其输出——弹窗数字 = 战斗数字由构造保证。
3. **正交双通道**：`growth` 只乘公式数值；结构字段（冷却/费用/优先级/目标）只经 `milestones` 绝对值替换。两条通道永不改同一个东西。
4. **灵活性放内容侧**：机制只有一种，差异全在 json。

## 1. 数据模式

### 1.1 新增：`src/data/entities/heroes/<id>/skills.json`

row 数组，**恒三行**（devGuard 强校验）：

```json
[
  {
    "id": "nova_skill_1",
    "slot": 1,
    "abilityId": "nova_arc_bolt",
    "unlock": {},
    "growth": { "perStar": 0.05 },
    "milestones": [
      { "at": { "level": 20 }, "patch": { "cooldown": 2 } }
    ]
  },
  {
    "id": "nova_skill_2",
    "slot": 2,
    "abilityId": "nova_overcharge",
    "unlock": { "level": 10 },
    "growth": { "perLevel": 0.02 },
    "milestones": [
      { "at": { "stars": 3 }, "patch": { "priority": 2 } },
      { "at": { "awakened": true }, "patch": { "cost": { "resource": "mp", "amount": 60 } } }
    ]
  },
  {
    "id": "nova_skill_awaken",
    "slot": 3,
    "abilityId": "awaken_nova",
    "unlock": { "awakened": true }
  }
]
```

字段规约：

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✔ | 行唯一标识（devGuard：非空且不重复） |
| `slot` | ✔ | `1 \| 2 \| 3`，每档恰好一行 |
| `abilityId` | ✔ | 必须存在于 `ABILITY_CONFIGS` 注册表（含 awaken 内联并入项） |
| `unlock` | ✘ | 缺省 = 出生即解锁。条件对象 `{ level?, star?, awakened? }`，AND 语义；键名对齐 `HeroState`（`level` / `star` / `awakened`） |
| `growth` | ✘ | `{ perLevel?, perStar? }`，均可缺省=不成长 |
| `milestones` | ✘ | `{ at: <unlock 同款条件>, patch }[]`；`patch` 白名单四字段：`cooldown`、`priority`、`targeting`、`cost`（整对象替换）；多命中按声明顺序后者覆盖 |

注意：
- 槽位 3 引用本英雄 `awaken.json` 内联能力的 abilityId；**觉醒技本体留在 awaken.json 不迁移**，成长元数据统一住本表。
- 默认门槛约定：槽 1 出生解锁、槽 2 `{"level": 10}`、槽 3 `{"awakened": true}`；星级是否参与解锁由内容决定。
- 解锁状态是运行时派生值，**不写入存档**。

### 1.2 不变的部分

- `src/data/combat/abilities/*.json` 与 `awaken.json` 的能力本体形状不变（现状：全局注册表仅 `basic_attack` 一个文件，其余全部为各英雄 awaken 内联）。
- `ABILITY_CONFIGS` 注册表仍是唯一效果真相源。

### 1.3 扩展：天赋节点 `TalentNodeConfig`

`progression.types.ts` 增加可选字段：

```ts
interface TalentRewrite {
  targetAbilityId: string;                    // 被重写的技能（基础 abilityId）
  priority?: number;                          // 顶层覆盖发动优先级
  effects?: Record<string, EffectTemplate>;   // 键 = 效果索引（"0"、"1"），部分替换
  descriptions?: Record<string, string>;      // 键 = 效果索引，描述覆盖供预览
}
// TalentNodeConfig 增加：
rewrites?: TalentRewrite[];
```

语义（工单 05）：
- 仅当节点投入 ≥ 1 点时生效；
- 多个天赋重写同一技能：按天赋树节点顺序依次应用；
- **只能重写三个既有槽位的技能，不能追加**；三槽皆可重写，觉醒技不做例外；
- 天赋被动数值继续走现有 modifier 通道，不在本次改动面内。

### 1.4 扩展：套装被动 `equipmentSets.json`

```json
"wasteland": {
  "id": "wasteland",
  "...": "现有字段不变",
  "passiveSkills": [{
    "id": "wasteland_set_passive",
    "ability": { "id": "set_wasteland_bulwark", "activation": "passive", "passive": { "...": "BuffTrigger + effects 本体，形状同 PassiveAbilityConfig" } },
    "enhanceGrowth": 0.01
  }]
}
```

规则（工单 06 + Q16/Q17 用户裁定）：
- 一套最多一条被动定义；数据住套装级，单件级不做；
- 生效条件：**武器/防具/饰品三槽全是该系列**才出现；不加强化门槛；
- 数值曲线：强度系数 `S = 1 + enhanceGrowth × min(三件中最低 enhance)`，装配期把该被动 `effects` 内的**公式叶**统一乘 `S`（短板定值，不叠加份数）；与 `statPerEnhance` 的逐级成长思路对称；
- 能力边界：允许触发式效果（Buff 词表），经现成 `abilityPassive` 管线编译成永久 Buff 进战斗；纯数值加成继续走 tierEffects/mythicAffix，不走被动通道；
- UI 入口在装备/英雄装备面板，**不占英雄三槽展示**。

## 2. 装配管线：`resolveHeroSkills`

```ts
// src/state/heroSkills.ts（新文件）
export const resolveHeroSkills = (
  heroId: string,
  hero: HeroState,
  ctx: { equippedSets?: EquippedContext }   // 预览侧可缺省装备上下文
): ResolvedAbility[]
```

四步固定顺序：

```
① 解锁过滤   三行 skills.json 逐行判 unlock（level/star/awakened 对齐 HeroState），
             未解锁的行直接不产出 ResolvedAbility（不进战斗、弹窗走锁定态分支）。
② growth 烘焙 深度遍历 effects[].params 中所有 FormulaTemplate 叶，
             其 multiplier / percent / value × (1 + perLevel×(level−1)) × (1 + perStar×star)。
             ★ 精确边界：只乘公式叶。非公式的数值参数（持续回合、次数、触发概率）
               是内容常量，v1 不吃 growth——要它们变，用 milestones 绝对值替换。
③ milestones 补丁 按 at 判定的里程碑依声明顺序应用 patch（绝对值替换，后者覆盖）。
④ 天赋重写压轴 收集已投入节点（树序）的 rewrites，按 targetAbilityId 匹配后依次应用：
             priority 覆盖；effects 按索引替换；descriptions 按索引替换。
             天赋永远赢过成长。
```

消费方：
- 战斗：`collectHeroAbilities`（`src/state/combat.ts`）改为 `普攻 + resolveHeroSkills(...)`，替换现有的「普攻 + 觉醒技」两段手拼；
- 预览弹窗：直接调同一函数渲染。

## 3. 套装被动装配路径

```
读英雄三件已穿戴实例（equipmentInventory 的 EquippedItem{ itemId, enhance, mythic }）
  → 三件 set 字段一致？
      ├─ 否：无套装被动
      └─ 是：取套装 passiveSkills[0]
            → S = 1 + enhanceGrowth × min(enhance)
            → 公式叶 × S 烘焙
            → 作为普通 passive ResolvedAbility 进入 collectPassiveBuffConfigs（零引擎改动）
```

判定与烘焙发生在战斗装配期与装备面板展示期，两处共用同一纯函数。

## 4. 预览弹窗规格

位置：`HeroDetailModal.tsx` 的 `renderSkillSlot(1|2|3)` 由静态占位改为可点击按钮，打开新组件 `HeroSkillModal`（命名可调）。

分区：

| 分区 | 锁定态 | 解锁态 |
|---|---|---|
| 头部 | 图标 + 名称（名称可显示，或按内容需要打码） + 槽位标签 | 同左 |
| 解锁条 | 解锁条件的可读文案 + 当前进度（如「等级 10 解锁（当前 7）」） | 不显示 |
| 效果描述 | 显示模板原文（占位符渲染为基准值并注明「解锁后随养成成长」） | 占位符渲染为**当前实际值**（resolveHeroSkills 输出） |
| 成长预览 | — | 当前星级/等级加成百分比 + 下一里程碑预告（「Lv.20：冷却变为 2 回合」） |
| 重写标注 | — | 若被天赋重写：显示重写后的效果与描述，覆盖处高亮 |

### 4.1 占位符词表盘点（雾区毕业结论）

现状全库扫描：唯一存在的占位符是 `{attackPct}`，出现于 `basic_attack.json` 与全部 9 个 `awaken.json` 的 description；全 src 无任何替换逻辑与展示面。

v1 渲染词表：

| 占位符 | 取值来源 | 渲染例 |
|---|---|---|
| `{attackPct}` | 该技能 effects[0] 公式叶 `kind:'attack'.multiplier` | `80% 攻击`（乘 growth 后的实际倍率） |
| `{maxHpPct}`（预留） | `kind:'maxHp'.percent` | `40% 最大生命` |
| `{value}`（预留） | `kind:'flat'.value` | `120 点` |

渲染器是纯函数 `renderAbilityDescription(description, resolved): string`，未登记的占位符原样保留并在 DEV 模式告警（防内容笔误静默上线）。天赋 `descriptions` 覆盖的模板同样过渲染器。

> **实现期修正（v1.1）**：盘点时漏看了 `combat.loader` 尾部——历史上存在加载期按基准值烘焙描述的插值循环。本版已将其移除，注册表保留原始模板，插值统一收敛到渲染时（依据：烘焙基准值会顶掉 growth/milestones/重写后的实际数值，违反同源原则）。锁定态展示基准值改由视图模型的 `baseAbility`（未烘焙解析实例）供数。另：`TalentRewrite` 增加 `description?: string` 主描述模板整体替换——效果种类被改写时原模板的占位符可能失效（如 flat→attack 后 `{value}` 无从渲染）。

## 5. 诺娃样板内容清单（工单 08）

- `entities/heroes/nova/skills.json`：三行齐备——
  - 槽 1：attack 公式单体伤害 + 低成长（面板系示范）；
  - 槽 2：flat 公式伤害 + 高 `perLevel`（技能系示范）+ 一个 level 里程碑降冷却 + 一个 awakened 里程碑改费用；
  - 槽 3：`awaken_nova`，unlock awakened。
- 对应两个新能力本体入 `src/data/combat/abilities/`。
- 天赋树新增一个带 `rewrites` 的专属节点作重写示范。
- `equipmentSets.json` 的 wasteland 加一条套装被动作触发示范。

## 6. 实施批次（每批可独立验证）

| 批次 | 内容 | 验证 |
|---|---|---|
| B1 类型与加载 | SkillRow/TalentRewrite/SetPassiveDef 类型；entities.loader 读 skills.json（devGuard：恰三行、slot 各一次、abilityId 存在于注册表、patch 白名单校验） | loader 单测 |
| B2 装配缝 | `heroSkills.ts` 四步管线；`collectHeroAbilities` 接入 | 管线四步各一单测 + 战斗集成测（沿用 awakening.test 的事件断言风格） |
| B3 天赋重写 | 节点 rewrites 应用 + 天赋面板重写标记 | talents.test 扩展 |
| B4 套装被动 | 穿齐判定 + S 烘焙 + abilityPassive 接入 + 装备面板入口 | equipment.test 扩展 |
| B5 预览弹窗 | 槽位可点、HeroSkillModal、占位符渲染器、锁定文案 | 组件测（GameProvider+ToastProvider 包裹、localStorage 预置、jsdom 环境） |
| B6 内容与回归 | 诺娃样板全套 + 全量 vitest + oxlint | `npx vitest run` + `npm run lint` + `npm run build` |

纪律提醒：类型只用 `import type`；无 enum/namespace；json 域不放 .ts；消费方只经 loaders/constants/types。

## 7. 明确不做（Out of scope，见 map）

其余 8 名英雄内容铺量；装备单件级被动；给 Modifier 增加施法者侧作用域的引擎改造。
