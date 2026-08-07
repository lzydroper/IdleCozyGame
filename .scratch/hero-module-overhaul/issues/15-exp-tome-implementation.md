# 经验手册与升级改造实施

Status: open
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
