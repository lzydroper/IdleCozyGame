# combat-experience · 战斗体验批

> 来源：`../combat-aftermath/roadmap.md` 批次④。chart 已完成（三问拍板）：X1 挂机信息流 = **GameContext 单一生产者**；X2 载体 = **独立内存环形缓冲**（不入 GameState、不持久化）；X3 B§5.4/T#8 = **接口确认 + 文档对齐**，不新增功能。

## 实施票

| 票 | 内容 |
|---|---|
| [01 挂机信息流单一生产者](tickets/01-idle-feed.md) | idleFeed 环形缓冲、GameContext 生产者接入、Widget 纯消费者化 |
| [02 动画倍速同步](tickets/02-animation-speed.md) | 受击闪烁/飘字时长随 speed 缩放（U#1） |
| [03 关名前缀清洗](tickets/03-name-cleanup.md) | regions 数据源清洗重复前缀（U#3 方案 A） |
| [04 战败回顾与多端文案](tickets/04-defeat-review.md) | 战败中断回顾弹窗（O#5）、多端同步沟通文案（O#6） |
| [05 远征选择器接入](tickets/05-expedition-selector.md) | ExpeditionPanel 复用 RegionSelectorModal(mode='expedition')（U#7） |
| [06 确认型条目归档](tickets/06-confirmations.md) | B§5.4 接口确认写回 docs/combat/Buff.md；T#8 单流结论写回 docs/combat/Turn.md |

顺序：01 为核心先行 → 02/03 并行小票 → 04/05 → 06 收尾。
