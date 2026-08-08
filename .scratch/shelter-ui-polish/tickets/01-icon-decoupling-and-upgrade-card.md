# 01 - 图标解耦到 GameIcon 注册表 + 基建升级卡信息显示

**What to build:** 将基建升级项图标从组件内硬编码（`UPGRADE_ICONS`/`THEME_COLORS`/`getUpgradeIcon`）解耦到 GameIcon 注册表：`UpgradePath.icon` 改 `LucideIcon` 引用、GameIcon 新增 `upgrade` 类型、全站统一 cyan 配色；同时优化升级卡信息显示——升级按钮只显「升级」、消耗明细放详情区并显示物品名。

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] `types/config.ts`：`UpgradePath.icon?: string` → `icon?: LucideIcon`；删除 `theme` 字段
- [ ] `GameIcon.tsx`：`GameIconType` 新增 `'upgrade'`，`ICON_SOURCE_REGISTRY` 新增 `{ source: (id) => SHELTER_UPGRADES[id], expectsSprite: false }`
- [ ] `SHELTER_UPGRADES`：5 个升级项 `icon` 改 Lucide 引用（Battery/Zap/RefreshCw/Flame/Cpu），删除 `theme`
- [ ] `ShelterTab.tsx`：删除 `UPGRADE_ICONS`/`THEME_COLORS`/`getUpgradeIcon`/`accentText`；`getTheme` 返回固定 cyan 配色；图标改 `<GameIcon type="upgrade" id={upgrade.id} className="w-4 h-4 text-cyan-400" />`；顶部条纹固定 `bg-cyan-500/30`；清理 `Battery`/`Zap`/`RefreshCw`/`Settings` 直接 import
- [ ] 升级按钮只显「升级」（移除内嵌 GameIcon + qty）
- [ ] 详情区统一显示：当前效果 / 下一级效果 / 下一级消耗（`ITEMS_CONFIG[item]?.name || item`，多材料「 · 」分隔）
- [ ] 未解锁升级项继续隐藏（保持 filter 逻辑）
- [ ] 测试：`ShelterTab.test.tsx` 基建 tab 断言适配（升级按钮文案、消耗物品名）
