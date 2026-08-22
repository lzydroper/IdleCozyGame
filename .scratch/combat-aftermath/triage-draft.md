# 分诊草表 — 七份 After 清单逐条盘点

> 状态：**定稿**（四项存疑已经用户拍板）。分类经用户对「存疑项」拍板后定稿。
> 核验基线：当前工作区代码 grep 核验（2026-02）。来源缩写：B=Buff.md §、E=Effect.md #、T=Turn.md #、A=Ability.md #、En=Entity.md #、O=Offline.md #、U=UI.md #。

## 图例

- ✅ **已完成**：标记核实属实或后续 effort 已吸收，关闭
- 🔁 **重复/被吸收**：与他条同源，并入主条目
- 🧭 **待决策**：归入四簇决策票（02 控制/中断 · 03 fireCount · 04 数值口径 · 05 双轨/装配）
- 🔨 **归组实施**：无需新决策，进候选 effort 桶（A 引擎收口 · C 召唤闭环 · E 战斗体验 · F Offline 守卫 · D 内容就绪[只记录]）
- ⚖️ **超范围建议**：建议移出本图范围，最终由 06 号票裁定

## 关键核验发现（修正清单文字）

1. **旧 buffSystem 已是零生产引用的孤儿**（仅自身测试引用；`recomputeCombatant` 已消失，`heroToCombatant` 直接产出 BattleEntity）。B5.1 / E#1 所述「新旧并存跑生产」已过时 → Buff 双轨从「迁移策略」缩水为「删除孤儿代码 + 确认面板无遗留依赖」。
2. **fireCount 注入链路已部分存在**：`abilityCompiler` 将其视为一等模板字段并在编译期复制效果（唯一 id）、`attackAfter` data 已携带、`buffRuntime` 会读 `timingCtx.data.fireCount` 循环结算。真实缺口 = abilityUsed/非攻击场景未覆盖 + 编译期复制与运行时循环两种语义并存未定一。
3. **Ability #1 为部分完成**：引擎类型已收敛 `ResolvedAbility[]`（✅），但 `abilityRuntime.ts:48`、`abilityPassive.ts:58` 残留 `as unknown as` 强转 → 进桶 A 清理。

---

## Buff.md（18 项 + 1 元条目跳过）

| 条目 | 分类 | 去向 |
|---|---|---|
| §1.1 BUFF_CONFIGS 仅 4 样例 | 🔨 | 桶 D（内容就绪，只记录） |
| §1.2 配置表应迁 src/data | 🔨 | 桶 D（低风险，随内容批） |
| §1.3 createEffects 函数字段 → 数据模板 | 🔨 | 桶 D（与 A#2 同批类型收紧） |
| §1.4 灼烧/折焰/战意魔数 fallback | 🔨 | 桶 D（随内容配置化） |
| §1.5 values 魔法 key 缺 schema | 🔨 | 桶 D（同上） |
| §2.1 applyBuff 不负责注册、低层 seam 漏注册 | 🧭 | → 05（统一 attachBuff seam vs 纳入 context） |
| §2.2 预置 buffsByUnit 不注册触发器 | 🧭 | → 05（随 attachBuff 一并收口） |
| §2.3 canTrigger 接口形状与 spec 不一致 | 🧭 | → 02（触发语义，拍板后写回 spec） |
| §2.4 temporary 每回合一次无守卫 | 🧭 | → 02（已在票内） |
| §2.5 WeakMap 注册记录不内聚 | 🔨 | 桶 A（T#7 句柄落地后自然消除） |
| §3.1 眩晕 off-by-one 口径 | 🧭 | → 02（已在票内） |
| §3.2 fireCount 无生产写入 | 🧭 | → 03（范围按核验发现 #2 收窄） |
| §3.3 fireCount N 次 vs 聚合 | 🧭 | → 03（编译期复制先例已存在） |
| §4.1 sourceConflict vs negated | 🧭 | → 02（已在票内） |
| §4.2 zeroed vs negated | 🧭 | → 02（已在票内，test:275 证实现用 negated） |
| §4.3 executeStun values 恒空 | 🔨 | 桶 A |
| §4.4 战意 Modifier 不影响战斗数值 | 🧭 | → 05（动态 Modifier 生效链路，⚠️存疑 Q4） |
| §4.5 removeBuff 清理范围仅 targetId | 🔨 | 桶 A |
| §4.6 owned Modifier source 标记缺 helper | 🔨 | 桶 A |
| §5.1 新旧 Buff 双轨 | 🔨 | **缩水**：桶 A「删除 buffSystem.ts 孤儿 + 测试」 |
| §5.2 canAct 只识别 stun | 🧭 | → 02（已在票内） |
| §5.3 stun durationReduction 未回写 combat-effect spec | 🧭 | → 02（写回义务） |
| §5.4 Buff 图标/状态栏展示接口 | 🔨 | 桶 E（UI effort 时确认数据接口） |
| §6.1 fireCount 测试手工构造 | 🧭 | → 03（若保留则补生产链路测试） |
| §6.2 仅样例 Buff 测试 | 🔨 | 桶 D |

