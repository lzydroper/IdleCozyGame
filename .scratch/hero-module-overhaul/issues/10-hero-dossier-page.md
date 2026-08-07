# 英雄档案详情页（职阶 / 阵营设定）

Status: resolved
Type: grilling
Blocked by:

## Question

「后台驻守特长」卡片改为详情入口，点击弹出新界面展示英雄档案（第 10 点）：

1. 内容：名称、描述（backstory）、职阶（含职阶设定文案）、阵营（含阵营设定文案）、后台驻守特长（dutyMeta 完整展示）等。
2. **职阶设定文案**：为守护者 / 进攻者 / 协奏者编写设定说明（定位、战斗风格、在废土中的角色），目前只有 label 与颜色（`HERO_CLASS_LABELS` / `HERO_CLASS_COLORS`）。
3. **阵营设定文案**：为奥术 / 机械 / 梦魇 / 英灵 / 星界 / 魂印编写设定说明，参考 ADR-0002 与现有 backstory 的世界观。
4. 数据层：设定文案放哪（heroes.ts 的 label 扩展 vs 新 `data/heroLore.ts`）；入口 UI 形态（详情卡片改为可点击，右上角箭头）。
5. 与 HeroDetailModal 现有布局协调（卡片位置、弹窗层级）。

产出：设定文案 + 数据配置 + 档案弹窗实现 + 测试。

## Answer

（本 session 实施，2026-08-07，HITL 确认：设定文案用起草版；档案内容 = 指定范围 + 头部档案卡）

### 数据层（新增 src/data/heroLore.ts）
- `HERO_CLASS_LORE`：守护者/进攻者/协奏者职阶设定文案（用户认可起草版，参考 ADR-0002 与 backstory 世界观）。
- `HERO_FACTION_LORE`：奥术/机械/梦魇/英灵/星界/魂印阵营设定文案。
- `HERO_FACTION_COLORS`：阵营标签配色（仿 HERO_CLASS_COLORS 格式）。
- 文案为纯数据配置，UI 直接展示，可随时调整。

### 档案弹窗（新增 src/components/HeroDossierModal.tsx）
- 头部档案卡：头像（GameIcon type="hero"）+ 名称（含觉醒名）+ 职阶/阵营彩色标签 + 等级/觉醒状态。
- 背景故事（backstory）、职阶区（名称 + 设定文案）、阵营区（名称 + 设定文案）、后台驻守特长（dutyMeta 完整展示为徽章列表，无加成时提示）。
- 弹窗层级 z-[10002]（HeroDetailModal 之上），createPortal 到 body。

### 入口（HeroDetailModal）
- 「后勤驻守特长 / 英雄简述」卡片改为可点击档案入口：hover 边框高亮 + 右上角 ChevronRight 箭头 + title「查看英雄档案」；点击打开 HeroDossierModal。

### 测试
- 新增 HeroDossierModal.test.tsx（3 例）：档案内容渲染（职阶/阵营设定文案、backstory、+25% 生产速度）、X 关闭、关闭/未知英雄返回 null。
- HeroTab.test.tsx 新增集成测试（1 例）：后勤卡片 → 档案弹窗 → 职阶/阵营区 → 关闭。
- 全量 `npx vitest run` → **415 passed / 41 files**；`npm run build` 通过；新文件 lint 0（HeroDetailModal 3 条 pre-existing 留 13/12）。

