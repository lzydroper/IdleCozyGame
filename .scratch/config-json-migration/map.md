# 配置数据 JSON 化迁移（config-json-migration）— Wayfinder Map

## Destination

三层边界法则下的全量迁移蓝图定稿：`src/data/` 仅存 .json（按玩法子系统分域、实体细粒度拆分、NN_ 序号仅 regions），`src/configs/` 承载 types / constants / loaders / factories / mappings / seed 七类职责；31 个现存 data/*.ts 全部归位（含函数外置、icon key 化、破坏性重命名对照表）；加载/断言/测试兜底策略定稿——产出可直接交实施票开工的蓝图。

## Notes

- **三分类法则（J2 定稿）**：data/**/*.json = 纯静态内容数据；configs/** = 接口声明 + 常量声明 + JSON 装配/校验 + key→组件映射 + 工厂函数 + 初始种子；src/state/ 运行时逻辑不动（regionSelectors 移入）。
- **加载策略（J3）**：tsconfig 开 `resolveJsonModule` + Vite 静态 import + configs 层断言定型 + 每域完整性测试 seam；不引入 zod/fetch。
- **两条铁律（J4）**：React 组件引用（LucideIcon ×8 处）→ json 存 iconKey，configs/mappings 收口；工厂函数（abilities strike/aoe/heal）→ 参数形状存 json，工厂移 configs/factories。
- **目录四原则（chart 定稿，用户修正）**：
  1. lore 为全英雄共享 → configs/constants（不入英雄文件）；workshopCategories 同为常量配置 → configs/constants；
  2. 实体细粒度拆分推广：`entities/heroes/<heroId>/{heroInfo,duty,awaken,talent,growth}.json`（growth=levelMilestones），其余域同理按语义拆文件；
  3. data 域按玩法子系统重组：工坊（recipes/autoRecipes）与后勤（facilities/shelterUpgrades）/种植（crops）分离，不设笼统 gameplay 夹；
  4. 命名不受历史遗留约束，允许破坏性重构为贴切命名（对照表在映射票定稿）。
- **迁移序（J7）**：管线验证批（常量域 + 首个 json 试点）→ 纯内容表批 → 复杂域（abilities/icons/regions 重组织/events）→ 测试与 state 归位收尾。
- **技能**：grilling + domain-modeling 已加载；实施期参考 combat-hygiene 的测试兜底模式。
- **关键事实**：31 个 data/*.ts；tsconfig 未开 resolveJsonModule（硬前提）；污染面 = LucideIcon×8、abilities 工厂×3、initialState.createInitialHero、talents 树构建、regionSelectors 选择器；items/ 已是 ts 子文件夹。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [全量归位映射表定稿](tickets/01-mapping-inventory.md) — 37 文件（items/ 子夹补计）逐一落位：20 内容表入 data 六域 json（英雄 per-hero 拆分示范）、13 常量/类型/种子入 configs、3 处运行时逻辑迁 state；五条破坏性重命名对照（props→consumables 等）；awakening/talents/heroGrowth 三处「常量+per-hero+公式」三位一体全部三分。交付 [mapping.md](mapping.md)。
- [加载器与类型策略细化](tickets/02-loader-strategy.md) — **混合制分载**（开放集合域 glob / 固定集合域显式 import）；**静态断言 + DEV-only 守卫**（devGuard.ts，不引入 zod）；完整性测试 seam 五项全集；tsconfig 追加 resolveJsonModule；存档兼容坐实（types/game.ts 仅类型引用 FacilityType，零运行时耦合）；types→configs 单向依赖合法化。**修订：路径透明原则**——开放域命名仅为人读约定，loader 零路径语义解析，身份一律取自 json 内容字段（L3④ 作废替换为「身份内容化 + 跨文件重名抛错」）。
- [icon key 化规范](tickets/03-icon-keys.md) — **loader 装配注入**（json 存 iconKey、装配写回 icon 组件字段，渲染点零改动）；key = lucide 名 kebab-case 显式注册（iconMap.ts：ICON_MAP/iconFor/IconKey）；兜底 = DEV warn + HelpCircle 回退；GameIcon 双轨并行不合并；SLOT_FALLBACK_ICONS 并入 iconMap 同文件。
- [abilities 参数形状设计](tickets/04-ability-shapes.md) — **关键发现**：AbilityConfig 已纯数据化，工厂只是 DRY 糖。拍板：json **直存展开形状·工厂退役**（`configs/factories/` 目录取消，J4②以「无需工厂」满足）；每能力一文件 `combat/abilities/<id>.json` 含 basic_attack；getAbilityConfig/BASIC_ATTACK 出口迁 configs/loaders/combat.loader.ts；fireCount 随 EffectTemplate 直载。**修订（B1）**：description 改模板占位符插值（{attackPct} 等语义 token，loader 从同源 effects 插值），数值唯一真相在 effects。
- [Buff 数据驱动规范](tickets/07-buff-data-driven.md)（新增，用户 B2 裁决入图）— createEffects 函数退役、公式词表扩三原子（perStack/livingEnemies/targetRef）、data/combat/buffs/<id>.json——清偿 B§1.3 最后一笔将就，闭合「Effect 原子（代码）← Ability/Buff 配置（json）组合」的体系愿景。
- [实体多文件拆分规范](tickets/05-entity-split.md) — 英雄五文件分配表定稿（heroInfo/duty/awaken/talent/growth 逐字段落位）；**能力归属澄清**：定义与引用分离——普攻/觉醒技能定义住 combat 域，英雄 awaken.json 仅持 abilityId 引用，无第六文件；HERO_GROWTH_BY_CLASS 与 TALENT_TRUNKS 为职阶共享表留 progression；敌人单文件；loader 归并三语义（夹分组定归属 / 缺省文件=缺省段 / 身份取 json 内容 id）。

## Not yet specified

- **存档兼容性确认**：json 化理论上不动 GameState schema，需在 loader 设计票中显式验证「无存档迁移」结论。
- **Vite import.meta.glob 的 TS 类型声明方案**（eager 泛型收窄），依赖加载器策略票产出。
- **测试改造面全量盘点**：引用 data/*.ts 的测试文件随批次各自迁移，总量待映射表产出后可见。
- **regions NN_ 序号稳定性**：文件夹改名是否影响存档/进度引用（regionId 应存于 regionInfo.json 而非文件夹名——待映射票确认字段级设计）。

## Out of scope

- **GameState / 存档 schema 重构**：本 effort 只迁配置层数据流，玩家可见数据模型不动。
- **运行时逻辑重构**：state/ 下各模块内部逻辑不在范围内（regionSelectors 仅做位置迁移）。
