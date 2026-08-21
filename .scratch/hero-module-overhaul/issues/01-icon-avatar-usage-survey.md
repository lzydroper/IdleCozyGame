# 图标与英雄字段使用点全量枚举（研究）

Status: resolved
Type: research
Blocked by:

## Question

全量枚举英雄模块的图标渲染现状，为「图标系统统一设计」（03）提供影响面清单：

1. `HeroConfig` 的 `avatar` / `sprite` / `icon` 三个字段分别在哪些文件/组件被读取与渲染（HeroTab、HeroDetailModal、SummonTab、HeroListModal、PartySlotModal、CombatPlaybackView、WildernessTab 等）。
2. `GameIcon` 组件全部调用点与其 `type` 分布（'item' / 'survivor' / 'enemy' / 'zone'）；type='survivor' 的调用点实际渲染的是 `HEROES_CONFIG`，逐一点名。
3. `SURVIVORS_CONFIG` 的全部使用点（DreamscapeTab、ShelterTab、WildernessTab、shelter.ts 等）及其用途（剧情档案 vs 其他）。
4. 碎片类物品（`shard_<hero>`、`resonance_shard`、`arcane_orb`）的图标定义位置与渲染方式（`data/items/shards.ts` 的 `icon` 字段 vs sprite）。
5. 头像渲染的现状盘点：哪些地方用 `<img src={avatar}>`、哪些用 `GameIcon`、哪些用汉字首字回退——删除 avatar 后每个使用点的替代方案建议。

产出：按文件:行号引用的影响面清单 + 每处的迁移建议。

## Answer

（research 子代理 sa_20260807_182425，2026-08-07）

### 核心结论
`heroes.ts` 中 9 位英雄 **avatar 配置数为 0/9**（heroes.ts:17 仅为残留可选字段），`sprite` 为 9/9（sheet:'survivors', index 0–8）。6 处 `<img src={config.avatar}>` 全部是**永不命中的死分支**——当前实际渲染的都是汉字首字。删除 avatar 不影响任何可见渲染。

### avatar 使用点（6 处，均含首字回退）
- HeroTab.tsx:94–104、HeroDetailModal.tsx:335–339、HeroListModal.tsx:68–78、SummonTab.tsx:343–347、HeroHealModal.tsx:95–99（调查遗漏点）、PartySlotModal.tsx:54（拷贝字段）+158–168。
- CombatPlaybackView / WildernessTab / ShelterTab 无 avatar，已走 GameIcon。

### GameIcon 调用点
- type='survivor'（渲染 HEROES_CONFIG）共 4 处：CombatPlaybackView.tsx:136、:257；WildernessTab.tsx:544、:709。
- type='item' 24 处；type='enemy' 3 处（CombatPlaybackView:138,259、WildernessTab:854）；type='zone' 2 处（WildernessTab:675,792）。

### SURVIVORS_CONFIG
全部为文本元数据（无图标字段）：DreamscapeTab:140,480、ShelterTab:201,212,302,615,726,808,852、WildernessTab:225,370、state/shelter.ts:10。作为剧情档案保留。

### 碎片图标
`data/items/shards.ts:11–21` 全部**只有 Lucide icon，无 sprite** → 经 GameIcon 渲染走「Lucide + 琥珀虚线待补边框」回退。shard_<hero> 复用对应英雄同款 Lucide。背包 ItemGridItem:27、详情 ItemDetailModal:157 走 GameIcon；招募结果 SummonTab 不用 GameIcon（Award/Sparkles/文本硬编码）；HeroDetailModal 升星区仅 Star+文本。

### 迁移建议
- 6 处 avatar 死分支 → `<GameIcon type="survivor" id={config.id} className="..." />`（sprite 9 位全覆盖，GameIcon 是 div+background，className 控尺寸）。
- heroes.ts:17 删除 `avatar?: string`；heroes.test.ts 未校验 avatar/sprite，不受影响。
- 注意：GameIcon 为背景图非 object-cover，迁移后需肉眼核对 6 处头像框视觉。
