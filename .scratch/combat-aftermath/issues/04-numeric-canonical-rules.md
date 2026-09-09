# 数值口径统一规则

Type: grilling
Status: resolved
Blocked by: 01

## Question

同一数值多层取整、多处展平的收口决策，产出一条贯穿「配置公式输出 → 面板 → 效果参数」的口径规则：

- **取整/钳制单一职责**（Turn #5、Ability #11、Entity #6）：Turn 只做状态写入与 hp 钳制、数值取整归 Effect/Ability？还是 Turn 出口统一取整？二选一后清理 `dealDamage`/`applyHeal`/`asNumber` 的重复 round/clamp。
- **toBattleUnitStats 单一展平函数**（Entity #6、Effect #7）：`entityStats` 与 `resolveStats` 共用一个 `CalculatedEntityStats → BattleUnitStats` 展平函数，顺带修 maxHp clamp 口径差异（`Math.max(1, ...)` 只在一侧存在）；配套抽 `cloneStatParams` 共享克隆 helper（Entity #10）。
- **先机整数化**（Turn #2）：`calculateInitiative` 出口定取整规则（建议 Math.round），debug 队列与测试同步整数口径。
- **队列实现形态写回**（Turn #1）：接受「有序数组 + 分隔标记」并把 spec 措辞改齐并明确复杂度边界，还是换带分隔语义的真优先队列？（3v3 规模下预期前者）
- **文档对齐**：「取出队首即锁定本轮行动资格」（Turn #3）、setup 契约的去向（Turn #11 / Entity #12，与 05 号票交界）写回 Turn.md/spec。
- **体力浮点持久化**（Offline #7）：是否纳入同一条「存储整洁度」规则一并定（保留两位小数或显式分离小数部分）。

## Answer

六项全部拍板（HITL grilling，全票推荐案通过）：

- **N1 取整/钳制单一职责 = 公式层取整·下游只钳制**：规则表述为「取整发生在数值诞生的那一层（配置公式/编译/伤害公式），下游只钳制不取整」。`dealDamage`/`applyHeal` 删内部 round 只留钳制；`abilityRuntime.ts:111` 事件数据重复 round 删除；`abilityCompiler.asNumber` 保留（配置公式→数值的第一道）。核验实证：伤害链现状三层 round（effectSystem:97 → abilityRuntime:111 → turnEngine:359/381）。
- **N2 面板展平 = 单一展平函数**：抽 `toBattleUnitStats(calculated)` 共用（entityStats 与 resolveStats）；maxHp ≥ 1 钳制归 statSystem 计算层（其 :242 已有 `Math.max(1,…)`，展平层重复钳制删除）；配套抽 `cloneStatParams`。
- **N3 先机整数化 = 出口 Math.round**：debug 队列与测试同步整数口径，与「只以固定 int 加减 fixval」的既有文档口径拉齐。
- **N4 队列形态 = 数组队列正式化**：接受「有序数组 + 分隔标记」，spec 措辞改齐并注明 O(k log k) 重排边界；不换堆式优先队列。
- **N5 取队首锁定 = 写回为正式语义**：分隔标记 turnStart 派发前前移是防重入设计；与 02 号票 D1 快照制判定同点衔接（取队首 → 快照判定 → turnStart 派发 → 行动/跳过）。
- **N6 体力浮点 = saveState 出口规范化两位小数**：存档 schema 不变，读侧 getStamina 已 floor。

**写回已完成**：
1. `docs/combat/Turn.md` — 先机节：队列措辞改齐、公式出口取整注记；流程第 4 条补「取出即锁定」；文末新增「数值口径（combat-aftermath 04 定稿）」节（N1/N2/N3 全局规则）。
2. `.scratch/combat-turn/spec.md` — §5 队列正式化 + 「取出队首即锁定本轮行动资格」写回。

**产生的实施项**（归桶 A 引擎收口）：删三层重复 round、抽 toBattleUnitStats/cloneStatParams、先机出口 round、体力存档规范化——全部低风险机械改动，由路线图 06 号票排位。
