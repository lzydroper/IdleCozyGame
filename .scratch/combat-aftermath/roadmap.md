# 下一批 combat-* effort 路线图（combat-aftermath 终点交付物）

> 依据：`triage-draft.md`（88 条分诊定稿）+ 02–05 号决策票（20 项设计拍板）。
> 排序尺子：正确性 > 结构收敛 > 内容牵引 > 体验打磨（chart 阶段既定）。
> 权威索引声明：`docs/combat/After/*.md` 为各 effort 完成时的历史留档，**不随本路线图回写**；条目去向以本图 map + triage-draft 为唯一权威（分诊已发现两处陈旧记载：Buff §4.4 战意失效描述过时、Ability #1 部分完成）。

## 批次总览与顺序

```
①combat-hygiene ──→ ②combat-assembly ──→ ③combat-summon-closure
        └────────────→ ④combat-experience（①后任意时点可并行）
内容就绪项（桶 D）：不立项，挂记录，按各自触发条件启动
```

---

## ① combat-hygiene · 战斗口径收口批

- **目标**：把四簇已拍板的口径规则全部落地；纯机械改动，零新设计决策。
- **包含项**：
  - 数值口径（04 号票 N1–N6）：删伤害链三层重复 round（effectSystem:97 / abilityRuntime:111 / turnEngine:359,381）、抽 `toBattleUnitStats` + `cloneStatParams`、先机出口 `Math.round`、体力存档出口规范化两位小数
  - 控制语义（02 号票 D1–D3）：canAct 快照前移（turnEngine.ts:472-479 一行级）、`canActWithBuffs` 迁入 buffRuntime + `CONTROL_KINDS` 集合化、`zeroed`/`sourceConflict` 中断码 union 扩展
  - 引擎低风险收口：`register` 返回句柄（T#7，解锁 B§2.5）、debug 快照瘦身（T#9）、重复 id 校验 + 边界测试（T#16）、`createBattle.context` 契约（En#7）、配置校验 seam（En#4/#9）、BattleFlag/EffectParamKey 类型收紧（E#5）、未消费接口清理（E#8）、`as unknown as` 残留 cast（A#1 残余）、buff 小项（B§2.5/§4.3/§4.5/§4.6）、孤儿 `buffSystem.ts` 删除（B§5.1）
  - Offline 守卫（R3 裁定并入）：单 Tick 挂机结算上限（O#3）、logs 滑动窗口 ~100 条（O#4）、探索/挂机状态层互斥守卫（O#8）
- **依赖**：无（本批是其余各批的地基）
- **Chart 起点**：本图 map + 04 号票 Answer（口径规则已全文写回 docs/combat/Turn.md 数值口径节）
- **验收口径**：全量单测通过；伤害链单层取整断言；`grep buffSystem` 生产引用为零

## ② combat-assembly · 装配与事件收口批

- **目标**：结构类双轨清偿，引擎形态定型（Turn 保持纯流程引擎边界）。
- **包含项**：
  - 引擎拆分：`runTurnEngine` → `createTurnRuntime(units, config)` + `runtime.run()`；createBattle 在 run 前完成 BattleContext 构建与全部注册；`TurnConfig.setup` seam 删除（M3）
  - 事件双轨清偿（M2）：`attackAfter` 定位纯内部触发通道；删除 `kind:'attack'|'skill'`/`skillName` 遗留字段；awakening/abilityRuntime 等测试迁移到 `abilityUsed`+`effectApplied`
  - 动态面板残余（M1）：`applyHeal` 的 maxHp 钳制改用 resolveStats 解析值、被动编译改按动作时解析（abilityPassive 持 ctx）、无 statParams 回退路径收紧（battleContext.ts:220）
  - EffectKind 三处 switch 收敛为 executor 对象（E#6）；共享测试 fixture 抽取（E#7）
  - hp 受控入口 `applyHpDelta`（T#4，低优随批顺带）