## Effect.md（10 项）

| 条目 | 分类 | 去向 |
|---|---|---|
| #1 Buff 未接管（占位实现） | ✅ | combat-buff 已接管；残余即 §5.1 孤儿删除（桶 A） |
| #2 statModify 移除靠自律 | ✅ | temporary 递减+removeBuff 清理已由 combat-buff 实现；防线由 §4.5/4.6 补强 |
| #3 summon targetId 覆盖风险 | 🔁 | 并入召唤闭环主条目（= T#6 = En#8）→ 桶 C |
| #4 免疫/嘲讽 flag 无到期清除 | 🧭 | → 02（flag 是否由 Buff 包装带 duration，⚠️补入工作集） |
| #5 BattleFlag/EffectParamKey 魔法字符串 | 🔨 | 桶 A（union 收敛） |
| #6 EffectKind 三处 switch | 🔨 | 桶 A（executor 对象收敛，方案已明） |
| #7 fixture 重复 + 展平重复 | 🧭/🔨 | 展平 → 04（toBattleUnitStats）；fixture 抽取 → 桶 A |
| #8 未消费接口 | 🔨 | 桶 A（删除或留待消费方） |
| #9 伤害结果信息变少 | ⚖️ | ⚠️存疑 Q3：挂记录 vs 进体验桶 |
| #10 固定 EffectKind 扩展成本 | 🔨 | 桶 D（既定决策，内容量触发再评估） |

## Turn.md（16 项）

| 条目 | 分类 | 去向 |
|---|---|---|
| #1 数组队列 vs 优先队列 | 🧭 | → 04（预期接受数组+改 spec 措辞） |
| #2 先机浮点 | 🧭 | → 04（已在票内） |
| #3 取队首锁定写回 spec | 🧭 | → 04（已在票内） |
| #4 hp 受控入口缺失 | 🔨 | 桶 A（低优：随首个 dot/护盾/复活需求落地） |
| #5 取整分散 | 🧭 | → 04（已在票内） |
| #6 summonUnit 无 sourceId | 🔁 | 并入召唤闭环主条目 → 桶 C |
| #7 register 无返回句柄 | 🔨 | 桶 A（低风险收口，解锁 §2.5） |
| #8 主时机/细粒度事件混流 | 🔨 | 桶 E（UI effort 定 phase/双视图并写回 spec） |
| #9 debug 快照全量附加 | 🔨 | 桶 A（瘦身方案已明） |
| #10 类型耦合 statSystem | ✅ | battleTypes.ts 已存在（核验属实） |
| #11 setup seam | 🧭 | → 05（已在票内；代码核验仍在 turnEngine.ts:166/451） |
| #12 装配集中在 combat.ts | ✅ | createBattle 已抽出（CreateBattleOptions 在 combat.ts:121） |
| #13 两套单位形状 | ✅ | recomputeCombatant 已消失，heroToCombatant 产出 BattleEntity（核验属实） |
| #14 canAct 只查 stun | 🧭 | → 02（已在票内；canActWithBuffs 在 combat.ts:116 只查 stun 属实） |
| #15 UI 最小消费 | ✅ | 已被 combat-ui 播放器超越 |
| #16 边界校验缺口 | 🔨 | 桶 A（重复 id 校验+边界测试） |

## Ability.md（14 项）

| 条目 | 分类 | 去向 |
|---|---|---|
| #1 半强类型 | 🔨 | 部分✅；残留 cast 清理 → 桶 A |
| #2 EffectTemplate params 宽 Record | 🔨 | 桶 A（discriminated union + 校验函数，与 §1.3 同批） |
| #3 资源只支持 mp | 🔨 | 桶 D（ResourceKey 管线，第二资源需求出现时启动） |
| #4 面板重算无缓存/unit.stats 静态 | 🧭 | → 05（与 §4.4 同源，⚠️存疑 Q4） |
| #5 冷却 +1 补偿 | 🔨 | 桶 A（显式冷却模型重构） |
| #6 召唤物无冷却/被动 | 🔁 | 并入召唤闭环 → 桶 C |
| #7 被动读静态 stats | 🧭 | → 05（与 #4 同源） |
| #8 事件展示双轨 | 🧭 | → 05（已在票内；attackAfter 仍带 kind 属实） |
| #9 觉醒切 abilityId | ✅ | collectHeroAbilities 返回 ResolvedAbility[]（核验属实） |
| #10 敌人能力入口空转 | 🔨 | 桶 D（src/data 无任何 abilities 配置，属实） |
| #11 取整分散 | 🧭 | → 04（已在票内） |
| #12 statParams 克隆重复 | 🧭 | → 04（与 En#10 合并主条目） |
| #13 fireCount 只接攻击后 | 🧭 | → 03（已在票内） |
| #14 StatParams 位置 | ✅ | battleTypes.ts（核验属实） |

## Entity.md（12 项）

