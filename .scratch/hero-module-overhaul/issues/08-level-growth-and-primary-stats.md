# 升级成长曲线数据化 + 元属性实装 + 详细属性界面

Status: resolved
Type: grilling
Blocked by:

## Question

升级体系与属性展示的整体改造（第 8 点）：

1. **成长曲线数据化**：每级属性变化（目前写死 `+3 攻击 / +1 防御 / +10 生命`，见 `state/combat.ts` 的 `heroMaxHp`/`heroAttack` 与 HeroDetailModal）改为数据配置区——按职阶或按英雄的成长系数（per-level growth）。
2. **初始元属性配置区**：`HeroConfig` 增加 `primaryAttributes`（strength/constitution/agility/intelligence/willpower/transcendence）字段，9 位英雄各配一组初始值。
3. **元属性增益实装**：`calculateEntityStats` 已实现元属性→基础属性映射（`statConfig.ts`），但当前所有英雄元属性默认 0 从未实装；接入 HeroConfig 初始值，使力量/体质/敏捷等真正影响面板。
4. **详细属性界面**（DetailedStatsModal）：包含基础属性（攻击/防御/生命/魔力/暴击/暴伤）、元属性、各属性具体作用说明（文案来自 statConfig/ADR-0009 设定）；信息文字与设定统一。
5. 与 07（经验道具）保持解耦：本 ticket 管「升级后属性怎么变」，07 管「升级消耗什么」。

产出：数据配置（heroes.ts / 新 growth 配置）+ statSystem 接入 + DetailedStatsModal 改造 + 测试。

## Answer：升级成长曲线 / 元属性 / 详细属性界面设计决策（2026-08-07，HITL 与用户确认）

### D1. 成长曲线数据化：职阶基础系数 + 英雄里程碑微调
- 新数据文件 `src/data/heroGrowth.ts`：
  - `HERO_GROWTH_BY_CLASS: Record<HeroClass, { hpPerLevel; attackPerLevel; defensePerLevel }>`——每级成长唯一真相源。
  - 默认职阶系数（与战斗现状 8/3/0 对齐并补防御）：
    | 职阶 | 生命/级 | 攻击/级 | 防御/级 |
    |---|---|---|---|
    | 守护者 guardian | 12 | 2 | 2 |
    | 进攻者 attacker | 6 | 4 | 1 |
    | 协奏者 conductor | 9 | 3 | 1 |
  - `getHeroGrowth(config)` / `getLevelMilestoneBonus(config, level)` 纯函数。
- `HeroConfig` 增加 `levelMilestones?: Record<number, Partial<BaseAttributes>>`——英雄级微调点，如 `nova: { 10: { attack: 5 }, 20: { critRate: 0.02 } }`（单次、每档可配不同加成）。9 位英雄各配 1–2 档示例（10/20 级）体现差异化。
- `state/combat.ts`：`heroMaxHp`/`heroAttack` 改读职阶系数 + 里程碑汇总；新增 `heroDefense`；**HeroDetailModal 的硬编码 `+10/+3/+1` 删除**，统一走这三个函数（消除两处数值打架：详情面板 +10 生命 vs 战斗 +8）。
- `combatConfig.ts` 的 `hpPerLevel`/`attackPerLevel` 退役（被职阶表取代），`combat.test.ts` 断言同步更新。

### D2. 初始元属性默认倾向表（`HeroConfig.primaryAttributes` 必填，总和约 20–23，后续可调）
| 英雄 | STR | CON | AGI | INT | WIL | TRA |
|---|---|---|---|---|---|---|
| nova | 7 | 3 | 3 | 6 | 1 | 2 |
| buster | 8 | 5 | 3 | 2 | 2 | 2 |
| soldier | 4 | 8 | 2 | 2 | 4 | 2 |
| catherine | 2 | 6 | 3 | 5 | 6 | 1 |
| roy | 4 | 4 | 3 | 7 | 2 | 3 |
| mei | 2 | 4 | 3 | 8 | 3 | 3 |
| zero | 3 | 3 | 8 | 4 | 2 | 3 |
| healer | 1 | 4 | 3 | 7 | 6 | 2 |
| apprentice | 3 | 4 | 4 | 5 | 3 | 4 |

### D3. 元属性增益实装
- `HeroDetailModal` 的 `calculateEntityStats` 传入 `primaryAttributes: config.primaryAttributes`（statConfig.ts 的 STR→攻击/暴伤、CON→生命/防御、AGI→暴击/免暴、INT→魔力/奥术增幅、WIL→负面减免、TRA→冷却减免 首次真正生效）。

### D4. 详细属性界面（DetailedStatsModal）
- 三区齐全：**基础属性区**（攻击/防御/生命/魔力/暴击/暴伤）+ **元属性区**（数值 + 每项作用说明文案：力量→攻击与暴伤、体质→生命与防御、敏捷→暴击与免暴、智慧→魔力与奥术增幅、意志→负面持续与数值减免、超越→冷却减免）+ 特殊属性区。
- **不加成长预览**（用户选择；成长信息由升级批量弹窗承载，见 15 号）。

### 实施要点（毕业为 16 号 ticket）
- heroGrowth.ts + heroes.ts（primaryAttributes 9 人全配 + levelMilestones）+ combat.ts（heroDefense/统一来源）+ HeroDetailModal（统一计算 + 传元属性）+ DetailedStatsModal（三区）+ combat.test.ts 更新。

