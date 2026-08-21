# 基建升级耗时施工机制与温室扩展坞迁移

Status: accepted

## 背景

后勤基建的升级（蓄电池/发电机/回收站/产线设施升级与扩建）此前为**即时生效**：点升级 → 扣材料 → 立即应用等级，没有任何耗时设定。这使基建缺乏"施工"的经营节奏，且相关升级功能分散在工坊（温室智能扩展坞作为一次性合成配方）、基建 tab（三项 base 升级）、产线 tab（设施升级 + 扩建）三处，语义不完整。

需求：为后勤基建的升级添加耗时设定（升级中状态 + 在线/离线结算），将工坊建筑配方（温室智能扩展坞）与产线升级/扩建整合进基建系统，使基建语义完整。

## 决策

### 1. 升级耗时：时间戳驱动（非逐秒推进）

- 新增 `shelter.upgrades: Record<string, UpgradeInProgress>`，`UpgradeInProgress = { startTime: number }`（开始施工时间戳）。
- key 约定：单实例升级项 = 升级项 id（`battery`/`generator`/`recycler`/`greenhouse_dock`）；产线设施 = `` `${type}_${unitIndex}` ``（如 `smelter_0`）；扩建 = `` `expand_${type}` ``。
- 耗时配置：`UpgradeLevel.duration`（升级到该等级所需秒数）+ `FACILITY_EXPANSION.durations`（扩建第 N 台的秒数）。采用长节奏（30 分钟 ~ 48 小时）。
- 流程：
  1. 开始升级（`upgradeShelterStatUpdate`/`expandFacilityUpdate`）：校验（未施工中、未满级、材料足）→ **立即扣材料** → 写入 `upgrades[key] = { startTime }`。
  2. 完成判定（`resolveShelterUpgrades(state, now)`）：`now - startTime >= duration × 1000` 时应用等级/新增设施并移除施工条目，返回完成文本列表。
  3. 在线：`applyTick` 中升级中计入活跃系统（保证进度条每秒刷新），正常流程末尾与梦魇冻结分支调用 `resolveShelterUpgrades`，完成写 logistics 日志。
  4. 离线回归：`calculateDetailedOfflineProgress` 开头先 `resolveShelterUpgrades`（**先应用升级，再按新等级结算全程离线产出**，含 `maxOfflineDuration` 封顶用新值），完成的升级进入 `OfflineReport.completedUpgrades`（离线报告弹窗展示"基建升级完成"区块）；未完成的保留 `startTime` 继续计时。
  5. UI：升级中显示进度条（`(now - startTime) / duration`）+ 剩余时间 + 按钮禁用；升级完成后由组件检测施工条目消失弹出 toast。
- 选择时间戳驱动而非逐秒推进 `timeLeft`：升级是"到点应用"的离散事件，离线回归只需比较时间戳，无累计误差；与温室生长/产线加工（需逐秒推进的连续过程）本质不同。
- 防御：无法解析的施工条目（配置变更/存档损坏）在结算时丢弃；成本可解析时退还已扣材料（尽力而为）。

### 2. 温室智能扩展坞迁移至基建

- 从 `RECIPES_CONFIG` 删除 `greenhouse_expansion` 配方，工坊移除「建筑」分类（`WORKSHOP_CATEGORIES` 仅剩 4 类），`Recipe.special`/`category` 类型收窄。
- 基建新增 `greenhouse_dock` 升级项（2 级）：Lv1 解锁 6 槽（成本沿用原配方）、Lv2 解锁 8 槽（成本翻倍）。
- **等级由已解锁槽位推导**：`(unlockedSlotsCount - 4) / 2`，旧存档按槽位自动换算（4 槽=Lv0、6 槽=Lv1、8 槽=Lv2），无需数据迁移；升级完成应用逻辑（+2 槽、钳制 8 槽上限）从 `craftItemUpdate` 迁移至 `applyPendingUpgrade`。

### 3. 产线升级/扩建整合进基建

- 「基建」tab 统一展示所有升级：battery/generator/recycler/greenhouse_dock 单项卡 + 冶炼炉/组装台多台区块（每台升级卡 + 扩建入口，均带耗时进度条）。
- 「产线」tab 只保留队列运转管理（入队/移除/启停/驻守/生产进度），移除升级与扩建按钮（已迁移至基建 tab）。

## Considered Options

- **逐秒推进（`timeLeft` 递减，同产线加工）**：与现有 `processFacility` 模式一致，但离线结算需额外推进且易与既有离线产出耦合。否决，时间戳驱动更简单精确。
- **完成时扣材料（失败/取消可退）**：更"友好"但完成时材料可能已变化，且本游戏无取消升级。否决，开始即扣（同 Clash of Clans 等惯例）。
- **离线分段结算（升级完成点切分产出等级）**：更精确但实现复杂、边界 case 多。否决，先应用升级再按新等级结算全程（升级完成前小段产出略按新等级高估，休闲游戏可接受）。
- **扩展坞保持一次性配方**：改动最小但与"可升级设施"语义不符。否决，改为 2 级升级项。

## Consequences

- 所有基建升级（含产线设施升级/扩建、温室扩展坞）统一为耗时施工，进度跨在线/离线连续推进。
- 材料在开始升级时即扣除；施工中不可重复升级同一项，不同项可并行。
- 升级中设施继续按当前等级运转，完成后才应用新等级。
- 工坊不再有「建筑」分类；`greenhouse_expansion` 相关特殊分支从 `state/workshop.ts` 清除。
- 旧存档无需迁移：`upgrades` 缺省空表；扩展坞等级由槽位推导；产线设施等级照旧。
- 数值（`duration`）全部在 `shelterUpgrades.ts` 配置，可随时调整节奏。
