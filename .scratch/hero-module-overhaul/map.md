# 英雄模块修复改造（hero-module-overhaul）— Wayfinder Map

## Destination

英雄模块改造完成：统一的图标渲染系统（spritesheet / Lucide / 汉字回退三级，avatar 字段废除）、流畅的英雄详情与招募界面、规范统一的招募交互（10/100 抽切换、结果与提示样式统一）、数据驱动的升级/属性/天赋体系（含元属性实装）、树状天赋树、英雄档案详情页，以及整理干净的英雄 tab 代码。

## Notes

- **领域**：英雄养成、招募（gacha）、图标渲染、三层属性系统、天赋树。
- **技能**：`grilling`、`domain-modeling`、`prototype`、`research`、`implement`。
- **关键数据文件**：`src/data/heroes.ts`、`src/data/talents.ts`、`src/data/statConfig.ts`、`src/data/summonConfig.ts`、`src/data/items/shards.ts`、`src/data/survivors.ts`。
- **关键组件**：`GameIcon.tsx`、`iconMaps.ts`、`HeroTab.tsx`、`HeroDetailModal.tsx`、`HeroTalentPanel.tsx`、`SummonTab.tsx`、`DetailedStatsModal.tsx`、`ToastSystem.tsx`。
- **状态/逻辑层**：`state/statSystem.ts`、`state/combat.ts`、`state/summon.ts`、`context/GameContext.tsx`。
- **已确认的用户决策**：
  - 升级改为消耗**经验道具**（新增物品，如「经验手册」），不再无消耗直升。
  - 招募「切换」按钮影响右侧大按钮在 **10次 ↔ 100次** 间切换；「招募 1 次」按钮保留。
  - 天赋树采用**纵向主干 + 横向分支**的经典树形布局。
  - `HeroConfig.avatar` 字段**删除**，头像统一走 `GameIcon`（sprite → Lucide → 汉字首字回退）。
