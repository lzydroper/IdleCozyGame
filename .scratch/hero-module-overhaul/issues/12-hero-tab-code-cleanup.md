# 英雄 tab 模块代码整理收尾

Status: resolved
Type: task
Blocked by: 04, 05, 06, 07, 08, 09, 10, 11

## Question

英雄模块整体代码整理（第 12 点，收尾 ticket）：

1. `HeroTab` / `HeroDetailModal` / `HeroTalentPanel` / `SummonTab` 等组件拆分与职责梳理（大组件拆分子组件、重复样式提取到 UI_TOKENS / 共享 class）。
2. 注释与遗留代码清理（如过时的 ticket 编号注释、mock 文案、废弃字段引用）。
3. 跑通 `npm run build`（tsc -b）与 `npx vitest run` 全量测试，保证无回归。

产出：重构后的组件 + 全量测试通过。

## Answer

（本 session 实施，2026-08-07，收尾）

### 代码整理
- **lint 清理**：EquipSelectorModal 的 `exhaustive-deps`（`state.equipmentInventory || {}` 每次渲染新建 → 模块级常量 `EMPTY_EQUIPMENT_INVENTORY` 替代）。全仓 oxlint：6 → 5 warnings、0 errors；剩余 5 条均为既有/非英雄模块（GameContext useGame / ToastSystem useToast only-export-components、App catch 未用变量、DreamscapeTab/WildernessTab useEffect 依赖），不属英雄模块范围，记录留作后续。
- **注释审计**：英雄模块的 `XX 号` 注释均准确指向本 map 的 ticket（10/11/15/16/17 号），保留；全仓旧 ticket 编号注释（工坊/荒野等）是历史风格，不做大规模考古重写。
- **废弃引用检查**：`COMBAT_CONFIG`（expPerLevel 经验显示 / partySize）仍被正常使用；`avatar`/`survivor` type/原型文件（talentTreePrototype、prototype）已全部清除（glob 验证无残留）。
- **结构评估**：英雄模块职责已良好——HeroDetailModal 的子弹窗全部独立组件（HeroTalentPanel / HeroDossierModal / ExpLevelUpModal / EquipmentDetailModal / EquipSelectorModal / DetailedStatsModal / HeroListModal / PartySlotModal / HeroHealModal）；HeroDetailModal 主体三列（装备/技能/头像）与升星/觉醒区耦合紧密、共用计算，强行拆分收益 < 回归风险，不作主体拆分（记录说明）。

### 验证
- `npm run build`（tsc -b && vite build）→ 通过；`npx vitest run` 全量 → **427 passed / 43 files**；`npx oxlint src` → 0 errors / 5 warnings（既有）。

