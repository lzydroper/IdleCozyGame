# 招募结果界面设计语言统一 + 图标与背包一致

Status: resolved
Type: task
Blocked by: 03

## Question

招募结果弹窗（SummonTab.tsx 的 resultOutcomes 区域）改造：

1. 设计语言与外部统一：采用 `UI_TOKENS` 标准弹窗容器（`modalContainerStandard` 系）、统一间距/圆角/按钮样式，消除 `rounded-3xl`、自定义渐变按钮等异质样式。
2. 结果中的碎片（共鸣碎片、灵魂碎片、奥术星体）与英雄图标渲染与背包/列表**完全一致**：统一走 `GameIcon`（依赖 03 的图标系统设计），不再各自硬编码 `<img>` / Lucide / 汉字。

产出：SummonTab.tsx 结果区域改造 + SummonTab.test.tsx 更新。

## Answer

（本 session 实施，2026-08-07）

### 1. 设计语言统一（对齐 UI_TOKENS 标准弹窗）
- 结果弹窗容器：`rounded-3xl` + amber 边框 + 渐变 → `bg-zinc-900 border-zinc-750 rounded-2xl w-[92%] max-w-[380px] max-h-[85vh] p-4 flex flex-col gap-3`（对齐 HeroDetailModal 等标准弹窗；max-h 防 100 连结果溢出）。
- 标题：`text-base text-amber-300` → `text-sm font-black text-zinc-100`（标准弹窗标题层级）。
- 卡片：统一 `rounded-xl bg-zinc-950/80 border`，去掉渐变背景与 shadow-lg；isNew 保留 `border-amber-400` + NEW! 徽章；奥术星体（保底大奖）保留 `border-amber-400/80` 但去渐变。
- 「收下」按钮：渐变 → `rounded-xl bg-amber-600 hover:bg-amber-500`（对齐规则弹窗「了解」按钮实色风格）。

### 2. 图标统一走 GameIcon（与背包 ItemGridItem 同一渲染通道）
- 英雄卡片：`<GameIcon type="survivor" id={config.id} className="w-10 h-10 mb-1 rounded-xl" />` —— 替换 avatar 死分支，直接渲染 sprite 立绘。
- 奥术星体：`<GameIcon type="item" id="arcane_orb" />`（替换 Award；`animate-bounce` 一并移除）。
- 共鸣碎片（未出英雄）：`<GameIcon type="item" id="resonance_shard" />`（替换 Sparkles 硬编码）。
- 重复英雄：新增碎片小图标与文本并列——`soul` → `shard_<hero>`，`resonance` → `resonance_shard`，与背包一致。
- 移除 `Award` import（不再使用）。

### 验证
- `npx vitest run src/components/SummonTab.test.tsx` → 7 passed。
- `npx vitest run` 全量 → **404 passed / 40 files**（无回归）。
- `npx tsc -b` → 通过；`npx oxlint src/components/SummonTab.tsx` → 0 警告。

### 备注
碎片（`shard_<hero>` / `resonance_shard` / `arcane_orb`）目前以「Lucide + 待补虚线框」渲染（shards.ts 尚无 sprite），与背包现状完全一致；专属碎片复用英雄 sprite 立绘缩略的配置由 14 号 ticket 实施。

