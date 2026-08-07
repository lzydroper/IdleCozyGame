# 图标系统统一实施

Status: resolved
Type: task
Blocked by: 03

## Question

按 03 的设计决策（D1–D6）落地实施：

1. **GameIcon 重构**：注册表驱动 + 三级回退（sprite → Lucide → 汉字首字）；type `'survivor'` 更名 `'hero'`；4 处调用点更新（CombatPlaybackView:136,257、WildernessTab:544,709）。
2. **删除 avatar**：`heroes.ts` 删字段；6 处死分支迁移为 `<GameIcon type="hero" ... />`（HeroTab、HeroListModal、HeroHealModal、HeroDetailModal、SummonTab、PartySlotModal）。
3. **碎片 sprite 配置**：`data/items/shards.ts` 为 9 个 `shard_<hero>` 补 sprite（复用对应英雄 survivors 图块）。
4. **与 05 的分工**：本 ticket 做基础层（GameIcon 本体 + avatar 迁移 + 碎片 sprite 配置）；05 做消费层（招募结果界面改用 GameIcon 统一渲染 + 设计语言统一）。
5. **验证**：`npx vitest run` 全量通过；`npm run build`（tsc -b && vite build）通过；肉眼核对 6 处头像框视觉（sprite 为 div+background）。

## Answer

（本 session 实施，2026-08-07，按 03 决策 D1–D6）

### GameIcon 重构（src/components/GameIcon.tsx）
- **注册表驱动**：`ICON_SOURCE_REGISTRY: Record<GameIconType, { source, expectsSprite }>`——`'hero'` → HEROES_CONFIG、`'item'` → ITEMS_CONFIG、`'enemy'`/`'zone'` → iconMaps；新增类型只需注册一行。
- **三级回退链**：sprite → Lucide → 单字汉字（注册表提供 name 取首字，仅作终极兜底）。
- **虚线框保留**：item/hero 缺 sprite 时显示「待补 sprite」虚线框（用户确认保留）；enemy/zone 无 sprite 概念，直接渲染 Lucide（视觉与旧版一致）。
- **sprite 网格规格**集中为 `SPRITE_GRID`（survivors 3x3，seeds/materials/supplies 4x4），替代原 if-else。
- type union：`'survivor'` 更名 `'hero'`（导出 `GameIconType`）。

### 删除 avatar（src/data/heroes.ts）
- `HeroConfig.avatar` 字段删除；6 处死分支全部迁移为 `<GameIcon type="hero" id={config.id}>`：
  - HeroTab（上阵槽位）、HeroListModal（列表卡）、HeroHealModal（治疗选择）、HeroDetailModal（大头像）、PartySlotModal（上阵选择，含 avatar 字段移除）；SummonTab 结果卡在 05 已用 GameIcon，本次统一 type 更名。
  - 首字渲染统一收敛到 GameIcon 三级回退（仅 HeroHealModal 保留 cfg undefined 兜底）。

### type 更名调用点
- CombatPlaybackView:136,257、WildernessTab:544,709：`type="survivor"` → `type="hero"`（全仓已无 survivor type 残留）。

### 碎片 sprite（src/data/items/shards.ts）
- 9 个 `shard_<hero>` 补 `sprite: { sheet: 'survivors', index: <同英雄> }`——专属碎片现渲染英雄立绘缩略（招募结果/背包/详情一致）；`resonance_shard`/`arcane_orb` 保持 Lucide。

### 验证
- `npx vitest run` 全量 → **409 passed / 40 files**（100 连测试中 shard_<hero> 不再打印「缺少 sprite」= 立绘生效）。
- `npm run build`（tsc -b && vite build）→ 通过。
- oxlint：仅 3 条 **pre-existing** 警告/错误（HeroDetailModal hooks 顺序 + heroEquip exhaustive-deps、WildernessTab drawEvent 依赖）——git stash 验证与本次改动无关，留 13（性能重构）/12（整理）处理。

### 待办（肉眼核对）
- GameIcon 为 div+background（非 object-cover），6 处头像框建议 dev server 肉眼核对视觉（01 风险提示）。

