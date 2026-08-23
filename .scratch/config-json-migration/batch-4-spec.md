# config-json-migration · 批次④ 收尾实施记录

> 来源：[blueprint.md](blueprint.md) 批次④。本批为终态收口：**src/data 下仅存在 .json**。

## 工单清单

| # | 内容 | 状态 |
|---|---|---|
| 4.1 | configs/seed/initialState.ts 归位；data/initialState.ts 转发 shim 删除，消费方直连 seed | ✅ |
| 4.2 | data/*.ts 残留清零：20 个转发 shim 删除 + items/registry.test 迁 configs/loaders/items.registry.test.ts | ✅ |
| 4.3 | 终检 grep（data 引用仅剩 loaders 与 json）+ AGENTS.md 架构描述同步 | ✅ |

## 实施记录（4.2 存量扫尾，符号级 codemod）

- **前置类型真相补口**（shim 内残留的类型定义收口后才能删）：
  - `AwakenConfig` → configs/types/entity.types.ts；
  - `TalentGate`/`TalentNodeConfig` → configs/types/progression.types.ts；
  - loader 反向依赖修正：entities.loader（awakening/talents/survivors 三 type import）、progression.loader（talents/bonds 两 type import）全部改指 configs/types；
  - `isFacilityType` 新家 = shelter.loader（设施装配域内断言，与 FACILITIES_CONFIG 同源）。
- **equipment.ts 非纯 shim**——仍持有 EQUIPMENT_SETS/EQUIPMENT_CONFIG 实体数据。处置：
  - `data/equipment/{equipmentSets,equipment}.json` ×2（键=身份，内容含 id 双写）；
  - 新建 configs/loaders/equipment.loader.ts（devGuardTable + EQUIPMENT_LIST 派生）；
  - 类型早已在 equipment.types.ts（批次④预铺），常量段在 equipmentConstants.ts。
- **codemod**（`.scratch/config-json-migration/codemod-shims.ps1`）：符号→新家路由表
  （值→loaders/constants/state、类型→configs/types），多行 import 解析、逐文件按
  target×kind 合并为最少语句、相对路径 GetRelativePath 计算。**rewritten=107**，
  未知符号即中止（零静默改写）。scripts/convert-survivors.test.ts 为使命完结的
  一次性转换器，按其自述头删除。
- **终态验证**：src/data = **107 文件全 .json**；旧 shim 引用面 grep 归零；
  tsc -b ✓ · build ✓ · vitest **741/741** ✓（少 1 = 废弃转换器自测删除）· oxlint **0 errors**
  （6 warnings 均为存量 fast-refresh/exhaustive-deps/未用 catch，与本批无关）。

## 终态口径达成确认

- [x] data 仅 json，身份取 json 内容字段（路径透明）
- [x] configs 七类职责目录就位（types/constants/loaders/mappings/seed）
- [x] 消费方只经 loaders/constants/types 取配置，绝不直读 json
- [x] 全量三绿 + AGENTS.md 同步
