# combat-config-json · 批次③ 开放集合与复杂域实施

> 来源：[blueprint.md](../../config-json-migration/blueprint.md) 批次③。转换沿用「vitest 程序化导出」；开放集合域走 import.meta.glob；身份一律取 json 内容 id（路径透明）。

## 工单清单

| # | 内容 | 状态 |
|---|---|---|
| 1 | enemies glob 化：entities/enemies/\<enemyId\>.json ×13 + entities.loader（glob 归并 + devGuard）；data/enemies.ts 转 shim | ✅ |
| 2 | abilities json 化：combat/abilities/*.json ×10（description token {attackPct}/{maxHpPct}）+ combat.loader（glob + 插值器 + ABILITY_CONFIGS/BASIC_ATTACK/getAbilityConfig 出口）；data/abilities.ts 转 shim | ✅ |
| 3 | buff 数据驱动：公式词表三原子（perStack/livingEnemies + values 覆盖）+ 物化器进 buffRuntime + combat/buffs/\<buffId\>.json ×4 + BuffConfig.createEffects 退役 + 被动链统一 | ✅ |
| 4 | 英雄五文件拆分：9 × \<heroId\>/{heroInfo,duty,awaken,talent,growth}.json + heroes.loader（五 glob 归并、缺省段语义、**order 内容字段保序**）+ data/heroes.ts 转 shim；HERO_TALENTS/AWAKEN_CONFIG 出口随 loader；entityConfig.ts 类型收口 configs/types/entity.types.ts | ✅ |
| 5 | regions NN_ 重组织：每区域 {regionInfo,levels,expedition}.json + regions.loader(glob) + regionSelectors 移 src/state/ | pending |

> 实施记录（工单1/2）：转换器 scripts/convert-batch3.test.ts 完成使命后删除；glob 域 TS 收窄 = loader 内 `as` 单点断言；`Object.entries` 解构弃名防 noUnusedParameters。

## 验收口径

每张工单完成即跑 tsc + 相关测试；整批结束跑 build + 全量测试 + oxlint 三绿。
开放域验收加项：新增/改名实体或区域文件零代码改动（integrity 测试演示）。
