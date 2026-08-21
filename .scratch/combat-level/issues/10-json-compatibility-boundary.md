# 10 — 全 JSON 化兼容边界

**Type:** grilling
**Status:** resolved
**Blocked by:** 01, 02

## Question

Level.md 第 4 条「为后续全 json 化做兼容」本次做到哪一步？需决议：

1. **配置只含纯数据**：禁止函数、运行时计算、跨配置 import 值（类型 import 除外）。
2. **id 稳定规则**：Level 使用区域内显式 local id（01 已定），不因数组重排变化；全局身份按需由 `regionId:levelId` 派生，配置/状态不冗余全局 id。
3. **数值字段命名与整数百分比统一**；是否引入 schema 校验（手写 type guard / zod / 仅 tsc）。
4. **是否实际迁出 TS 到 JSON 文件**，还是只保证 schema 可被未来 JSON 直接承载。

产出：JSON 兼容约束清单，供 spec 汇编。

## Answer

（由 01/02 已定决议汇总，无新增 HITL 问题。）

- **D1 纯数据**：`regions.ts` 只含纯数据 + 类型；禁止函数、运行时计算、跨配置 import 值；只允许 `import type`。
- **D2 id 稳定**：Level 使用区域内显式 local id（01 已定），不因数组重排变化；全局身份按需由 `regionId:levelId` 派生，配置/状态不冗余全局 id。
- **D3 数值与校验**：掉落数值统一整数百分比与 `DropEntry`（02 已定）；schema 校验先只靠 `tsc`，不引入 zod/手写 type guard。
- **D4 不实际迁 JSON**：本 effort 只保证 schema 可被未来 JSON 直接承载，不把 TS 数据迁成 JSON 文件（完整 JSON 化另立 effort）。