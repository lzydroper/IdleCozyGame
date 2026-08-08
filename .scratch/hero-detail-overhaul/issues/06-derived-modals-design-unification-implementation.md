# 相关子弹窗设计语言统一实施（UI_TOKENS 扩展 + 字号对齐 + z-index 规范）

Status: open
Type: task
Blocked by: 03

## Question

按 03 决策（用户已拍板：对齐阶梯按场景留余地 · 扩展 UI_TOKENS 字号/卡片/按钮 token · 容器统一到标准尺寸 · 天赋树外提 + z-index 规范），统一英雄详情弹窗挂载的 6 个子弹窗设计语言。

## 03 已定决策

1. **字号**：对齐 02 阶梯但按场景留余地——正文 10-11px（高密度属性表用 10）、标签 10px、辅助 ≥9px；标题保持 text-sm/base。
2. **UI_TOKENS 扩展**：新增字号阶梯 token + 区段卡 token + 弹窗头部 token。
3. **容器**：统一到标准尺寸（`w-[92%] max-w-[380px] max-h-[68vh]`）；装备详情保留 `overflow-y-auto` 滚动特性。
4. **z-index 规范**：主弹窗 `z-[10000]` / 子弹窗 `z-[10001]` / 三级 `z-[10002]`；天赋树弹窗容器从 HeroDetailModal 内联外提。

## 实施清单

### A. `src/data/uiConstants.ts` 扩展

```ts
// 字号阶梯（02 变体 C；textBodyDense 用于高密度属性表）
textBody: 'text-[11px]',
textBodyDense: 'text-[10px]',
textLabel: 'text-[10px]',
textMini: 'text-[9px]',
// 区段卡
sectionCard: 'bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2',
// 弹窗头部
modalHeader: 'flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0',
modalHeaderTitle: 'text-sm font-black text-zinc-100 flex items-center gap-1.5',
modalCloseButton: 'p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0',
// 子弹窗 backdrop（z-index 规范：主 10000 / 子 10001 / 三级 10002）
modalBackdropChild: 'fixed inset-0 z-[10001] bg-black/75 flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto',
```

容器尺寸统一：`modalContainerEquipment` 与 `modalContainerCompact` 的 `max-w`/`max-h` 改为与 `modalContainerStandard` 一致（`max-w-[380px] max-h-[68vh]`），保留各自的 overflow 特性（Equipment 滚动 / Compact 隐藏）。

### B. 逐弹窗迁移

| 弹窗 | 现状 | 迁移 |
|---|---|---|
| **DetailedStatsModal** | 自绘容器/border-zinc-700、text-xs 级、z-10001 | backdrop→`modalBackdropChild`；容器→Standard；头部→`modalHeader`/`modalHeaderTitle`/`modalCloseButton`；区段→`sectionCard`；字号→`textBodyDense`(10px) + `textMini`(9px)；图标 w-3.5→w-4 |
| **HeroTalentPanel 容器** | HeroDetailModal 内联（z-10001、自绘） | 外提为独立弹窗组件（HeroDetailModal 调用点替换），backdrop→`modalBackdropChild`、容器→Standard、头部→header token；面板内部字号 7-8px→`textMini`(9px)、9-10px 保持 |
| **EquipmentDetailModal** | modalBackdrop(z-10000)、containerEquipment(370/85vh)、字号 8-11px | backdrop→`modalBackdropChild`(10001)；容器尺寸统一 380/68vh（保留 overflow-y-auto + overscroll-contain）；字号→`textBody`(11px)/`textLabel`(10px)/`textMini`(9px)，强化/来源等辅助信息≥9px |
| **EquipSelectorModal** | modalBackdropSub(z-10002)、containerCompact(360/75vh)、字号 9-10px | backdrop→`modalBackdropChild`(10001)；容器尺寸统一；字号→`textBody`(11px)/`textLabel`(10px)/`textMini`(9px) |
| **HeroDossierModal** | 自绘 z-10002、字号 9-10px | backdrop→`modalBackdropChild`(10001)；容器→Standard；头部/区段→token；字号 9-10px 保持（→`textLabel`/`textMini`） |
| **ExpLevelUpModal** | modalBackdrop(z-10000)、Standard、字号 9-10px | backdrop→`modalBackdropChild`(10001)；字号→`textBody`(11px)/`textLabel`(10px)/`textMini`(9px) |

### C. z-index 收口

- `modalBackdrop` 保持 `z-[10000]`（主弹窗：HeroDetailModal、ItemDetailModal 等）
- 新增 `modalBackdropChild` `z-[10001]`（子弹窗：上述 6 个）
- `modalBackdropSub` 改 `z-[10002]`（三级/治疗等）——若无现存三级场景可保留定义备用
- 自绘 backdrop 的弹窗（HeroDossierModal、天赋树外提后）迁移到对应 token

### D. 验证

- `npx vitest run` 全量通过（现有弹窗测试断言文本/交互，不依赖 className）
- `npm run build`（tsc -b && vite build）通过；`npx oxlint` 无新增
- 肉眼：6 个子弹窗字号/容器/头部统一，无溢出、无回归
