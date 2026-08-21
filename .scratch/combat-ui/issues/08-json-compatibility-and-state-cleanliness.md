# 08 — 全 JSON 化兼容与状态持久化适配（JSON Compatibility & State Cleanliness）

Type: grilling
Status: resolved
Blocked by: 01, 02, 03, 04, 06

## Question

如何确保 UI 层的所有配置与运行时状态完全兼容未来的全 JSON 数据化并干净解耦？需决议：

1. **纯数据化 Props 与配置结构**：
   - 区域与关卡数据纯读取自 `src/data/regions.ts`，UI 组件内严禁写死数值与关卡逻辑；
   - 解锁条件诊断文案采用纯数据驱动的模板替换或纯函数翻译器，配置结构保证可直接转换为 JSON Schema；
   - 战斗事件展示文案（`formatBattleEvent`）收敛为配置化的格式化管道，支持未来多语言/JSON 模板替换。
2. **状态持久化与清理**：
   - 挂机状态 `state.combat.idle` 仅持久化纯数据字段（`{ regionId, levelId, startTime, lastTickTime, totalBattles, totalDrops }`），严禁包含未序列化的运行时对象；
   - 战斗场景中的战斗过程为纯内存临时播放，不污染持久化存档；
   - 旧版战斗 UI 相关的旧字段（如旧版 zoneId、旧版挂机状态）进行彻底清理，不向后兼容旧存档。
3. **UI 体系高度与视觉规范统一**：
   - 弹窗、容器与操作按钮遵循原始项目的统一高度/视觉规范，避免局部碎片化设计。

## Answer

### 1. 纯数据化与 JSON Schema 兼容约束

- **单一数据源**：
  - 区域配置 `RegionConfig` 与关卡配置 `LevelConfig` 存放于 `src/data/regions.ts`，所有字段（`id`, `name`, `desc`, `staminaCost`, `enemies`, `drops`, `unlockRequirement`）均为纯 JSON 可序列化结构；
  - UI 组件（`RegionSelectorModal`, `LevelBrowser`, `LevelDetailModal`, `BattleView`）仅作为只读渲染容器，严禁在组件内写死任何数值或关卡 ID 判断。
- **纯函数诊断与事件管道**：
  - 解锁条件诊断通过纯函数 `diagnoseRegionUnlock(req, state): DiagnosticResult[]` 进行结构化求值，返回纯数据诊断项（`{ type, label, current, target, passed }`），UI 仅渲染状态列表；
  - 战斗事件展示管道 `formatBattleEvent(event: BattleEvent): FormattedEvent` 以 `type` 为分发 Key，文案与动态实体解耦，天然支持未来 JSON 字典替换与多语言国际化。

### 2. 状态持久化边界与彻底清理

- **挂机状态持久化 Schema**：
  ```typescript
  export interface IdleCombatState {
    regionId: string;
    levelId: string;
    startTime: number;
    lastTickTime: number;
    accumulatedSeconds: number;
    totalBattles: number;
    totalDrops: Record<string, number>;
  }
  ```
  `state.combat.idle` 严格仅包含以上基本类型字段，不挂载任何 DOM 句柄、定时器 Timer 或闭包函数。
- **瞬态内存解耦**：
  - 主动战斗场景中的当前轮次、事件指针 `currentEventIndex`、动画播放状态、血条步进与伤害飘字均为 `BattleModal` 组件内部的 `useState` 纯内存状态，关闭或刷新即自动销毁，绝不写入全局存档；
- **旧字段破坏性清理**：
  - 移除所有旧版 `combat.currentZoneId`、旧版关卡链存档数据，不保留向后兼容垫片（遵循 `docs/combat/readme.md` 原则）。

### 3. 项目级 UI 高度与交互一致性规范

- **弹窗规格**：全项目弹窗统一采用 `rounded-3xl`、`bg-zinc-900`、`border-zinc-800` / `border-zinc-700/80`、`p-5`、`max-w-sm`；
- **操作按钮标准**：
  - 弹窗底部主操作按钮统一采用固定高度 `h-9.5`；
  - 控制栏小按钮统一采用固定高度 `h-8`；
  - 操作按钮文案严格统一为 **【确认】** 与 **【取消】**，不可交互时仅置灰禁用（`disabled` + `opacity-60`），严禁篡改按钮文案。
