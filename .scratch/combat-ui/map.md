# 战斗 UI 体系重构（combat-ui）— Wayfinder Map

Status: complete

## Destination

锁定「战斗 UI 体系（Combat UI）」的设计决策集，产出可直接交给 `/to-spec`、`/to-tickets` 的实现规格：导航与 Tab 架构（「探索」主 Tab 下统一「荒野」与「战斗」双字子 Tab）、通用区域选择器组件（两级弹窗 + 锁住原因动态诊断 + 三系统复用）、关卡列表与详情弹窗、独立的顶层全屏战斗场景页面（双方卡片/状态/血条/Buff/漂字/事件流 + 退出与单次跳过 + 探索遭遇战只读对接）、挂机战斗简报看板，并在原型（`prototypes/combat-ui/`）中完成交互验证，全程保证全 JSON 数据化兼容与状态迁移干净。**仅覆盖 Combat UI 与交互层**；底层战斗数值/规则引擎与离线数学计算各自另立 effort。

## Notes

- **领域**：AetherGarden 废土魔导温室放置游戏，战斗与探索 UI 重构（`docs/combat/UI.md`、`docs/combat/readme.md`）。
- **交付形态**：决策集 + 交互原型（Prototype） + 可交付规格（`spec.md`） + 实现工单（tickets）。
- **技能**：决策与领域建模使用 `grilling`、`domain-modeling`、`codebase-design`；原型设计与验证使用 `prototype`。
- **既定约束与用户决策**：
  - `docs/combat/UI.md` 与 `docs/combat/readme.md` 为基线。
  - **导航与 Tab 规范**：底部主 Tab 保持「探索」，内部二级子 Tab 统一命名为双字：`荒野` 与 `战斗`。
  - **通用区域选择器**：采用两级弹窗（列表选择器 -> 区域详情弹窗），未解锁时详细罗列锁住原因及实时完成度（`isRegionUnlocked` 诊断），跨荒野探索、战斗、远征三系统统一复用。
  - **关卡流与详情**：区域内关卡线性排列，点击关卡弹出详情弹窗（敌人阵容预览、体力消耗、首通奖励与掉落池、迎战/挂机按钮）。
  - **独立战斗页面**：顶层全屏沉浸模态（对齐 `SummonTab` 架构），仅展示战斗信息，主动战斗提供「退出」按钮（失败结算），探索遭遇战只读无退出按钮。支持 1x/2x 调速与单次跳过（ADR-0008）。
  - **挂机简报看板**：已通关关卡开启挂机后切换为监控看板，展示精简战斗轮播（3~5 条）、体力监控与累计战利品，支持随时停止。
  - **原型验证**：由于界面涉及精细动效与交互体验，通过 HTML/CSS 原型先行验证。
  - **全 JSON 化兼容**：所有组件配置、文案字典、展示模板纯数据化，无函数/闭包残留，完全支持 JSON 序列化与反序列化。
  - **不向后兼容旧存档**：新 UI 直接对接新数据模型，旧数据干净丢弃。
- **关键文件**：
  - 需求与设计：`docs/combat/UI.md`、`docs/combat/readme.md`、`docs/combat/Level.md`、`docs/combat/Offline.md`。
  - 既有组件与状态：`src/components/WildernessTab.tsx`、`src/components/CombatEventLog.tsx`、`src/components/SummonTab.tsx`、`src/state/levelCombat.ts`、`src/state/explorationProgress.ts`、`src/data/regions.ts`、`src/data/enemies.ts`、`src/data/heroes.ts`。
  - 原型输出路径：`prototypes/combat-ui/`。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [01 — 导航与 Tab 层级架构](issues/01-navigation-tab-architecture.md) — 底部主 Tab 保持「探索」，子 Tab 统一命名为双字「荒野（<Map />）」与「战斗（<Swords />）」；探索中自然全屏展示；挂机由 Offline 控制、UI 只读渲染；UI 避免过度配置化。
- [02 — 通用区域选择器组件与解锁诊断](issues/02-region-selector-modal-and-lock-diagnostics.md) — 两级弹窗（列表 -> 详情），去除区域图标与关卡总览；未解锁时结构化诊断并展示锁住原因与完成度；三系统（探索/战斗/远征）统一复用 Props 契约。
- [03 — 关卡浏览与关卡详情交互](issues/03-level-browser-and-level-detail-modal.md) — 关卡小卡片仅显序号名称，状态统一为已通关/可挑战/未解锁；详情弹窗固定【确认/取消】双按钮；挂机模式只列已通关关卡，复用弹窗且确认语义为【确认挂机】。
- [04 — 独立全屏战斗场景页面架构与复用](issues/04-dedicated-battle-view-architecture.md) — App 顶层全屏模态架构，纯前端展现容器消费既有数据快照；三段式战场布局骨架；具体血条步进/漂字动效前置原型验证。
- [05 — 战斗页面控制与退出/撤离/跳过语义](issues/05-battle-controls-exit-and-encounter-seam.md) — 保持预计算+假同步播放模型；主动战斗提供退出判负；探索遭遇战只读隐藏退出；1x/2x倍速与单次跳过零延迟结算。
- [06 — 挂机战斗简略信息看板交互与流转](issues/06-idle-combat-widget-and-state-flow.md) — 挂机中沉浸展示监控看板；三行高度可滚动窗口平滑播放完整战斗事件流；开战时扣除体力、停止不退还未完体力；停止时集中汇总战利品。
- [07 — 战斗 UI 高保真交互原型](issues/07-combat-ui-interactive-prototype.md) — 产出 `docs/prototypes/combat-ui/` 独立原型，经多轮迭代落地 6 竖槽战场、标签后缀（[首领]/[召唤物]）、全关卡挂机诊断、无标题纯净播报与弹窗规范。
- [08 — 全 JSON 化兼容与状态持久化适配](issues/08-json-compatibility-and-state-cleanliness.md) — 纯数据化单一源与 Schema 约束；持久化状态仅存纯数据字段，战斗瞬态内存解耦；彻底清理旧战斗字段；统一弹窗/操作按钮高度（h-9.5）与固定【确认/取消】规范。

## Not yet specified

<!-- fog：转向本 destination 但尚无法精确提问的决策 -->

- 战斗界面中的微动效（受击抖动、暴击闪光、施法前摇条）具体粒子/CSS 细节——先在原型中确立基线，待组件落地时微调。
- 战斗结算弹窗中升级/掉落物点击查看物品详情（ItemDetailModal）的嵌套层级控制——视全屏 Modal 层级统一管理。
- 远征专属区域在区域选择器中的特殊筛选/分类展示形式——等远征模块深度展开时再议。

## Out of scope

- **战斗数值与时机引擎实现** —— 属于 Turn / Effect / Buff / Ability / Entity 模块，UI 层只读事件流与状态。
- **离线战斗数学推进** —— 属于 Offline 模块（`Offline.md`）。
- **梦境探索 UI 改造** —— 梦境探索保持现有 SwipeCard 独立机制。
- **敌人与英雄的平衡性数值重配** —— UI 仅做配置读取与渲染。
