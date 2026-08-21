# 温室系统改造 — Wayfinder Map

## Destination

温室（后勤页）系统改造完成并全量测试通过：种植槽改为原型风格小号卡片（作物图标退役，直接复用对应产出物品的 icon）；种子选择界面走新的物品系统（隐藏没有的种子）；驻守重构——去掉「加速成长」（浇水改为维持生长），显示并生效驻守特殊加成（速度→生长、产量→收割），加入自动收割并播种；按钮调整——一键手动浇水→批量浇水、一键收割并播种→批量收割（只收割不播种）、收割按钮移至浇水按钮下方；删除连播选择；新增挂机区域（启用/关闭 + 选种，驻守后可选择某个种子，开启后持续收割/浇水/播种对应种子直到种子耗光停止，支持离线收益）；播种与选种弹窗统一为可复用组件。

## Notes

- 领域：温室种植 / 后勤驻守 / 挂机自动化。相关文档：`.scratch/item-system-rework/spec.md`（物品系统四分类与单一真相源）、ADR-0018（后勤指派统一模型）、`src/components/shelter/prototype.js`（原型：小号卡片模板 `card()` 与温室布局）。
- **工作方式（用户指定）**：先全部 grill 敲定决策，再统一干活。每个 ticket 均为 `grilling`（HITL）类型——通过与用户对话敲定该域的设计并记录决策；全部 ticket 关闭、决策齐备后，另行进入实现阶段（新建 `task` tickets 或直接实施），grilling 会话中不写代码。
- 已确认决策（grilling 拍板，tickets 直接引用，无需再问）：
  1. **浇水 = 维持生长**：浇水不再提供 ×2 加速；作物不浇水则停止生长，浇水后以基础 1x 生长。
  2. **驻守特殊加成只生效速度与产量**：`facilitySpeedMultiplier` → 生长速度加成（乘算）；`facilityYieldMultiplier` → 收割产出加成（floor 取整）；`facilityCostReduction` 不应用于温室（种子消耗固定）。
  3. **挂机浇水不消耗魔能**（与驻守免费自动浇水一致）。
  4. 挂机种子耗光 → 自动停止。
- 需要 consult 的 skill：每个 ticket 解决时必调 `grilling` + `domain-modeling`；实现阶段用 `implement`。
- 关键文件：`src/types/game.ts`、`src/state/greenhouse.ts`、`src/state/tick.ts`、`src/state/offline.ts`、`src/state/shelter.ts`、`src/context/GameContext.tsx`、`src/components/ShelterTab.tsx`、`src/components/shelter/prototype.js`、`src/data/crops.ts`、`src/data/items/resources.ts`、`src/data/heroes.ts`。
- 测试约定（AGENTS.md）：组件测试需 GameProvider + ToastProvider + localStorage 预置存档；状态层测试走纯函数；全量 `npx vitest run`、`npm run build`、`npm run lint` 必须全绿。

## Decisions so far

- [01 浇水维持生长机制](issues/01-watering-maintains-growth.md) — 浇水=维持生长：湿润永久（浇一次湿润直到收割重置）、种下未湿润、未湿润作物停滞（生长时间不扣减、进度不回退）、湿润 1x 生长（移除 ×2 加速）；`hasActiveSystems` 保持有作物即活跃（避免停滞期 lastTick 冻结导致浇水后跨期补扣）；离线与在线一致。
- [02 驻守重构与加成生效](issues/02-garrison-rework.md) — 驻守=自动浇水（免费维持湿润）+自动收割并补种原作物（种子不足留空、种下未湿润）+特殊加成：速度乘算生长（仅湿润作物 `elapsed * (1+speedMult)`）、产量 floor 加成覆盖驻守期间所有收割（手动/批量/自动）；播种策略抽公共 helper（`'original'` | `{ cropId }`），挂机开启时播种目标切换为挂机种子（T03）。
- [03 挂机区域机制](issues/03-auto-farm-mechanic.md) — `greenhouse.autoFarm = { enabled, cropId }`；选种无前置、开启需驻守、解除驻守自动关闭但保留 cropId；循环复用 T02 helper 的 `{ cropId }` 策略（收割→免费浇水→播种选定种子，种到最后一颗、种不完留空、种子耗光 enabled=false）；挂机期间手动播种禁用（UI 层）；离线按秒推进并入 recoveredItems/日志。
- [05 种子选择弹窗统一](issues/05-seed-select-modal.md) — 新组件 `SeedSelectModal`：props `{ isOpen, title, inventory, onSelect, onClose, selectedCropId? }`；走物品系统（种子 icon = `GameIcon type="item" id={seedId}`、作物名）；列表式条目（种子 icon + 作物名/描述/生长时间 + 种子数 + 全部产出预览）；无种子作物隐藏、全空显示空态；`selectedCropId` 高亮供选种模式；播种与挂机选种两处复用。
- [04 温室 UI 改造](issues/04-greenhouse-ui.md) — 种植槽小卡片（原型风格：主产物产出 icon、进度条、湿润蓝水滴/停滞「缺水」橙警示、单槽收割/浇水）；驻守卡片下方一行 flex：左侧垂直列（批量浇水在上/批量收割在下）+ 右侧挂机区域（开关+选种+状态，未驻守禁用）；驻守卡片显示 dutyMeta 徽章与效果文案（移除「生长翻倍」表述）；删除连播（replantCropId/handleBatchHarvestAndReplant/GameContext action）；播种与选种接入 SeedSelectModal。

## Not yet specified

- 扩建后槽位（`unlockedSlotsCount > 4`）时卡片网格的布局/滚动表现（将在 10 温室 UI 重构中顺带处理）。

## 实现 tickets

grilling 决策齐备后进入实现阶段（to-tickets 发布，`tickets/` 目录，与 `issues/` 的 grilling tickets 区分）：

- [06 浇水维持生长](tickets/06-watering-maintains-growth.md) — 无阻塞
- [07 驻守自动化与特殊加成](tickets/07-garrison-automation.md) — ← 06
- [08 挂机区域机制](tickets/08-auto-farm-mechanism.md) — ← 06, 07
- [09 种子选择弹窗](tickets/09-seed-select-modal.md) — 无阻塞
- [10 温室 UI 重构](tickets/10-greenhouse-ui-rework.md) — ← 06, 07, 08, 09

## Out of scope

- 新增作物品种、调整作物数值（yields/growthTime/seedCost）——只做机制与 UI 改造。
- 作物 spritesheet 美术资源（item-system-rework 已定：作物无 sprite，补图走统一配置）。
- 温室之外的 tab 重构、英雄/战斗/远征/产线系统改动。