- **依赖**：批次一（口径先定再动结构）
- **Chart 起点**：本图 map + 05 号票 Answer（事件定位与装配口径已写回 docs/combat/{Turn,Ability,Entity}.md）
- **验收口径**：TurnConfig 无 setup 字段；展示层测试零 `attackAfter` 依赖；被动数值随战斗内 Modifier 变化

## ③ combat-summon-closure · 召唤闭环批

- **目标**：召唤从 id 分配到 UI 字段的一次打通。
- **包含项**：
  - 主线（E#3 + T#6 + En#8 合并条目）：运行时唯一 id 分配（替代 `targetId-N` 手工拼接，effectSystem.ts:357）、`summonUnit(snapshot, sourceId?)` 来源参数、防覆盖校验（重复 id 抛错）
  - 召唤物冷却 tick 与被动编译注册（A#6，召唤落地 seam）
  - `EntityConfigRef` 扩展为 `hero | enemy | other` 判别联合（En#2 ref 部分）
  - `summon` 事件附带推荐 `targetSlotIndex`（U#4 引擎侧；表现侧归批次④）
  - `resolveEntity(configRef | id | config)` 单一公开入口收口（M4；`enemiesToEntities` 转内部细节）
- **依赖**：批次二（装配层稳定后 summon seam 最顺）
- **Chart 起点**：本图 map + 05 号票 Answer（装配口径节）+ `.scratch/combat-entity` 存档
- **验收口径**：同轮多次召唤 id 唯一、事件 sourceId 正确指向召唤者、重复 id 报错

## ④ combat-experience · 战斗体验批

- **目标**：产品体验清偿；**开工前需先走一轮自己的 chart**。
- **核心议题（chart 必答）**：挂机信息流生产者/消费者统一（U#2 + O#1 同题合并）——组件内 setInterval 双重模拟 vs GameContext/Worker 驱动，是架构决策不是施工项
- **其余包含项**：动画时长与倍速同步（U#1，250/750ms 硬编码）、区域/关名前缀清洗（U#3，方案 A 数据源）、MP 消耗/暴击视觉分级（U#5）、战败中断回顾弹窗（O#5）、远征选择器接入（U#7）、Buff 图标/状态栏展示接口确认（B§5.4）、事件 phase/双视图（T#8）、多端同步沟通文案（O#6）
- **依赖**：批次一之后任意时点可并行（避免口径变动期做 UI）；与②③无硬依赖
- **Chart 起点**：本图 map + `.scratch/combat-ui` / `.scratch/combat-offline` 存档
- **验收口径**：由该 effort 自己的 chart 产出

---

## 不立项（桶 D · 内容就绪，只记录不排期）

| 项 | 触发条件 |
|---|---|
| BUFF_CONFIGS 迁 `src/data` + 效果数据模板化 + values schema（B§1.1–1.5） | 新增真实 Buff 内容时 |
| 敌人/BOSS 能力内容配置（A#10） | 敌人差异化设计时 |
| 配置完全 JSON 化 + 统一注册表 + `other` kind 生产路径（En#1/En#2-other） | Level 破坏性重构或编辑器需求立项时 |
| `buildEntity` 显式 hp/mp/fixval 入口（En#5） | 出现残魔入场/召唤物初始 mp 需求 |
| ResourceKey 多资源管线（A#3） | 第二战斗资源（怒气等）设计时 |
| fireCount 补全：compiler 去复制化 + N² 修正 + abilityUsed 传播 + 全链路测试（03 号票） | 首个连发型技能/能力设计时 |
| 免疫/嘲讽 flag 由 Buff 包装（02 号票 D5） | 首个免疫/嘲讽类效果进入内容配置时 |
| 体力接入 modifier 体系（O#2）、grantStamina 溢出业务入口（O#9 已裁定保留）、装备掉落自动分解（O#10）、伤害详情信息带回（E#9）、美术 Sprite 补齐（U#6） | 各自对应系统立项时 |

## 已出清（Out of scope，承接 01 号票）

- 具体施工（本图只规划）、新内容制作本身、After 清单本体回写（R4 裁定：历史留档不回写）。
