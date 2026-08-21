# 物品详情弹窗与批量使用（含道具边界修订）

Status: accepted

## 背景

- 背包物品（LogTab「避难所物资背囊」）仅有悬浮提示（tooltip）展示名称/描述，信息密度低且无法交互；道具使用只有工坊快捷面板 4 个固定入口，一次只能使用一个，无法批量。
- 道具分类边界模糊：`category='item'` 混入无背包内使用入口的场景装置（防御炮塔、重载护盾电池、盖革探测仪、偏光魔导镜片），与「道具 = 可主动使用」的定义冲突（修订 ADR-0014）。
- 背包中掉落的稳定/跃迁胶囊物品（来自梦境事件）无任何消费途径，是死物品——梦境探索实际消耗的是 `exploration.capsulesCharge` 充能次数（ADR-0014 决策保留的独立字段）。
- 属性上限逻辑过时：`applySupplyItemUpdate` 硬编码 `STAT_MAX = { food: 100, energy: isNovaPresent ? 130 : 100, sanity: 100 }`，但被动系统已退役（`maxEnergy` 恒为 100），`PlayerStats` 的 `maxFood/maxEnergy/maxSanity` 字段才是真相源。

## 决策

- **背包物品点击弹出固定尺寸详情弹窗**（复用 `UI_TOKENS.modalContainerStandard`，380×460），展示图标、名称、数量、介绍（描述区可滚动）；**移除悬浮提示**（`ItemGridItem` 的 `title` 原生提示与气泡 tooltip）。
- **所有道具必有「使用」按钮**：
  - 恢复类（8 个：口粮/热烩/罐头/水壶/能量补充剂/肾上腺素/净化血清/引梦魔灯）：带数量滑条；
  - 充能类（稳定胶囊/跃迁胶囊）：带数量滑条，消耗 1 个 → `capsulesCharge` 对应充能 +1 次，无属性封顶；
  - 治愈类（纳米修复剂）：点击弹出重伤英雄多选勾选界面（复用 PartySlotModal 的 3 列网格 + 勾选遮罩 + 确认按钮样式，只列重伤英雄），确认后消耗 = 勾选数。
- **滑条上限 = `min(拥有数, 主效果属性剩余容量可支撑的次数)`**；主效果 = `useEffect.stats` 的第一个 key；容量 = `ceil((player.max<Stat> - 当前值) / 效果值)`（最后一个可部分生效：饱食度 81/100、口粮 +30 时容量为 1，使用 1 个实际 +19 到满），上限读 `player.maxFood/maxEnergy/maxSanity`。
- **多效果只看主效果决定上限**（净化血清按理智容量算，污染可能提前清零——接受少量浪费，换取简单一致的规则）。
- **滑条显示实际生效值（含封顶）**：如饱食度 81/100、口粮 +30 选 1 个 → 显示「饱食度 +19（已满 100）」，不显示名义值，避免误导。
- **使用后弹窗停留、数量与滑条实时更新，不自动关闭**（支持连续批量调整；数量归 0 时使用按钮禁用）。
- **道具边界修订（修订 ADR-0014）**：`defensive_turret`、`shield_battery`、`geiger_counter`、`deflective_lens` 由 `item` 改归 `resource`；`sanity_capsule`/`warp_capsule` 补 `useEffect.capsuleCharge` 效果（+1 次/个）。

## Considered Options

- **增强悬浮提示而非弹窗**：tooltip 只能承载只读短信息，无法容纳滑条与使用交互，且 hover 在触屏/移动端不可用。否决。
- **多效果取各效果容量最小值**：更精确（血清的污染效果不浪费），但当前唯一多效果道具即净化血清，规则复杂度不划算；用户明确选定主效果规则。否决。
- **显示名义值 n×30**：81/100 时显示「+30」与实际结果不符，误导玩家。否决。
- **使用后关闭弹窗**：批量使用场景需反复重开，路径冗长；停留 + 实时更新更顺滑。否决。
- **胶囊 1 个 = 3 次充能**：与工坊「×3 充能」配方单位对齐，但背包掉落 1 个胶囊对应 3 次梦境消耗过于慷慨且单位混淆（配方名已含「×3」语义）；1 个 = 1 次更直觉。否决。

## Consequences

- `ItemMeta.useEffect` 扩展 `capsuleCharge` 字段（`{ sanity_capsule?: number; warp_capsule?: number }`）。
- `applySupplyItemUpdate` 改造为批量版（数量参数 + 用 `player.max*` 字段 + 胶囊充能分支）；`useSupplyItem(itemId, qty)` 增加数量参数。
- `healWoundedHeroUpdate` 增加批量版（或循环调用），支持一次治愈多名重伤英雄。
- 新增组件 `ItemDetailModal`（详情 + 滑条）与重伤英雄选择界面（复用 PartySlotModal 视觉）；`ItemGridItem` 移除 tooltip 并加可选 `onClick`。
- 工坊「避难所生存补给发放」快捷面板保留原样（不弹窗，仅背包入口弹窗）。
- `registry.test.ts` 分类断言更新（4 个装置改归 resource）；相关组件/状态测试同步调整。
