# 英雄 tab 模块代码整理收尾

Status: open
Type: task
Blocked by: 04, 05, 06, 07, 08, 09, 10, 11

## Question

英雄模块整体代码整理（第 12 点，收尾 ticket）：

1. `HeroTab` / `HeroDetailModal` / `HeroTalentPanel` / `SummonTab` 等组件拆分与职责梳理（大组件拆分子组件、重复样式提取到 UI_TOKENS / 共享 class）。
2. 注释与遗留代码清理（如过时的 ticket 编号注释、mock 文案、废弃字段引用）。
3. 跑通 `npm run build`（tsc -b）与 `npx vitest run` 全量测试，保证无回归。

产出：重构后的组件 + 全量测试通过。
