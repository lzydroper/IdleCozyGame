# 配置数据 JSON 化迁移（config-json-migration）— Wayfinder Map

## Destination

三层边界法则下的全量迁移蓝图定稿：`src/data/` 仅存 .json（按玩法子系统分域、实体细粒度拆分、NN_ 序号仅 regions），`src/configs/` 承载 types / constants / loaders / mappings / seed 五类职责；31 个现存 data/*.ts（实盘 37 文件）全部归位（含函数外置、icon key 化、破坏性重命名对照表）；加载/断言/测试兜底策略定稿——产出可直接交实施票开工的蓝图。

## Notes

- **三分类法则（J2 定稿）**：data/**/*.json = 纯静态内容数据；configs/** = 接口声明 + 常量声明 + JSON 装配/校验 + key→组件映射 + 初始种子；src/state/ 运行时逻辑不动（regionSelectors 移入）。
- **加载策略（J3）**：tsconfig 开 `resolveJsonModule` + Vite 静态 import + configs 层断言定型 + 每域完整性测试 seam；不引入 zod/fetch。
- **两条铁律（J4 及其演化）**：React 组件引用 → json 存 iconKey，configs/mappings 收口；abilities 工厂 → 04 号票裁决「直存展开·工厂退役」（configs/factories 目录取消）。
- **目录四原则（chart 定稿，用户修正）**：
  1. lore 为全英雄共享 → configs/constants；workshopCategories 同为常量配置 → configs/constants；
  2. 实体细粒度拆分推广：`entities/heroes/<heroId>/{heroInfo,duty,awaken,talent,growth}.json`，其余域同理按语义拆文件；
  3. data 域按玩法子系统重组：工坊/后勤/种植分离，不设笼统 gameplay 夹；
  4. 命名不受历史遗留约束，允许破坏性重构为贴切命名。
- **路径透明原则（02 号票修订）**：开放集合域命名仅为人读约定，loader 零路径语义解析，身份一律取自 json 内容字段。
- **体系愿景（07 号票闭合）**：Effect 原子（代码：EFFECT_EXECUTORS + 公式词表）← Ability/Buff 配置（json）组合。
- **迁移序（J7）**：管线验证批 → 纯内容表批 → 开放集合与复杂域批 → 收尾清零批。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [全量归位映射表定稿](tickets/01-mapping-inventory.md) — 37 文件（items/ 子夹补计）逐一落位：20 内容表入 data 六域 json（英雄 per-hero 拆分示范）、13 常量/类型/种子入 configs、3 处运行时逻辑迁 state；五条破坏性重命名对照（props→consumables 等）；awakening/talents/heroGrowth 三处「常量+per-hero+公式」三位一体全部三分。交付 [mapping.md](mapping.md)。
- [加载器与类型策略细化](tickets/02-loader-strategy.md) — **混合制分载**（开放集合域 glob / 固定集合域显式 import）；**静态断言 + DEV-only 守卫**（devGuard.ts，不引入 zod）；完整性测试 seam 五项全集；tsconfig 追加 resolveJsonModule；存档兼容坐实（types/game.ts 仅类型引用 FacilityType，零运行时耦合）；types→configs 单向依赖合法化。**修订：路径透明原则**——开放域命名仅为人读约定，loader 零路径语义解析，身份一律取自 json 内容字段。
- [icon key 化规范](tickets/03-icon-keys.md) — **loader 装配注入**（json 存 iconKey、装配写回 icon 组件字段，渲染点零改动）；key = lucide 名 kebab-case 显式注册（iconMap.ts：ICON_MAP/iconFor/IconKey）；兜底 = DEV warn + HelpCircle 回退；GameIcon 双轨并行不合并；SLOT_FALLBACK_ICONS 并入 iconMap 同文件。
- [abilities 参数形状设计](tickets/04-ability-shapes.md) — **关键发现**：AbilityConfig 已纯数据化，工厂只是 DRY 糖。拍板：json **直存展开形状·工厂退役**（`configs/factories/` 目录取消）；每能力一文件 `combat/abilities/<id>.json` 含 basic_attack；getAbilityConfig/BASIC_ATTACK 出口迁 configs/loaders/combat.loader.ts。**修订（B1）**：description 改模板占位符插值（{attackPct} 等语义 token），数值唯一真相在 effects。
- [Buff 数据驱动规范](tickets/07-buff-data-driven.md) — **词表定稿**：公式原子 flat/perStack(base,values 覆盖)/livingEnemies(per) + 目标引用 holder|eventTarget；模板只存 kind/label/targetRef/params，id/sourceId/origin 由物化器填充；四样例对照落定；createEffects 退役一次到位，被动链统一；stun/applyBuff 衔接不变。**体系愿景闭合：Effect 原子（代码）← Ability/Buff 配置（json）组合。**
- [实体多文件拆分规范](tickets/05-entity-split.md) — 英雄五文件分配表定稿（heroInfo/duty/awaken/talent/growth 逐字段落位）；**能力归属澄清**：定义与引用分离——普攻/觉醒技能定义住 combat 域，英雄 awaken.json 仅持 abilityId 引用；HERO_GROWTH_BY_CLASS 与 TALENT_TRUNKS 职阶共享表留 progression；敌人单文件；loader 归并三语义。
- [迁移蓝图汇编](tickets/06-blueprint.md) — 终点交付物 [blueprint.md](blueprint.md)：前置全局项（resolveJsonModule/FacilityType 切换）+ 四批推进工单级蓝图——①管线验证（configs 骨架+constants 12 文件+crops 试点）→ ②固定集合批（items/workshop/shelter/events/progression）→ ③开放集合与复杂域（abilities json/buff 数据驱动/英雄五文件/enemies glob/regions 重组织）→ ④收尾清零（seed/测试/终检）。每批含目标、工单清单、依赖、验收口径与 chart 起点。

## Not yet specified

（空——chart 期四项雾区均已随票清算：存档兼容与 glob 类型方案由 02 号票坐实；测试改造面由 mapping E/F 表覆盖；NN_ 稳定性由路径透明原则消解。）

## Out of scope

- **GameState / 存档 schema 重构**：本 effort 只迁配置层数据流，玩家可见数据模型不动。
- **运行时逻辑重构**：state/ 下各模块内部逻辑不在范围内（regionSelectors 仅做位置迁移）。

## 🏁 地图完成

配置数据 JSON 化迁移全部 7 张 tickets 已解决：01 归位映射表（37 文件）→ 02 加载策略 → 03 icon 规范 → 04 abilities 形状（含 B1 修订）→ 05 实体拆分 → 07 buff 数据驱动 → 06 蓝图汇编。

**Destination 达成**：三层边界法则 + 两棵目录树 + 加载/断言/测试策略 + 37 文件归位映射 + 破坏性重命名对照 + 「Effect 原子 ← Ability/Buff 配置组合」体系闭合 + 四批工单级蓝图（[blueprint.md](blueprint.md)）——可直接交实施开工，玩家可见数据模型零变化。
