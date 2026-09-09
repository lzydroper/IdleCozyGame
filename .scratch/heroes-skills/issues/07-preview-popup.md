# 预览弹窗与占位符渲染

Type: grilling
Status: resolved

## Question

点击技能槽的预览弹窗本期做吗？锁定/解锁各显示什么口径？描述里的 `{attackPct}` 占位符谁来渲染？

## Answer

- 本期实现。无论锁定与否都可点开：
  - **锁定态**：显示解锁条件（unlock 对象渲染成可读文案）；
  - **未锁定**：显示玩家当前养成状态下的**实际数值**（growth / milestones / 天赋重写全部算入）。
- 数值与战斗严格同源：弹窗只消费 `resolveHeroSkills` 的输出，不另算一遍。
- 占位符渲染器纳入范围。现状查明：`{attackPct}` 写在 `basic_attack.json` 与全部 9 个英雄 `awaken.json` 的 description 里，而全 src 无任何替换逻辑、也无任何展示面——与锁定无关，是渲染能力整体缺失；没有渲染器，预览就是死文本。

## Comments

**实现期修正（B5）**：Answer 中「无任何替换逻辑」不准确——`combat.loader` 尾部存在加载期按基准值的插值循环（04 号票 B1 遗产），初查时漏读。处置：该循环已移除，注册表保留原始模板；插值统一收敛到渲染时 `renderAbilityDescription`（烘焙基准值会顶掉成长后的实际数值）。锁定态的基准展示由视图模型新增的 `baseAbility` 供数。详见 spec §4.1 v1.1 修正注。
