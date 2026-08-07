# 图标系统统一实施

Status: open
Type: task
Blocked by: 03

## Question

按 03 的设计决策（D1–D6）落地实施：

1. **GameIcon 重构**：注册表驱动 + 三级回退（sprite → Lucide → 汉字首字）；type `'survivor'` 更名 `'hero'`；4 处调用点更新（CombatPlaybackView:136,257、WildernessTab:544,709）。
2. **删除 avatar**：`heroes.ts` 删字段；6 处死分支迁移为 `<GameIcon type="hero" ... />`（HeroTab、HeroListModal、HeroHealModal、HeroDetailModal、SummonTab、PartySlotModal）。
3. **碎片 sprite 配置**：`data/items/shards.ts` 为 9 个 `shard_<hero>` 补 sprite（复用对应英雄 survivors 图块）。
4. **与 05 的分工**：本 ticket 做基础层（GameIcon 本体 + avatar 迁移 + 碎片 sprite 配置）；05 做消费层（招募结果界面改用 GameIcon 统一渲染 + 设计语言统一）。
5. **验证**：`npx vitest run` 全量通过；`npm run build`（tsc -b && vite build）通过；肉眼核对 6 处头像框视觉（sprite 为 div+background）。
