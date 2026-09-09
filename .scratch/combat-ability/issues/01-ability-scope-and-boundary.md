# 01 — Ability 范围与边界

Type: grilling
Status: resolved
Blocked by: (无)

## Question

「Ability（能力）」模块的覆盖范围与职责边界如何定？需决议：

1. 覆盖范围：主动行为（普通攻击、觉醒技能、未来主动技能）与触发型被动（如攻击吸血、反伤、召唤）归 Ability；纯属性加成（升星/天赋/觉醒被动/羁绊/装备的 `StatModifier`）是否继续走既有 bonus-source / 统一 Modifier，不迁入 Ability？
2. 职责边界：Ability 是否只负责「算来源侧最终数值 + 收集入参 + 派发 Buff/Effect」，不直接改 hp/面板、不自行审核抵抗/无效化、不自行修正数值？
3. 兜底普通攻击是否作为 Ability（而非 Turn/executor 特判）？
4. 持久被动是否作为 Ability 的配置层表达、运行时编译为 Buff，而非第二套被动系统？

产出：Ability 模块的 scope 边界陈述，写入 map Notes / 最终 spec。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 覆盖范围**：主动行为（普通攻击、觉醒技能、未来主动技能）与触发型被动（攻击吸血、反伤、召唤等）归 Ability；纯属性加成（升星/天赋/觉醒被动/羁绊/装备的 `StatModifier`）继续走既有 bonus-source / 统一 Modifier，不迁入 Ability。
- **D2 职责边界**：Ability 只负责「算来源侧最终数值 + 收集入参 + 派发 Buff/Effect」；不直接改 hp/面板、不自行审核抵抗/无效化、不自行修正数值。
- **D3 普通攻击**：作为兜底 Ability（每个单位默认持有），由 Ability 层提供，Turn/executor 不做特判。
- **D4 持久被动**：作为 Ability 的配置层表达，运行时编译为 Buff；不引入第二套被动系统。
