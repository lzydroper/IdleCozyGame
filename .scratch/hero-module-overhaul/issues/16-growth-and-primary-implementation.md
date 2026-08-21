# 升级成长曲线与元属性实装实施

Status: resolved
Type: task
Blocked by: 08

## Question

按 08 的设计决策（D1–D4）落地实施：

1. **数据层**：新建 `src/data/heroGrowth.ts`（`HERO_GROWTH_BY_CLASS` 职阶成长系数表 + `getHeroGrowth` / `getLevelMilestoneBonus` 纯函数 + 元属性作用说明文案常量）；`heroes.ts` 的 `HeroConfig` 增加 `primaryAttributes`（9 位英雄按 D2 表全配）与 `levelMilestones`（各配 1–2 档示例）。
2. **计算层**：`state/combat.ts` 的 `heroMaxHp`/`heroAttack` 改读职阶系数 + 里程碑汇总，新增 `heroDefense`；退役 `combatConfig.hpPerLevel/attackPerLevel`；`combat.test.ts` 断言同步更新。
3. **详情面板**：`HeroDetailModal` 的 `calculatedStats` 删除硬编码 `+10/+3/+1`，统一走三个 hero 函数，并传入 `primaryAttributes: config.primaryAttributes`（元属性增益首次生效）。
4. **详细属性界面**：`DetailedStatsModal` 增为基础属性区 + 元属性区（含各属性作用说明）+ 特殊属性区三区；不加成长预览。
5. **验证**：`npx vitest run` 全量通过（注意 heroes.test / combat.test / statSystem.test 涉及数值的断言）；`npm run build` 通过。

## Answer

（本 session 实施，2026-08-07，按 08 决策 D1–D4）

### 数据层
- 新增 `src/data/heroGrowth.ts`：`HERO_GROWTH_BY_CLASS` 职阶成长系数（守护 生命12/攻2/防2、进攻 6/4/1、协奏 9/3/1）+ `getHeroGrowth` / `getLevelMilestoneBonus`（里程碑多档叠加）+ `PRIMARY_STAT_DESCRIPTIONS`（元属性作用说明，数值与 statConfig 系数一致）。
- `HeroConfig` 增加 `primaryAttributes`（必填）与 `levelMilestones?`；9 位英雄按 08 决策 D2 表全配初始元属性（如诺娃 STR7/INT6，铁卫 CON8 等，总和 20–23），并各配 1–2 档里程碑示例（如诺娃 `{10:{attack:5},20:{critRate:0.02}}`、铁卫 `{10:{maxHp:30},20:{defense:3}}`）。

### 计算层
- `state/combat.ts`：`heroMaxHp`/`heroAttack` 改读职阶系数 + 里程碑汇总（战斗与面板共用唯一来源，**消除详情面板 +10 vs 战斗 +8 的数值打架**）；新增 `heroDefense`（防御每级成长首次实装）。
- `combatConfig.ts`：退役 `hpPerLevel`/`attackPerLevel`（被 heroGrowth 职阶表取代）。

### 详情面板
- `HeroDetailModal.calculatedStats`：删除硬编码 `+10/+3/+1`，统一走 `heroAttack/heroDefense/heroMaxHp`，并传入 `primaryAttributes: config.primaryAttributes`——**元属性增益首次实装**（诺娃 7 力量 → 面板攻击 +14）。

### 详细属性界面（DetailedStatsModal）
- 三区齐全：基础属性区（攻击/防御/生命/魔力/暴击/暴伤）+ 元属性区（数值 + 每项作用说明文案）+ 特殊防务区；不加成长预览（08 决策）。

### 测试
- `combat.test.ts` 更新/新增：职阶成长（nova Lv.5 = 攻 +16、防 +4）、里程碑（9 级无加成 → 10 级 +5 攻 → 25 级不重复叠加）、经验升级 hp 差值保留。
- 验证：全量 `npx vitest run` → **423 passed / 42 files**；`npm run build` 通过；lint 仅 3 条 HeroDetailModal pre-existing（heroEquip exhaustive-deps + hooks 顺序，13 号卡顿优化时一并清理）。
- 备注：战斗数值（heroToCombatant）仍用 heroAttack 基础成长，元属性增益目前实装于面板展示；战斗接入元属性属平衡决策，留待后续数值调优（本 effort 范围外）。

