# 升级成长曲线与元属性实装实施

Status: open
Type: task
Blocked by: 08

## Question

按 08 的设计决策（D1–D4）落地实施：

1. **数据层**：新建 `src/data/heroGrowth.ts`（`HERO_GROWTH_BY_CLASS` 职阶成长系数表 + `getHeroGrowth` / `getLevelMilestoneBonus` 纯函数 + 元属性作用说明文案常量）；`heroes.ts` 的 `HeroConfig` 增加 `primaryAttributes`（9 位英雄按 D2 表全配）与 `levelMilestones`（各配 1–2 档示例）。
2. **计算层**：`state/combat.ts` 的 `heroMaxHp`/`heroAttack` 改读职阶系数 + 里程碑汇总，新增 `heroDefense`；退役 `combatConfig.hpPerLevel/attackPerLevel`；`combat.test.ts` 断言同步更新。
3. **详情面板**：`HeroDetailModal` 的 `calculatedStats` 删除硬编码 `+10/+3/+1`，统一走三个 hero 函数，并传入 `primaryAttributes: config.primaryAttributes`（元属性增益首次生效）。
4. **详细属性界面**：`DetailedStatsModal` 增为基础属性区 + 元属性区（含各属性作用说明）+ 特殊属性区三区；不加成长预览。
5. **验证**：`npx vitest run` 全量通过（注意 heroes.test / combat.test / statSystem.test 涉及数值的断言）；`npm run build` 通过。
