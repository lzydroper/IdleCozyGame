# 英雄档案详情页（职阶 / 阵营设定）

Status: open
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
