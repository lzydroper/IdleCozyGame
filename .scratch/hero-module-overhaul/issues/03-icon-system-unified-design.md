# 图标系统统一设计（决策）

Status: resolved
Type: grilling
Blocked by: 01

## Question

基于 01 的影响面清单，决策统一图标渲染系统：

1. `GameIcon` 的渲染协议：如何根据类型/数据决定渲染 spritesheet、LucideIcon、还是单字汉字回退（回退链顺序与「待补 sprite」标记的取舍）。
2. `iconMaps.ts` 作为数据层的职责边界：敌人/区域/装备槽位映射留在 iconMaps，物品/英雄的 sprite 与 Lucide 回退内聚在各自配置表（ADR-0015），单字汉字回退的生成规则放哪。
3. `GameIcon` 的 `type='survivor'` 是否更名为 `'hero'`；`SURVIVORS_CONFIG` 作为剧情档案的处理方式。
4. 删除 `HeroConfig.avatar` 后各使用点（01 清单）的具体迁移方案。
5. 碎片类物品图标统一：`shard_<hero>` 复用对应英雄的渲染（spritesheet 立绘缩略 / Lucide / 汉字），保证招募结果、背包、列表完全一致。

产出：设计决策 + 迁移清单。参考 ADR-0015 与 01 研究结果。

## Answer：图标系统统一设计决策（2026-08-07，HITL 与用户确认）

### D1. GameIcon 三级回退渲染协议
渲染优先级：**spritesheet → LucideIcon → 单字汉字**。
1. 配置源存在 `sprite` → 渲染 spritesheet 图块。
2. 无 sprite 有 Lucide `icon`（配置表内聚或 iconMaps）→ Lucide + **保留「待补 sprite」虚线框**（用户确认保留，暴露补图进度）。
3. 无 sprite 无 Lucide → **单字汉字**（配置源 `name[0]`）+ 虚线框 + console.warn。
汉字首字只作终极兜底，由 GameIcon 统一提供，调用方不再各自渲染首字。

### D2. 注册表驱动架构
GameIcon 内部用注册表替代 if-else：
- type 枚举：`'hero' | 'item' | 'enemy' | 'zone'`（原 `'survivor'` 更名 `'hero'`）。
- `'hero'` → `HEROES_CONFIG[id]`（sprite + icon 内聚，ADR-0015）；`'item'` → `ITEMS_CONFIG[id]`；`'enemy'` → `ENEMY_ICON_MAP[id]`；`'zone'` → `ZONE_ICON_MAP[id]`。
- 注册表同时提供 `name`（汉字回退来源）；新增类型只需注册一行。

### D3. iconMaps.ts 作为数据层
保留 `ENEMY_ICON_MAP` / `ZONE_ICON_MAP` / `SLOT_ICON_MAP` 三个纯数据映射（无渲染逻辑）；物品/英雄的 Lucide 回退继续内聚在各自配置表（ADR-0015）。渲染职责全部收敛到 GameIcon。

### D4. 删除 avatar
- `heroes.ts` 删除 `avatar?: string` 字段定义。
- 6 处死分支迁移为 `<GameIcon type="hero" id={config.id} ... />`：HeroTab:94-104、HeroListModal:68-78、HeroHealModal:95-99、HeroDetailModal:335-339、SummonTab:343-347、PartySlotModal:54+158-168。

### D5. 碎片图标统一
- `shard_<hero>`（9 个）新增 `sprite` 字段，复用对应英雄的 survivors 图块（sheet:'survivors', index 同英雄）——碎片 = 英雄立绘缩略。
- `resonance_shard` / `arcane_orb` 保持 Lucide（虚线框暴露补图进度）。
- 碎片与英雄所有渲染统一走 GameIcon：招募结果、背包 ItemGridItem、物品详情 ItemDetailModal、升星区（HeroDetailModal）——消除 Award/Sparkles/首字硬编码。

### D6. type 更名影响面
- GameIcon type union：`'survivor'` → `'hero'`。
- 4 处调用点：CombatPlaybackView:136、:257、WildernessTab:544、:709。
- `SURVIVORS_CONFIG` 保留为剧情档案（纯文本，不涉及图标）。

### 风险提示
- GameIcon 渲染为 div+background（非 object-cover img），迁移后需肉眼核对 6 处头像框视觉（01 已提示）。

