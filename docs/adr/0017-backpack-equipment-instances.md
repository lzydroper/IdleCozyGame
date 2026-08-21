# 背包装备实例化：强化跟随装备保留（修订 ADR-0014）

Status: accepted

## 背景

ADR-0014 将背包定为纯计数模型（`inventory: Record<string, number>`），强化等级只存在于已穿戴实例（`equipment[heroId].slot = { itemId, enhance, mythic }`）。由此产生两个用户可见问题：

- 装备详情（背包弹窗）只能显示裸装基础属性，看不到"已强化装备"的强化后属性与当前强化等级——玩家在穿戴面板看到的强化后属性与背包详情不一致；
- 卸下装备 = 强化/神话直接丢失（虽有二次确认提示），玩家视为 bug：「卸下装备强化就不见了」。

## 决策

- **`GameState` 新增 `equipmentInventory: Record<string, EquippedItem[]>`**：可穿戴装备的实例列表（每实例含 `enhance`/`mythic`），强化跟随装备持久保留。
- **可穿戴装备判定** `isWearableEquipment`：`EQUIPMENT_CONFIG` 中定义的 12 件系列装备才实例化；强化魔晶、图纸等装备生态物品保持计数物品。
- **产出实例化**：合成/战斗掉落/事件奖励/背囊合并，凡可穿戴装备一律以 `+0` 实例进入 `equipmentInventory`（统一经 `addItemRewards`）；探索临时背囊（realityBag/dreamBag）保持计数（探索中装备无强化），折返/唤醒/救援合并时转实例。
- **穿戴/卸下实例化**：穿戴从实例表取一件（`equipItem` 新增可选 `index`，缺省取强化最高者；EquipSelectorModal/装备面板按实例逐条列出含 `+N` 徽章），换装/卸下时旧实例（含强化）放回 `equipmentInventory`——强化不再丢失；同物品换装放开（此前因计数模型无法区分实例而拒绝）。
- **旧存档迁移**：`mergeSavedState` 将 inventory 中的可穿戴装备计数转为 `+0` 实例并移出计数背包。
- **详情展示**：装备弹窗显示背包持有实例概要（按强化聚合）与所有已穿戴实例（英雄名 · 强化等级 · 强化后属性，含阵营加成与神话倍率）。

## Considered Options

- **维持计数模型，仅详情显示已穿戴实例信息**：修复信息不一致，但「卸下丢强化」依旧——用户明确要求强化保留。否决。
- **背包装备实例嵌入 `inventory` 值类型联合**：污染通用计数语义，全部读写点需分支。否决（独立字段更清晰）。

## Consequences

- `equipItemUpdate`/`unequipItemUpdate` 不再读写 `inventory` 装备计数；`HeroEquipmentPanel` 的「卸下会重置强化」二次确认移除（无损失）。
- `craftItemUpdate`、战斗掉落、事件奖励、背囊合并、`EquipSelectorModal`、`HeroEquipmentPanel`、`HeroDetailModal` 一键装备、`LogTab` 装备分类均改读实例表。
- `equipmentInventory` 持久化并随存档迁移；新增 `addItemRewards`/`isWearableEquipment`/`takeInstance`/`addInstanceBack` 工具。
- 测试：equipment/HeroTab/LogTab/ItemDetailModal/EquipSelectorModal 更新与新增（迁移、index 穿戴、实例显示、实例选择）。
