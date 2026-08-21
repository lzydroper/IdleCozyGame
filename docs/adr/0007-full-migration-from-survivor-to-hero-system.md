# 废除幸存者系统，全面升级转向英雄系统与设施驻守

Status: superseded（被 ADR-0018 覆盖：logisticsFacilityId 改为结构化对象 DutyAssignment，设施驻守机制完整实现）

废除旧有的幸存者 (Survivor) 系统，将所有角色统一重构为英雄 (Hero) 实体。同时将英雄定位扩展至“工厂设施后勤驻守 (Facility Duty)”。

## Considered Options

- **双轨制 (幸存者 + 英雄)**：保留幸存者进行后勤，英雄负责战斗。否决：两套角色体系增加维护成本，角色身份割裂。
- **纯自动设施无驻守**：设施纯自动化运作。否决：无法体现英雄的非战斗价值与后勤 Meta 属性差异。
- **单轨英雄制 + 设施驻守 (选中方案)**：所有 9 位角色统称为 Hero。每台工厂设施可驻守 1 名英雄，提供专属后勤 Meta 属性加成（加速、增产、省料等）。

## Consequences

- 不处理旧版 Survivor 存档结构，全新 Schema 数据落地。
- 英雄状态增加 `logisticsFacilityId`。驻守设施中的英雄标示为“后勤中”，不可同时选入 3 人战斗小队上阵。
