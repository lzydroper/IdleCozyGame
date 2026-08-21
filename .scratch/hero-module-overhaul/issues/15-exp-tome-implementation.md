# 经验手册与升级改造实施

Status: resolved
Type: task
Blocked by: 07

## Question

按 07 的设计决策（D1–D4）落地实施：

1. **物品注册**：新增 `exp_tome`「经验手册」（category 'item'，`useEffect.heroExp: 100`）；扩展 `ItemMeta.useEffect` 类型增加 `heroExp?: number`；图标先 Lucide 回退（sprite 待补，或补配 materials/seeds 空闲格）。
2. **Context action**：GameContext 新增批量使用 action（消耗背包 `exp_tome` × N → `applyHeroExp` 加 N×100 经验；数量不足返回失败原因）。
3. **HeroDetailModal**：
   - 【升级】按钮改为消耗 1 本经验手册（0 本时禁用并提示来源）；
   - 升级按钮上方新增【批量升级】按钮 → 批量弹窗（滑条 1..持有数 + 实时预览：消耗 N 本 → 经验/等级/剩余经验/天赋点变化），交互范式对齐背包/工坊批量弹窗。
4. **掉落接入**：探险/战斗结算掉落池加入 exp_tome（梦境事件不放）。
5. **ADR-0003**：追加一行说明「经验手册为额外主动升级途径」。
6. **验证**：`npx vitest run` 全量通过；`npm run build`（tsc -b && vite build）通过；相关测试覆盖（物品注册、批量消耗、升级 UI）。

## Answer

（本 session 实施，2026-08-07，按 07 决策 D1–D4）

### 物品注册（D1）
- `ItemMeta.useEffect` 扩展 `heroExp?: number`（data/items/types.ts）。
- 新增 `exp_tome`「经验手册」（data/items/props.ts）：category 'item'，`useEffect.heroExp: 100`，图标 BookOpen（sprite 待补 → Lucide 虚线框）。

### Context action（D2）
- `state/combat.ts` 新增 `consumeExpTomesUpdate(state, heroId, count)`：消耗 exp_tome × count → `applyHeroExp` 加 count×100 经验（升级发天赋点、溢出累计）；数量不足/未知英雄 → NO_OP；每本经验读自 ITEMS_CONFIG（数据驱动）。
- `GameContext` 暴露 `levelUpWithTome(heroId, count)`（stateRef 同步模式）。

### HeroDetailModal 升级改造（D3）
- 【升级】按钮：消耗 1 本经验手册（无手册时 toast 提示来源「战斗/探险掉落可获得」），不再无消耗直升。
- 升级按钮上方新增【批量升级】按钮（显示持有手册数）→ 新组件 `ExpLevelUpModal`：滑条 0..持有数 + 实时预览（消耗 N 本 → +N×100 经验 → Lv.X→Y、剩余经验、天赋点 +Z），交互范式对齐工坊 CraftBatchModal；无手册时按钮禁用并提示。

### 掉落接入（D2）
- 3 个主线区域（废土边缘/旧城废墟/辐射车间）普通敌人 drops 加 `exp_tome`（chance 0.35）、各 BOSS drops 加（chance 0.6, 1–2 本）；测试区（军备测试场）不加；梦境事件不放（世界观一致）。

### ADR-0003
- Consequences 追加一行：经验手册为额外主动升级途径（消耗 1 本 = 100 经验，与战斗经验同经验条，升级仍发天赋点）。

### 测试（新增 8 例 + 适配 3 例）
- `combat.test.ts` +3：1 本升 1 级发 1 天赋点、2 本溢出累计、不足/未知英雄 NO_OP。
- `ExpLevelUpModal.test.tsx` +3（新文件）：滑条上限与预览、确认消耗落库、无手册禁用。
- `HeroTab.test.tsx` +1：详情页点【升级】消耗 1 本手册升级（无免费直升）。
- 适配：`idle.test.ts` 掉落 rng 序列（新增 exp_tome 掉落条目，10 场 = scrap 20/glow 20/enhance 20/exp_tome 10）；`registry.test.ts` 道具数 11→12。
- 验证：全量 `npx vitest run` → **422 passed / 42 files**；`npm run build` 通过；lint 仅 4 条 pre-existing（HeroDetailModal 3 + GameContext 1，留 13/12）。


### 修复反馈（用户验收，2026-08-07）
- **升级提示被遮挡（已修）**：`ToastSystem` 的 toast 容器与 confirm modal 从 `z-50` 提升到 `z-[11000]`（高于全部弹窗 z-[10000~10002]）——升级成功 / 批量升级 / 天赋点不足等在任何弹窗内触发的提示现在都可见。
- **设计语言不一致（已修）**：
  - HeroDetailModal「批量升级」按钮由灰色系改为琥珀系（与「升级」按钮协调）；长文案「批量升级（经验手册 ×N）」精简为「批量升级」，持有数移到 title（hover 显示），避免中列窄宽度下 truncate 截断。
  - ExpLevelUpModal 标签「消耗:」→「所需消耗:」，与工坊 CraftBatchModal 完全一致。
- 验证：全量 `npx vitest run` → **422 passed / 42 files**。
