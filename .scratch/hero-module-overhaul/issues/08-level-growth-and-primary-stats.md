# 升级成长曲线数据化 + 元属性实装 + 详细属性界面

Status: open
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
