# 16 — 废除 Survivor 并支持英雄设施后勤驻守与 Supabase SQL 留档

**What to build:**
彻底从代码库与状态中移除 Survivor 系统，将原有角色统称为 Hero。实现英雄工厂设施后勤驻守（Facility Duty）功能，单台机器最多驻守 1 人，激活英雄独有的后勤 Meta 属性（加速运行、增大产出量、降低原料消耗等）。同时新建 PostgreSQL / Supabase 本地数据库留档文件 `supabase/schema.sql`。

**Blocked by:** 15a — 三层属性基础数据模型与元属性加成映射引擎.

**Status:** resolved

- [x] 从 `GameState` 与组件中移除 `survivors` 结构，增加 `HeroState.logisticsFacilityId`
- [x] 为 HeroConfig 增加后勤 Meta 属性定义，在设施生产循环中应用速度与产出加成
- [x] 新建并归档 `supabase/schema.sql` Supabase 建表文件

