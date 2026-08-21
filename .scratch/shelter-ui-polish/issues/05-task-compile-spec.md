# 汇编后勤页面 UI 打磨规范 spec

Type: task
Status: claimed
Blocked by: 01, 02, 03, 04

## Question

在 4 个决策 ticket 全部解析后，汇编《后勤页面 UI 打磨规范》至 `spec.md`。

spec 需包含：

1. **用户故事**：覆盖图标解耦、弹窗指派交互、基建信息显示、远征未派遣 UI 等场景。
2. **实现决策**：
   - 图标解耦（ticket 01）：GameIcon 扩展 upgrade 类型、icon 字段类型、配置更新、THEME_COLORS 去向。
   - 弹窗指派（ticket 02）：DutyAssignModal 组件设计、过滤条件、三处接入。
   - 基建信息（ticket 03）：消耗归位、物品名、多材料排版、锁定展示。
   - 远征未派遣（ticket 04）：卡片结构、探索员选择、地点选择、派遣流程。
3. **测试策略**：组件测试（DutyAssignModal 弹窗、远征未派遣、基建升级卡）。
4. **实施前核对清单**：UPGRADE_ICONS/THEME_COLORS 删除、SHELTER_UPGRADES 配置更新、三处指派接入点。

### 依赖

- Blocked by 01-04 全部解析。
- 汇编时调用 `to-spec` skill。

### 约束

- 本 ticket 产出 `spec.md`，Status: ready-for-agent。
- 地图完成标志：spec 定稿、用户审阅。

## Answer

《后勤页面 UI 打磨规范》已汇编至 `spec.md`（Status: ready-for-agent），包含：
- 15 条用户故事（图标解耦 / 统一指派弹窗 / 基建信息显示 / 远征未派遣 4 组）
- 5 节实现决策（图标解耦 / DutyAssignModal / 基建信息 / 远征重构 / 数据文件变更清单）
- 测试 seam（DutyAssignModal / ShelterTab / FacilityCard）+ 测试适配
- Out of Scope（锁定卡片 / 弹窗抽象 / 其他 tab 选择器）
- Further Notes（原型引用 / DutyAssignModal 放置位置）

**地图完成，待用户审阅 spec 后进入实施 effort。**

Status: resolved
