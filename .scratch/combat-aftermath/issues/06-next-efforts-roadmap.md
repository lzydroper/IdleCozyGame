# 下批 effort 划分与路线排序

Type: grilling
Status: resolved
Blocked by: 02, 03, 04, 05

## Question

综合 01 号分诊结果与四簇决策（02–05），产出终点交付物「下一批 combat-* effort 路线图」（effort 级深度）：

- 每个 effort：名称、一句话目标、包含的将就项编号清单、依赖关系、在「正确性 > 结构收敛 > 内容牵引 > 体验打磨」尺子下的建议顺序；
- 双轨消除作为核心主线组织结构类 effort；
- UI / Offline 体验项：归组为独立体验 effort 还是标低优挂记录；
- 内容牵引项（配置 JSON 化、敌人能力内容、BUFF_CONFIGS 迁 src/data 与效果数据模板化等）：落位为记录还是立 effort（chart 阶段已定内容层只记录不排期，此处落实形式）;
- 明确本批不做、移出范围的项（承接 01 号票的超范围建议，回写 map 的 Out of scope）。

路线图同时给出每个 effort 建议的 chart 起点（引用原 effort 存档与本图相关决策票）。

## Answer

终点交付物已落盘：**[roadmap.md](../roadmap.md)**。四项终裁（HITL）：

- **R1 切分 = 四批方案认可**：①combat-hygiene 口径收口 → ②combat-assembly 装配与事件 → ③combat-summon-closure 召唤闭环 → ④combat-experience 体验；内容就绪项不立项。
- **R2 排序 = 1→2→3 主线串行，④ 在 ① 后任意时点可并行**。
- **R3 Offline 守卫 = 并入 ① hygiene 批**（O#3/O#4/O#8 与口径收口同性质，一次验收）。
- **R4 After 清单 = 完全不回写**：七份 After 清单作为历史留档，本图 map + triage-draft 为唯一权威索引。

每个 effort 均含：目标、完整包含项（编号+来源+关键代码落点）、依赖、chart 起点、验收口径；不立项表含九组内容项的各自触发条件。

**Destination 达成**：88 条将就项全部分诊（8 关闭/6 合并/~30 决策/~39 归组/1 拍板关闭），20 项设计决策拍板并写回 9 处 spec/docs，下批四批 effort 路线图交付。地图完成。