| 条目 | 分类 | 去向 |
|---|---|---|
| #1 配置层未 JSON 化 | 🔨 | 桶 D / 雾区（06 裁定立 effort 还是挂记录） |
| #2 other kind 无生产路径 | 🔨 | ref 扩展 → 桶 C；other 语义 → 桶 D |
| #3 basic_attack 隐式兜底 | 🧭 | → 05（已在票内） |
| #4 overrides 浅合并无校验 | 🔨 | 桶 A（与 En#9 同批配置校验） |
| #5 buildEntity 无残魔/显式 fixval 入口 | 🔨 | 桶 D（需求出现时扩展 BuildEntityParams） |
| #6 双展平双口径 | 🧭 | → 04（已在票内） |
| #7 createBattle.context run 前契约 | 🔨 | 桶 A（undefined + getter 抛错） |
| #8 召唤 id/sourceId 闭环 | 🔁 | 召唤闭环主条目 → 桶 C（effectSystem.ts:357 手工拼 id 属实） |
| #9 注册表完整性靠非空断言 | 🔨 | 桶 A（配置校验 seam） |
| #10 克隆重复 | 🧭 | → 04（并入 En#6 主条目） |
| #11 三入口未统一 | 🧭 | → 05（已在票内） |
| #12 setup 前移 | 🧭 | → 05（已在票内） |

## Offline.md（10 项）

| 条目 | 分类 | 去向 |
|---|---|---|
| #1 在线事件流双重模拟 | 🔨 | 桶 E 核心议题（与 U#2 同题合并） |
| #2 体力未入 modifier 体系 | 🔨 | 桶 D（装备/天赋加体力需求出现时接入） |
| #3 单 Tick 结算秒数上限 | 🔨 | 桶 F（防性能抖动，实现时定默认值） |
| #4 logs 无滑动窗口 | 🔨 | 桶 F（保留最新 ~100 条） |
| #5 战败中断告警回顾弹窗 | 🔨 | 桶 E |
| #6 多端同步玩家沟通 | 🔨 | 桶 E 低优（文案/文档） |
| #7 体力浮点持久化 | 🧭 | → 04（已在票内） |
| #8 探索/挂机底层互斥守卫 | 🔨 | 桶 F |
| #9 grantStamina allowOverflow 无调用方 | ✅ | 拍板保留（投机泛化留作道具接入的显式提醒，无施工） |
| #10 装备掉落自动分解 | ⚖️ | 属背包/掉落系统重构，建议挂记录（图外） |

## UI.md（7 项）

| 条目 | 分类 | 去向 |
|---|---|---|
| #1 动画时长与倍速脱节 | 🔨 | 桶 E（250/750ms 硬编码属实，BattleModal:230/254/273） |
| #2 挂机前台生命周期/结算时差 | 🔨 | 桶 E 核心议题（setInterval 属实 IdleCombatWidget:65/73；与 O#1 合并） |
| #3 区域/关名前缀重复 | 🔨 | 桶 E 低优（方案 A 数据源清洗） |
| #4 召唤槽位贪婪分配 | 🔨 | 引擎推荐字段 → 桶 C；表现 → 桶 E（findIndex 属实 BattleModal:184） |
| #5 MP 动效/暴击视觉分级 | 🔨 | 桶 E（纯打磨） |
| #6 衍生道具 Lucide 降级 | ⚖️ | 美术资源依赖，建议挂记录（图外） |
| #7 远征选择器收口 | 🔨 | 桶 E（拍板并入：复用 RegionSelectorModal(mode="expedition")，实现全玩法统一） |

---

## 实施桶汇总（候选 effort 雏形，最终由 06 号票组装）

- **桶 A · 引擎收口与守卫**：T#4(低优)/#7/#9/#16、En#4/#7/#9、E#5/#6/#7(fixture)/#8、B§2.5/§4.3/§4.5/§4.6、A#1残留/#2/#5、B§5.1 孤儿删除
- **桶 C · 召唤闭环**：E#3+T#6+En#8 主线、A#6、En#2(ref)、U#4 引擎侧
- **桶 E · 战斗体验**：U#1/#2(+O#1)/#3/#5/#7、O#5/#6(低)、B§5.4、T#8
- **桶 F · Offline 守卫与整洁**：O#3/#4/#8
- **桶 D · 内容与配置就绪（只记录不排期）**：B§1.1–1.5/§6.2、A#3/#10、En#1/#2-other/#5、O#2、E#10、E#9

## 决策票工作集增量（相对开票时的预设）

- **02 号票新增**：E#4（免疫/嘲讽 flag 到期语义）、B§2.3（canTrigger 形状写回）、B§5.3（stun 修订回写 combat-effect spec）
- **05 号票新增**：B§2.1/§2.2（attachBuff 统一 seam）、§4.4+A#4+A#7（动态 Modifier 战斗内生效链路——战意加成当前实际无效，属隐性正确性缺陷）
- **05 号票缩减**：B§5.1 Buff 双轨迁移 → 降级为桶 A 死代码删除
