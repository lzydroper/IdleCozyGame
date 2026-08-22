# fireCount 去留与聚合语义

Type: grilling
Status: resolved
Blocked by: 01

## Question

**分诊核验修正前提**：注入链路已部分存在——`abilityCompiler` 将 fireCount 视为一等模板字段并在编译期复制效果（生成唯一 id）、`attackAfter` data 已携带 `compiled.fireCount`、`buffRuntime` 会读 `timingCtx.data.fireCount` 并循环结算 N 次。真实缺口比清单记载的小：

1. **去留与补全**：保留并补全链路（abilityUsed / 非攻击触发场景未覆盖），还是整体移除该机制？放大器数值目前没有任何内容来源（无配置产生 fireCount>1 的能力）。
2. **语义定一**：编译期复制效果（abilityCompiler 现状）vs 运行时循环 resolveEffect（buffRuntime 现状）vs 聚合为单次事件——三种语义并存未定一，需拍板唯一口径并写回 spec。
3. **交互口径**：连发与 attackAfter 每目标一条 vs abilityUsed 单条的展示迁移是否互相牵制（与 05 号票事件双轨议题交界）。

## Answer

三项拍板（HITL grilling，全票推荐案通过）：

- **F1 去留 = 定稿设计 + 施工挂起**：机制保留，语义定稿如下；修 N² 叠乘、补 `abilityUsed`/非攻击场景传播等内容需要时实施（内容层只记录不排期的既定尺子）。
- **F2 多段语义基准 = 单事件·运行时放大**：一次施放每逻辑效果只派发**一条**事件（`data.fireCount=N`），多段在执行层内按 N 独立掷点后聚合；`abilityCompiler` 的编译期效果复制废弃；`buffRuntime` 保持读 `data.fireCount` 自行放大。
- **F3 连发与计次 = 连发算一次攻击**：折焰类每次挥击耗 1 层；on-hit Buff 每事件结算一次，是否吃放大由各 Buff 配置决定。

**核验发现（拍板依据）**：现状编译期复制（`abilityCompiler.ts:127-149`）× 每伤害副本派发 `attackAfter`（`abilityRuntime.ts:106-136`）× buffRuntime 再读 `data.fireCount` 放大 = 潜伏 N² 叠乘（fireCount=2 技能对折焰目标 → 4 倍结算 + 多扣层）；当前零内容使用 `fireCount>1`，纯潜伏。

**写回已完成**：
1. `docs/combat/Ability.md` — 新增「连发（fireCount）语义定稿」节（combat-ability 无 spec.md，设计文档为落点）。
2. `.scratch/combat-buff/spec.md` §5 — 连发与计次口径注记（单事件基准、编译期复制废弃）。

**产生的实施项**（挂起待内容触发）：compiler 去复制化 + N² 修正、`abilityUsed`/非攻击场景 `data.fireCount` 传播、连发全链路测试——由路线图 06 号票归入桶 A/D 触发条件。
