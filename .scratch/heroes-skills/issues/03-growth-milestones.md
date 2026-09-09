# 数值成长与里程碑：两个正交维度

Type: grilling
Status: resolved

## Question

等级/星级的显式数值影响走什么形状？cost/cd 等结构字段能否随养成变化？

## Answer

- 数值维度（连续）：skills.json 行内 `"growth": { "perLevel": n, "perStar": n }`（均可缺省=不成长），两维独立乘算：
  `效果数值 = 基准 × (1 + perLevel×(等级−1)) × (1 + perStar×星数)`
- 结构维度（离散）：`"milestones": [{ "at": <与 unlock 同款条件>, "patch": {...} }]`
  - patch 为**绝对值替换**非增量，预览可直接念出（"Lv.20 后冷却变为 2 回合"）；
  - 字段白名单四项：`cooldown | priority | targeting | cost(整对象替换)`；
  - 多个里程碑命中同一字段时按声明顺序后者覆盖。
- 正交纪律：growth 只碰效果数字，milestones 只碰发动节奏字段——两条通道永不改同一个东西。
- 应用顺序固定：基础配置 → growth 烘焙 → milestones → 天赋重写压轴（天赋永远赢过成长）。
- 英雄区分配方：面板系英雄用 attack 公式 + 低成长；技能系英雄用 flat 公式 + 高 perLevel——复用现有 FormulaTemplate 原子，零新增机制；此指引写入 spec 与 config-guide。
