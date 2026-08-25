# 装配单出口：resolveHeroSkills

Type: grilling
Status: resolved

## Question

英雄技能的解析/装配在哪里发生？如何保证战斗与 UI 数值同源？

## Answer

- 单一纯函数 `resolveHeroSkills(heroId, heroState)` 作为唯一装配缝，四步固定顺序：
  1. **解锁过滤**（unlock 条件）
  2. **growth 数值烘焙**进公式/效果参数
  3. **milestones 结构补丁**
  4. **天赋 overrides 合并**（最后压轴）
- 消费方：战斗装配（现 `collectHeroAbilities` 改造为调它）与英雄详情预览弹窗都只消费它的输出——"弹窗数字 = 战斗数字"由构造保证。
- 不改动战斗引擎：`resolveEffect` 的 `effect.*` 收集语义（承受方视角，effectSystem.ts L139）维持原样；养成数值一律装配期烘焙。否决了给 Modifier 加施法者侧作用域的路线（记入地图 Out of scope）。
