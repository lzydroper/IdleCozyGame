# 图标映射解耦到 GameIcon 注册表

Type: grilling
Status: claimed
Blocked by: (无)

## Question

`UPGRADE_ICONS`（`ShelterTab.tsx:47-54`）是 `Record<string, React.ReactNode>` 硬编码映射表。虽然现在从 `upgrade.icon` 查 key，但映射表本身还写在组件文件里，新增升级项需改组件代码。

**用户已决策：扩展 GameIcon 注册表**（ADR-0015 模式），与物品/英雄图标同一套机制。

需解决：

1. **GameIcon 扩展 `upgrade` 类型**：`GameIconType` 新增 `'upgrade'`，`ICON_SOURCE_REGISTRY` 新增一行 `{ source: (id) => SHELTER_UPGRADES[id], expectsSprite: ??? }`。
   - `SHELTER_UPGRADES` 的 `UpgradePath` 需要提供 `IconSource` 所需的字段（`name` / `sprite` / `icon`）。当前只有 `icon?: string`（图标标识），需改为 `icon?: LucideIcon`（同 `HEROES_CONFIG.icon`）或 `sprite?: ItemSprite`？
   - `expectsSprite`：升级项是否有 sprite 概念？物品/英雄有 spritesheet，升级项当前用 Lucide，是否也走「待补 sprite」虚线框回退？
2. **`UPGRADE_ICONS` 映射表去向**：组件内的 `UPGRADE_ICONS` 删除后，`getUpgradeIcon` 改为 `<GameIcon type="upgrade" id={upgrade.id} />`？还是保留一个瘦封装？
   - 注意：当前 `UPGRADE_ICONS` 的值是 `<Battery className="w-4 h-4 text-cyan-400" />`——带**颜色**。GameIcon 渲染的颜色由 className 传入，升级项的着色（battery 青、generator 琥珀）如何保持？是每个配置的 `icon` 自带颜色，还是由 `theme` 驱动？
3. **`icon` 字段类型**：`UpgradePath.icon` 当前是 `string`，改为 `LucideIcon`（同 `HEROES_CONFIG.icon: LucideIcon`）？这样 `SHELTER_UPGRADES` 直接存 `icon: Battery` 等，与 GameIcon 注册表兼容。
4. **`SHELTER_UPGRADES` 配置更新**：5 个升级项的 `icon` 从 `'battery'`/`'generator'` 等字符串改为实际 Lucide 图标引用。
5. **THEME_COLORS 是否一并解耦**：`THEME_COLORS`（`:57-91`）按 glow 色值（`'bg-cyan-500/30'`）查配色，是否也迁入配置（每个升级项声明自己的 iconBg/iconBorder/buttonClass）？还是保持按色值查表（当前已数据驱动，只是表在组件内）？

### 调查基线

- `GameIcon` 注册表：`GameIcon.tsx:24-32`，`ICON_SOURCE_REGISTRY`，`IconSource { name?, sprite?, icon? }`。
- `HEROES_CONFIG.icon: LucideIcon`（`heroes.ts`）——升级项可参照此模式。
- `UpgradePath.icon?: string`（`types/config.ts`）——当前为字符串标识。
- `UPGRADE_ICONS` / `THEME_COLORS` / `getUpgradeIcon` / `getTheme`：`ShelterTab.tsx:47-99`。
- 原型验证的配色：`src/components/shelter/prototype.html`（每升级项 theme.glow 不同色）。

### 约束

- 本 ticket 只产出**图标解耦设计决策**，不写实现代码。
- 需覆盖：GameIcon 扩展方案、icon 字段类型、配置更新、THEME_COLORS 去向、着色方案。

## Answer

### 1. `UpgradePath.icon` 改为 `LucideIcon` 引用

`types/config.ts` 中 `UpgradePath.icon?: string` 改为 `icon?: LucideIcon`（同 `HEROES_CONFIG.icon: LucideIcon` 模式）。`SHELTER_UPGRADES` 直接存 `icon: Battery` / `icon: Zap` / `icon: RefreshCw` 等组件引用。

理由：GameIcon 注册表 `IconSource.icon` 本就是 `LucideIcon`，零转换兼容。配置层直接存组件引用（与 HEROES_CONFIG 一致），无需中间字符串映射。

### 2. GameIcon 新增 `upgrade` 类型

`GameIconType` 新增 `'upgrade'`，`ICON_SOURCE_REGISTRY` 新增一行：

```typescript
upgrade: { source: (id) => SHELTER_UPGRADES[id], expectsSprite: false },
```

- `expectsSprite: false`（同 enemy/zone）：升级项无 spritesheet 概念，直接渲染 Lucide。
- 升级项渲染用 `<GameIcon type="upgrade" id={upgrade.id} />`。
- `SHELTER_UPGRADES` 需要 import `lucide-react` 图标组件（Battery/Zap/RefreshCw/Cpu 等）。

### 3. 着色方案：全站统一一套配色（用户决策）

- **取消每个升级项的独立配色**：`SHELTER_UPGRADES` 的 `theme?: { glow }` 字段**删除**。
- **`THEME_COLORS` 删除**：不再按 glow 色值查表。`getTheme` 返回固定一套配色（如 cyan 主题）：
  ```
  iconBg: 'bg-cyan-950/50', iconBorder: 'border-cyan-500/30',
  buttonClass: isMax ? 'bg-zinc-800/30 text-zinc-600 ...' : canAfford ? 'bg-cyan-500/10 text-cyan-400 ...' : '...'
  ```
- **升级项卡片顶部条纹统一**：`<div className="h-0.5 w-full bg-cyan-500/30" />`（固定 cyan）。
- **图标着色**：`<GameIcon type="upgrade" id={upgrade.id} className="w-4 h-4 text-cyan-400" />`（className 统一传 cyan 色）。
- **`accentText` 逻辑删除**：不再按 glow 派生 `text-cyan-400` 等，Lv 标签统一用固定色。

### 4. `UPGRADE_ICONS` / `getUpgradeIcon` 去向

- 组件内的 `UPGRADE_ICONS` 映射表**删除**。
- `getUpgradeIcon(id)` 删除，替换为 `<GameIcon type="upgrade" id={upgrade.id} />`。
- `ShelterTab` 中 `Battery`/`Zap`/`RefreshCw`/`Settings` 的 import 清理（不再直接用，改由配置引用）。

### 5. 配置更新

`SHELTER_UPGRADES` 5 个升级项更新：
- `battery`: `icon: Battery`（lucide 图标），删除 `theme`。
- `generator`: `icon: Zap`，删除 `theme`。
- `recycler`: `icon: RefreshCw`，删除 `theme`。
- `smelter`: `icon: Flame`（或现有 Cpu），删除 `theme`。
- `assembler`: `icon: Cpu`，删除 `theme`。

### 领域术语更新

- **升级项图标 (Upgrade Icon)**：基建升级项的 Lucide 图标，配置在 `SHELTER_UPGRADES.icon`（`LucideIcon` 引用），经 `GameIcon` 注册表 `upgrade` 类型统一渲染。
- **升级项配色 (Upgrade Theme)**：全站统一一套 cyan 主题，不再按升级项区分。

Status: resolved
