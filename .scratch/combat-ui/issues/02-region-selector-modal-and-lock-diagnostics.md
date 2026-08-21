# 02 — 通用区域选择器组件（RegionSelectorModal）与解锁原因诊断

Type: grilling
Status: resolved
Blocked by: 01

## Question

通用区域选择器组件如何设计两级交互并在三系统（荒野探索、战斗、远征）中无缝复用？需决议：

1. **两级弹窗交互流**：
   - 第一级（区域列表选择器）：展示当前模式下的所有可用主线与测试区域卡片（名称、等级标签、解锁/锁定标记）。
   - 第二级（区域详情弹窗）：点击任意区域后弹出，展示环境描述、当前进度、敌人概览、以及操作按钮（确认选择 / 取消）。
2. **锁住原因动态诊断**：
   - 当区域未解锁时，【确认】按钮置灰禁用；
   - 弹窗内结构化罗列导致锁住的具体原因及其当前完成度（如：`❌ 前置区域 [荒野入口] 探索度需达到 100% (当前 65%)`、`❌ 持有物品 [防毒面具] (当前 0/1)` 等）。
3. **跨系统复用契约 (Component Props)**：
   - `mode: 'exploration' | 'combat' | 'expedition'`；
   - `selectedRegionId: string | null`；
   - `onSelect: (regionId: string) => void`；
   - `onClose: () => void`；
   - 解锁判定复用 `src/state/levelCombat.ts` 纯函数 `isRegionUnlocked(state, regionId, mode)`。
4. **全 JSON 兼容**：解锁条件文案模板与图标映射纯配置化驱动。

产出：`RegionSelectorModal` 与 `RegionDetailModal` 的组件接口规范与锁住原因诊断器实现方案。

## Answer

（HITL grilling，纠偏并确认两级弹窗与诊断器规格）

- **D1 区域列表选择器（一级弹窗）**：模态展示所有主线及测试区域；每项仅展示区域名称、当前选中高亮状态、以及 `已解锁` / `未解锁 🔒` 标记；不设区域图标，不设不存在的危险度标签。
- **D2 区域详情弹窗（二级弹窗）**：点击区域项后弹出，仅展示区域名称、环境描述文本（`description`），不展示关卡总览（关卡收敛在战斗子页面）；已解锁时【确认选择】高亮可用，未解锁时【确认选择】置灰禁用并展示锁住原因诊断。
- **D3 锁住原因动态诊断器**：对接 `levelCombat.ts` 解锁规则，逐条结构化诊断前置探索度（如 `前置区域探索度需达100%（当前65%）`）与特殊需求（如道具持有、关卡通关），输出红叉/绿勾状态。
- **D4 跨三系统复用契约**：
  ```tsx
  export interface RegionSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'exploration' | 'combat' | 'expedition';
    selectedRegionId: string | null;
    onConfirmSelect: (regionId: string) => void;
  }
  ```

