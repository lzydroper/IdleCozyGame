# 战斗革新「将就」清偿路线（combat-aftermath）— Wayfinder Map

## Destination

七份 `docs/combat/After/*.md` 将就清单全部完成分诊——已完成项核实关闭、超范围项裁定出清、其余逐条归组——并拍板四簇 fog 级设计决策（控制/中断语义、fireCount 去留、数值口径、双轨消除策略），最终产出一份「下一批 combat-* effort」路线图：每个 effort 有目标、包含的将就项、依赖关系与建议顺序（细到 effort 级）。本图只规划不施工。

## Notes

- **领域**：战斗引擎五模块（Turn / Effect / Buff / Ability / Entity）+ Offline / UI 的语义债与技术债清偿。
- **技能**：每张 grilling 票开工前先调 Skill 工具加载 `grilling` 与 `domain-modeling`。
- **优先级尺子（既定，chart 阶段拍板）**：正确性 > 结构收敛 > 内容牵引 > 体验打磨。
- **双轨消除是核心主线**（chart 阶段拍板）：旧 `buffSystem`/`ActiveBuff` 与新 BattleContext Buff 并存、`CombatantState` 与 `BattleEntity` 双轨、`attackAfter`/`abilityUsed` 事件双轨——十余条将就项的共同根源，路线图围绕它组织结构工作。
- **内容层只记录不排期**（chart 阶段拍板）：暂无明确新内容计划；JSON 化、敌人能力内容等记入路线图但不给排序权重。
- **分诊方式**（chart 阶段拍板）：agent 先出全量草表，用户只对待决策/超范围中的存疑项拍板。
- **关键材料**：
  - 账本本体：`docs/combat/After/{Buff,Effect,Ability,Turn,Entity,Offline,UI}.md`
  - 原 effort 存档（查交叉引用用）：`.scratch/combat-{turn,effect,buff,ability,entity,level,ui,offline}/`、`.scratch/stat-bonus-unification/map.md`
  - 术语：`CONTEXT.md` 战斗节（回合 Turn ≠ 轮次 Round；参战实体 Entity 等）
- **术语口径**：「将就」= 能跑通、但为先行落地而接受的妥协（不是 bug 清单）；各清单中「✅ 已由 combat-entity 完成」标记视为待核实的关闭声明。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [全量分诊盘点：七份 After 清单逐条草表](issues/01-triage-inventory.md) — 88 条全部落类（8 完成 / 6 重复 / ~30 入四簇决策票 / ~39 归五实施桶 / 拍板关闭 1）；定稿表 [triage-draft.md](triage-draft.md)。关键事实修正：旧 buffSystem 已是零引用孤儿（Buff 双轨缩水为删代码）、fireCount 注入链路部分存在且两种语义并存；用户拍板：远征选择器并入体验桶、allowOverflow 保留、伤害详情挂记录、动态 Modifier 生效链路归 05。02–05 号票工作集已按分诊增量更新，全部解锁可认领。
- [控制与中断语义拍板](issues/02-control-interrupt-semantics.md) — 六项定稿：眩晕改「turnStart 前快照判定·先判定后递减」修 off-by-one；新增 `zeroed`/`sourceConflict` 中断码；`canActWithBuffs` 移入 Buff 模块并控制类集合化；temporary「每回合一次」维持约定不加守卫（用户裁定）；免疫/嘲讽 flag 锁定「由 Buff 包装」方案、施工挂起等内容触发；canTrigger 承认实例级四参实现形状。已写回 combat-buff spec §3/§4/§7、combat-effect spec §4、docs/combat/Buff.md 眩晕条目。
- [fireCount 去留与聚合语义](issues/03-firecount-fate.md) — 三项定稿：机制保留、设计定稿+施工挂起；多段基准 = **单事件·运行时放大**（每逻辑效果一条事件 `data.fireCount=N`，执行层内 N 独立掷点聚合，编译期复制废弃）；连发=一次攻击（折焰类耗 1 层、on-hit 结算一次）。核验发现潜伏 N² 叠乘实证。已写回 docs/combat/Ability.md 新增连发语义节、combat-buff spec §5。
- [数值口径统一规则](issues/04-numeric-canonical-rules.md) — 六项定稿：**「取整发生在数值诞生层，下游只钳制」**全局规则（删三层重复 round）；抽 toBattleUnitStats/cloneStatParams 单一展平与克隆 helper；先机出口取整整数化；数组队列正式化（spec 措辞改齐+O(k log k) 边界）；「取出队首即锁定本轮」写回为正式语义（衔接 02 D1 快照制）；体力存档出口规范化两位小数。已写回 docs/combat/Turn.md（含新增数值口径节）、combat-turn spec §5。
- [双轨消除策略](issues/05-double-track-retirement.md) — 五项定稿+一项前提修正：核验证明动态面板主链路已通（performAction 每动作新鲜 resolveStats），战意失效系陈旧记载；残余三缺口按「resolveStats 唯一权威」不变式补齐。attackAfter 定位纯内部触发通道（遗留字段仅测试消费）；引擎拆分 createTurnRuntime+run 删除 setup seam；resolveEntity 单一入口随召唤闭环；basic_attack 缺省注入+可显式覆盖。已写回 combat-turn spec、docs/combat/{Turn,Ability,Entity}.md。
- [下批 effort 划分与路线排序](issues/06-next-efforts-roadmap.md) — 终点交付物 [roadmap.md](roadmap.md)：四批 effort（①combat-hygiene 口径收口含 Offline 守卫 → ②combat-assembly 装配与事件 → ③combat-summon-closure 召唤闭环，④combat-experience 可并行、开工前需自 chart）＋九组内容项挂记录（含触发条件）。终裁：四批方案 / 主线串行④并行 / Offline 并入① / After 清单不回写（历史留档，本图与 triage-draft 为唯一权威索引）。

## 🏁 地图完成

战斗革新「将就」清偿路线全部 6 张 tickets 已解决：01 分诊（88 条落类）→ 02/03/04/05 四簇决策（20 项设计拍板，写回 9 处 spec/docs）→ 06 路线图交付。way to destination 已清晰。

**Destination 达成**：七份 `docs/combat/After/*.md` 全部分诊完毕；下批 combat-* effort 路线图（effort 级：目标/包含项/依赖/chart 起点/验收口径）已交付至 [roadmap.md](roadmap.md)，可直接作为各新 effort 的 chart 输入。本图只规划未施工——实施由路线图各批次承接。

## Not yet specified

- **配置层完全 JSON 化的范围与时机**（Entity #1/#2/#5）：依赖双轨消除后的数据层形态与未来内容计划；路线图阶段只需裁定「立 effort 还是挂记录」。
- **分诊新暴露的决策点**：85 条逐条核对交叉引用时可能发现新的 fog（spec 与实现口径不一致的新案例、✅ 标记核实不过关的条目），届时毕业为新票。
- **各 effort 的 spec 级细化与实施票**：路线图交付后由各 effort 自己 chart，不在本图内。

## Out of scope

- **具体施工**：本图产出决策与路线图，不改代码；实施由下批 effort 承接（wayfinder 默认，chart 阶段确认）。
- **新内容制作本身**：新 Buff / 敌人技能 / 玩法内容的设计与制作（当前亦无计划）。
