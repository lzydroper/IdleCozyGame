# Wayfinder 地图：英雄技能系统 × Ability 结合

Labels: wayfinder:map

## Destination

一份定稿的设计 spec（本目录 `spec.md`）：把已建成的 Ability 战斗运行时与英雄养成维度（等级 / 星级 / 觉醒 / 天赋 / 装备）完整接通——数据模式、装配管线、天赋重写、套装被动、预览弹窗的全部决策落成文字，使后续实现可直接照做、无需再做设计决定。

## Notes

- 领域：AetherGarden 自动战斗子系统。Ability 运行时（选目标→扣费→冷却→派发 Effect）已建成于 `src/state/ability*`，缺口是英雄侧三技能槽的数据管道与 UI。
- 本图经四轮 HITL 推演产出：8 个决策簇已当面敲定、归档为已决工单；唯一在途工作是终票「撰写 spec」。
- 站立偏好：机制极简（能不动引擎就不动）；灵活性放 json 内容侧；预览数值与战斗严格同源；v1 只做诺娃一个样板英雄；讨论语言中文。
- 参考文档：`docs/dev-guide.md` §4 战斗引擎全解、§6 扩展菜谱；`docs/config-guide.md` 各域配方；`src/state/abilityTypes.ts` 为 Ability 层类型契约。

## Decisions so far

- [数据归属：skills.json 三行制](issues/01-data-home.md) — 每英雄 skills.json 固定三行（槽3 引用 awaken 能力），成长元数据一处看全，本体各回各家
- [解锁模型](issues/02-unlock.md) — 声明式 unlock 条件对象（level/stars/awakened 可组合），默认：槽1 出生解锁、槽2 Lv.10、觉醒技=已觉醒；解锁状态派生不落存档
- [数值成长与里程碑](issues/03-growth-milestones.md) — growth 连续乘算只管效果数值；milestones 离散绝对值替换只管 cooldown/cost/priority/targeting；两通道永不相交
- [装配单出口](issues/04-assembly-seam.md) — resolveHeroSkills 四步管线（过滤→烘焙→里程碑→天赋压轴），战斗与预览共用同一输出
- [天赋重写语义](issues/05-talent-rewrite.md) — 效果索引定位部分替换 + priority 覆盖；按节点序合成；只能重写不能追加；三槽皆可重写
- [套装被动](issues/06-set-passive.md) — 集齐三件同系列才出现、一套唯一一条、按最低强化件线性插值、走 abilityPassive 触发管线
- [预览弹窗](issues/07-preview-popup.md) — 本期实现；锁定显条件、解锁显当前实际值；占位符渲染器纳入范围（现状无任何渲染面）
- [内容范围](issues/08-content-scope.md) — v1 仅诺娃配满三技能作样板，附新英雄技能配方
- [撰写 heroes-skills 设计 spec](issues/09-write-spec.md) — spec.md 定稿 v1：数据模式/装配缝四步管线/重写合并/套装被动路径/弹窗规格与占位符词表/B1–B6 批次；无遗留待决事项

## Not yet specified

（无——两项雾区均已随「撰写 spec」毕业：弹窗版式落为 spec §4 分区表；占位符词表盘点落为 spec §4.1。）

## Out of scope

- 其余 8 名英雄的三技能内容铺量（[工单 08](issues/08-content-scope.md) 已裁定：v1 只做诺娃，其余按配方另行批量补）。
- 装备单件级被动（[工单 06](issues/06-set-passive.md) 已裁定：只做套装级，等出现真实需求再扩）。
- 给 Modifier 增加施法者侧作用域、按技能 scoping 的战斗引擎改造（Q4 讨论中被否决的路线：`effect.*` 维持承受方收集语义，养成数值一律装配期烘焙）。
