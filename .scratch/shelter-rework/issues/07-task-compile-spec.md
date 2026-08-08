# 汇编后勤模块改造规范 spec

Type: task
Status: claimed
Blocked by: 01, 02, 03, 04, 05

## Question

在前述 5 个决策 ticket 全部解析后，汇编《后勤模块改造规范》至 `spec.md`。

spec 需包含：

1. **用户故事**：覆盖分 tab 交互、设施驻守指派 / 解除、远征派遣 / 召回、浇水托管、基建升级、硬编码清理等场景。
2. **实现决策**：
   - 指派统一模型（T1）：字段格式、setter、排他性、迁移。
   - 远征重设计（T2）：地点数据模型、职业判定迁移、加成、口粮、UI。
   - 分 tab 结构（T3）：tab 列表、组件复用、布局、设计语言、日志移除。
   - dutyMeta 接入（T4）：三字段公式、加成聚合、驻守 UI、多设施语义。
   - 硬编码清理（T5）：8 类硬编码的处理方案。
3. **测试策略**：state 层（指派迁移、产线加成、远征结算）、UI 层（分 tab、驻守指派、远征 UI）、迁移 seam。
4. **实施前核对清单**：存档兼容、ADR 更新（覆盖 ADR-0007 的半成品状态）、数据文件变更清单。

### 依赖

- Blocked by T1-T5 全部解析。
- 汇编时调用 `to-spec` skill。

### 约束

- 本 ticket 产出 `spec.md`，Status: ready-for-agent。
- 地图完成标志：spec 定稿、用户审阅。

## Answer

《后勤模块改造规范》已汇编至 `spec.md`（Status: ready-for-agent），包含：
- 28 条用户故事（分 tab 架构 / 基建 / 温室 / 产线 / 远征 / 指派统一 6 组）
- 7 节实现决策（指派统一模型 / 远征重设计 / 分 tab 结构 / dutyMeta 接入 / 硬编码清理 / 数据文件变更清单 / ADR 更新）
- 3 个测试 seam（state 层 / UI 层 / 迁移 seam）+ 测试适配清单
- Out of Scope（SURVIVORS_CONFIG 保留 / 温室基建不重设计 / 不新增内容 / 不迁移旧存档）
- Further Notes（ADR 更新 / 口粮数值待定 / 掉落表核对 / dutyMeta 评估）

**地图完成，待用户审阅 spec 后进入实施 effort。**

Status: resolved
