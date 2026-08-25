# 撰写 heroes-skills 设计 spec

Type: task
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06, 07, 08

## Question

（执行票，目的地本体）把工单 01–08 的全部决议汇编为 `.scratch/heroes-skills/spec.md`，至少覆盖：

1. 数据模式——skills.json / awaken.json / equipmentSets.json 的 json 形状逐字段定义（含缺省值与 devGuard 校验点）；
2. `resolveHeroSkills` 管线伪码与四步顺序；
3. 天赋重写的合并规则（索引定位、节点序、压轴位置）；
4. 套装被动装配路径（穿齐判定 → 最低强化插值 → abilityPassive 编译）；
5. 预览弹窗规格——版式分区 + 占位符词表盘点（`{attackPct}` 之外的全部待渲染键）；
6. 诺娃样板内容清单；
7. 实施步骤切分（可独立验证的批次）。

写完即达成本图目的地；届时不应再有任何待决事项。

## Answer

已完成：`spec.md` 定稿 v1，七个章节覆盖原清单全部条目——

1. 数据模式：skills.json 恒三行制（含字段规约表与 devGuard 校验点）、awaken.json/注册表不动、TalentNodeConfig 增 `rewrites`、equipmentSets 增 `passiveSkills`（含 enhanceGrowth 曲线）；
2. 装配缝：`resolveHeroSkills` 四步伪码，含 growth「只乘公式叶」的精确边界；
3. 天赋重写合并规则（投入≥1、树序、压轴、索引定位）；
4. 套装被动装配路径（穿齐判定 → min(enhance) 烘焙 → abilityPassive 零引擎接入）；
5. 预览弹窗分区规格 + 占位符词表盘点（雾区毕业：全库仅 `{attackPct}` 存在，v1 词表三项 + 未登记占位符 DEV 告警）；
6. 诺娃样板内容清单；
7. B1–B6 实施批次，每批带独立验证方式。

无遗留待决事项。