- **ADR 参考**：ADR-0003（经验仅来自战斗，需与手动升级协调）、ADR-0009（三层属性引擎）、ADR-0013（幸存者 = 英雄的剧情档案）、ADR-0014（物品统一模型）、ADR-0015（sprite 单一真相源）。
- **测试**：组件测试需 `GameProvider` + `ToastProvider` 包裹；`npm run build` 先 `tsc -b`；lint 用 `oxlint`。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [图标与英雄字段使用点全量枚举（研究）](issues/01-icon-avatar-usage-survey.md) — 9 位英雄 avatar 配置为 0/9，6 处 `<img src={avatar}>` 全是死分支（实际渲染汉字首字）；sprite 9/9 全覆盖；碎片物品只有 Lucide 无 sprite；SURVIVORS_CONFIG 纯文本剧情档案。删除 avatar 零视觉影响。
- [英雄详情与招募界面卡顿根源分析（研究）](issues/02-hero-ui-lag-analysis.md) — 根因：GameContext 每秒整树刷新 + 全仓库零 memo（R1）；HeroDetailModal 的 useMemo 依赖正确非问题点；子弹窗无 memo / 无条件渲染（R2）；applyTick 无条件重建子树（R3）；升星 disabled 与保底进度每 tick 重算（R4）。已毕业出 [英雄界面卡顿优化实施（范围决策 + 落地）](issues/13-hero-ui-perf-fix.md)。
- [图标系统统一设计（决策）](issues/03-icon-system-unified-design.md) — 已定 6 项决策：D1 三级回退链（sprite→Lucide→汉字首字，汉字只作终极兜底）；D2 GameIcon 注册表驱动（type 更名 'hero'，hero→HEROES_CONFIG / item→ITEMS_CONFIG / enemy、zone→iconMaps）；D3 iconMaps 保持纯数据层、渲染收敛到 GameIcon；D4 删除 avatar 字段 + 6 处死分支迁移；D5 shard_<hero> 复用英雄 sprite 立绘缩略、其余碎片保持 Lucide；D6 type 更名影响面（4 处调用点）。已毕业出实施 ticket [图标系统统一实施](issues/14-icon-system-implementation.md)。
- [招募界面清理：冗余按钮 / 旋转动画 / tips 统一](issues/04-recruit-cleanup-buttons-animation-tips.md) — 删除冗余「查看招募概率」按钮（规则入口唯一化为顶部 Info）；删除结果标题 animate-spin；infoToastMessage 自定义提示全部迁移到 ToastSystem.showToast（余额不足=warning，其余=info）。SummonTab.test.tsx 7/7、tsc、oxlint 全绿。「切换」按钮仍为 mock（10/100 抽归 06）。
- [招募结果界面设计语言统一 + 图标与背包一致](issues/05-summon-result-design-unification.md) — 结果弹窗容器/标题/卡片/按钮全部对齐 UI_TOKENS 标准（去 rounded-3xl、渐变、shadow-lg）；英雄卡改用 `<GameIcon type="survivor">`（渲染 sprite 立绘）、奥术星体/共鸣碎片/重复英雄碎片改走 `<GameIcon type="item">`，与背包 ItemGridItem 同一渲染通道；移除 Award + bounce。全量 404/404 通过。碎片 sprite 配置归 14。
- [招募「切换」按钮：10 抽 / 100 抽](issues/06-summon-switch-10-100.md) — state/summon.ts 新增 `summonBatchUpdate(count)`（summonTenUpdate 委托之）；GameContext 暴露 `summonBatch(count)`；SummonTab 新增 batchSize state，大按钮「招募 10/100 次」+ 动态费用，切换按钮在 10↔100 间切换（替代原卡池 mock）；结果标题动态 `${n} 连招募获得`。新增 5 测试（含 100 连第 100 抽硬保底验证），全量 409/409。
- [经验道具与升级消耗设计](issues/07-exp-tome-and-levelup-design.md) — D1 单档「经验手册」exp_tome=100 exp（ItemMeta.useEffect 扩展 heroExp 字段，数据驱动）；D2 来源仅战斗/探险掉落，梦境不掉现实物品、不做工坊合成；D3 升级按钮一次 1 本 + 新增批量升级按钮（滑条 + 实时预览，对齐背包/工坊批量范式）；D4 战斗经验为主途径、手册为额外途径（ADR-0003 补充）。已毕业出实施 ticket [经验手册与升级改造实施](issues/15-exp-tome-implementation.md)。
- [升级成长曲线数据化 + 元属性实装 + 详细属性界面](issues/08-level-growth-and-primary-stats.md) — D1 成长曲线 = 职阶基础系数（守护 12/2/2、进攻 6/4/1、协奏 9/3/1）+ 英雄 levelMilestones 微调，heroMaxHp/heroAttack/heroDefense 为唯一来源（消除详情 +10 vs 战斗 +8 的不一致）；D2 初始元属性 9 英雄默认倾向表（总和约 20-23，可调）；D3 calculateEntityStats 传入 config.primaryAttributes 使元属性增益首次生效；D4 DetailedStatsModal 三区齐全（基础/元+作用说明/特殊），不加成长预览。已毕业出实施 ticket [升级成长曲线与元属性实装实施](issues/16-growth-and-primary-implementation.md)。
- [图标系统统一实施](issues/14-icon-system-implementation.md) — GameIcon 注册表驱动（hero/item/enemy/zone）+ 三级回退链（sprite→Lucide→汉字首字）+ SPRITE_GRID 规格表；type 'survivor'→'hero'（4 调用点 + SummonTab）；heroes.ts 删 avatar 字段、6 处死分支迁 GameIcon；shards.ts 9 个 shard_<hero> 补英雄立绘 sprite（resonance_shard/arcane_orb 保持 Lucide）。全量 409/409、build 通过。发现 3 条 pre-existing oxlint 问题（HeroDetailModal hooks 顺序等）留 13/12。
- [天赋树树状重设计（原型）](issues/09-talent-tree-redesign.md) — 原型按 prototype skill 重做（3 变体 ?variant= 切换 + 浮动底栏），用户选定 **B 技能网图 + 细化规格**（直线连线、三叉方向、同父子节点同水平线、选中信息面板、坐标+子节点数据配置、1/2/3 槽位规则、父节点阻塞）。正式实现：talents.ts 树化（pos + children + requires，buildTalentTree 组装）；HeroTalentPanel 布局引擎 + SVG 直线自动连线 + 选中信息面板 + 父节点阻塞（父投入 ≥1 点）。全量 411/411、build 通过。未采用变体归档 .scratch/prototype-archive/。
- [英雄档案详情页（职阶 / 阵营设定）](issues/10-hero-dossier-page.md) — 新增 heroLore.ts（职阶/阵营设定文案 + 阵营配色，用户认可起草版）；新 HeroDossierModal（头部档案卡：头像/名称/职阶阵营标签 + 背景故事 + 职阶/阵营设定区 + 后台驻守特长徽章）；HeroDetailModal 后勤卡片改为档案入口（hover + 箭头）。全量 415/415、build 通过。
- [删除经验条改为数值显示](issues/11-remove-exp-bar-show-numbers.md) — HeroDetailModal 删除经验进度条（transition 宽度重算），改为直接显示数值 `exp / 需求`（样式沿用卡片）；消除切换英雄时的视觉跳动（对应 02 研究 R5）。全量 415/415 无回归。
- [经验手册与升级改造实施](issues/15-exp-tome-implementation.md) — 新物品 `exp_tome`（heroExp:100，数据驱动）；`consumeExpTomesUpdate` + GameContext `levelUpWithTome`；升级按钮消耗 1 本（修复免费直升 bug）、新增批量升级弹窗（滑条+预览，对齐 CraftBatchModal）；3 主线区域普通/BOSS 掉落接入（梦境不放）；ADR-0003 补充。新增 8 测试、适配 idle/registry 3 例，全量 422/422、build 通过。
- [升级成长曲线与元属性实装实施](issues/16-growth-and-primary-implementation.md) — heroGrowth.ts 职阶成长系数（守护12/2/2、进攻6/4/1、协奏9/3/1）+ 里程碑 + 元属性说明；HeroConfig 加 primaryAttributes（9 英雄 D2 表）+ levelMilestones；heroMaxHp/heroAttack 统一来源、新增 heroDefense、退役 combatConfig 成长字段（消除 +10 vs +8 打架）；calculatedStats 传元属性（增益首实装）；DetailedStatsModal 三区。全量 423/423、build 通过。战斗数值暂未接入元属性（平衡决策，范围外）。
- [英雄界面卡顿优化实施（范围决策 + 落地）](issues/13-hero-ui-perf-fix.md) — 范围选方案 A：**applyTick 短路**（无活跃系统 + 体力满 + 未跨天时返回原引用 → React bailout，全树不再每秒重渲染；设施活跃 = 队列非空）+ **HeroDetailModal hooks 结构修复**（useMemo 前置，清掉 3 条 pre-existing lint；EMPTY_EQUIP 常量）。新增 tick.test 4 例，全量 427/427、build 通过。App activeTab 渲染 / context 拆分 / actions useCallback 留作后续。

## Not yet specified

- 经验道具的具体分档 / 数值 / 获取来源（07 内细化，数值平衡可能超出本 effort）。
- 卡顿优化的**范围决策**（局部 memo vs 全局 context 拆分）——已毕业为 13 号 ticket。
- 天赋树节点是否需要图标 / 坐标扩展（09 原型中明确）。
- 详细属性界面的布局与文案细节（08 内明确）。
- 职阶 / 阵营设定文案的具体内容（10 内明确）。

## Out of scope

- **秘宝古卜卡池**（招募界面第二个 tab，当前为 mock）——不在本 effort，属于未来新功能。
- **新增英雄角色 / 新职阶 / 新阵营内容**——本 effort 只重构既有 9 位英雄，不新增。
- **羁绊系统重设计**——独立系统，仅保证现有渲染不受影响。
- **战斗系统与伤害公式重设计**——`state/combat.ts` 只改属性来源，不改战斗规则。
- **装备系统重设计**——详情页属性来源涉及装备加成，但不改装备本身。
