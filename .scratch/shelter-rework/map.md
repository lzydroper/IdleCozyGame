# 后勤模块改造规范（shelter-rework）

Status: active

## Destination

产出《后勤模块改造规范》（`spec.md`）：定义 `ShelterTab`（后勤页面）的完整新形态--全页分 tab（基建 / 温室 / 产线 / 远征）、补全设施驻守机制（`dutyMeta` 接入产线 tick）、重新设计远征（改用 `heroClass`/`faction`、修复空产出 bug）、移除顶部资源指示器与后勤工作日志、清理全页硬编码。**交付形态为 spec，实施在定稿后另行安排**（与 workshop-rework 一致）。

## Notes

- **领域约定**（随解析逐步沉淀）：
  - 后勤页面 = `ShelterTab`，App 中的第 3 个 tab（`tab: 'shelter', label: '后勤'`）。
  - 后勤指派 = 英雄被指派到浇水岗 / 探索岗 / 设施驻守的统称。**用户决策：统一为 `hero.logisticsFacilityId` 单一字段**，废除 `shelter.assignedWatererId` / `shelter.assignedExplorerId` 双轨。
  - 设施驻守 = 英雄驻守冶炼炉 / 组装台等产线设施，提供 `dutyMeta` 加成（ADR-0007 设计、当前半成品，本次补全）。
  - 远征 = 挂机拾荒探索，**用户决策：改用 `HEROES_CONFIG` 的 `heroClass` / `faction` 做解锁与加成**，移除对 `SURVIVORS_CONFIG.role` 的功能依赖。
  - 分 tab 设计语言对齐工坊（`WorkshopCategoryBar`）与背包（`LogTab`）。
- **必用技能**：`grilling`（HITL 决策对话）、`domain-modeling`（术语 / 模型）、`to-spec`（最终汇编 spec 时）。
- **范围红线**：本次只产出规范，不落地代码改造；实施是 spec 定稿后的新 effort。
- **调查基线**（已由 explore subagent 完成）：
  - 两套并行指派系统：`shelter.assigned*`（已生效）vs `hero.logisticsFacilityId`（半成品，无 setter、tick 不消费）。
  - 9 个英雄全部配了 `dutyMeta`（`heroes.ts`），但 `FacilityCard` / `processFacility` 完全不引用它。
  - 远征空产出 bug：4 个救援地点 `scavengeInterval: 0` + `lootTable: []`，代码不禁止派遣。
  - 硬编码：`s === 'mei'` 浇水推荐、`s === 'zero' || role === 'scout'` 探索推荐、`THEME_MAP`、`replantCropId` 默认值等。

## Decisions so far

<!-- 每解析一个 ticket，在此追加一行：名称（链接）+ 一句话结论 -->

- [现有 FacilityCard / 产线架构调研](issues/06-research-facility-architecture.md) - 三层组件树（SmelterCard/AssemblerCard -> FacilityTypeSection -> FacilityUnitCard）各层自取 state；`AutomationFacility` 无驻守字段，驻守信息存 hero 侧 `logisticsFacilityId`（格式 `'type_index'`）；推荐注入方案：新增 `resolveDutyBonus` + `getActualDuration` 扩展第三参 + `processFacility` 扩展第四参；驻守 UI 插入标题栏区域（:141-192）；升级/扩建不破坏索引稳定性；建议新增 `assignHeroToFacility`/`unassignHeroFromFacility` setter。
- [后勤指派统一为 logisticsFacilityId 的数据模型与迁移](issues/01-grilling-assign-model-unification.md) - `logisticsFacilityId` 改为结构化对象 `DutyAssignment { type: 'waterer'|'explorer'|'facility', targetId } | null`；`shelter.expedition` 保留（远征运行状态是 shelter 级）；废除 `assignHeroJob`/`startExpedition`/`stopExpedition` 三入口，统一为 `assignHeroToDuty(heroId, duty|null)`；`shelter.assignedWatererId`/`assignedExplorerId` 保留为缓存索引（真相源是 hero 字段，O(1) 查询）；强制单岗排他；沿用 alpha 不迁移旧存档。
- [远征机制重新设计](issues/02-grilling-expedition-redesign.md) - 4 个救援地点从 EXPEDITION_LOCATIONS 移除（修复空产出 bug）；职业判定 `requiredRole` 迁移为 `requiredHeroClass` + `requiredFaction` 双可选字段（subway->魂印、bio_lab/poison_factory->机械、ruined_armory->守护者）；远征无英雄加成（产出仅由地点决定）；口粮改地点配置驱动（rationCost 出发消耗 + rationConsumptionRate 持续消耗，耗尽自动召回，校验内化到 state 层）；UI 改英雄卡片式 + 地点卡片式；废弃 `getHeroRole`/SURVIVORS_CONFIG 功能依赖。
- [分 tab 结构与设计语言](issues/03-grilling-tab-structure.md) - 4 tab（基建/温室/产线/远征），梦魇警报常驻顶部；顶部资源指示器全移除（魔能储备不迁移）；新建 ShelterTabBar 组件+状态计数（可收割数/队列数/进行中）；统一 section 样式为 `bg-zinc-900/60 border-zinc-800 rounded-3xl`；后勤日志区块移除但 `log.type='logistics'` 分类保留；组件拆分为 `src/components/shelter/` 子目录（ShelterTab/ShelterTabBar/BaseUpgradeSection/GreenhouseSection/ExpeditionSection/constants.ts）。
- [dutyMeta 接入产线 tick 的方式](issues/04-grilling-duty-meta-integration.md) - 三字段乘算+下取整+最低1公式（速度 `duration/((1+level*0.1)*(1+speedMult))`、产量 `floor(qty*(1+yieldMult))`、原料 `max(1,floor(qty*(1-costRed)))`）；注入方案 C+A（新增 `resolveDutyBonus` + `getActualDuration` 扩展第三参 + `processFacility` 扩展第四参）；每 unit 独立驻守（targetId `'type_index'`）；驻守 UI 插入 FacilityUnitCard 标题栏；手动解除+指派其他岗位自动解除，上阵不自动解除；9 英雄数值评估合理无需调整。
- [硬编码清理与数据驱动化](issues/05-grilling-hardcode-cleanup.md) - 8 类硬编码全部决议：英雄推荐标签移除（不新增 preferredDuty）、getHeroRole 废弃/getHeroStatus 重写、THEME_MAP 迁入 SHELTER_UPGRADES 配置、replantCropId/selectedLocationId 数据推导、expInterval 回退值移除、文案归 shelter/constants.ts、any 类型补 FlyingReward 接口、getUpgradeLevel 改 stateKey 数据驱动。
- [汇编后勤模块改造规范 spec](issues/07-task-compile-spec.md) - 《后勤模块改造规范》已汇编至 spec.md（Status: ready-for-agent），含 28 条用户故事、7 节实现决策、3 个测试 seam 与适配清单、Out of Scope 与 Further Notes。**地图完成，待用户审阅 spec 后进入实施 effort。**

## Not yet specified

<!-- 见 "Fog of war"：在范围内但尚不够 sharp 到能 ticket 化的疑问；随 frontier 推进逐步 graduate -->

（所有 fog 已随 T1-T5 决议 graduate 为清晰表述或并入 spec.md。剩余待定项为实施时细节：远征地点口粮数值、掉落表 id 核对，归实施 effort 处理。）

## Out of scope

<!-- 已被有意排除在本 effort 之外的工作；关闭的误标 ticket 在此留一行 -->

（暂无）
