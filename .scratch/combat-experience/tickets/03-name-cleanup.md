# 03 关名前缀清洗

Type: task
Status: resolved

## 内容

U#3 方案 A：src/data/regions.ts 中 level.name 含区域名前缀的条目清洗为纯关卡名，全称由展示层 `${region.name} · ${level.name}` 派生。

## Answer（实施记录）

- regions.ts 八条 `区域名 · 关卡名` 全部清洗为纯关卡名；LevelDetailModal 标题补全称拼装（BattleModal/IdleCombatWidget 原已拼装，LevelBrowser 网格保持纯短名）。
- 两处旧全称断言翻转（regions.test / WildernessTab.test）；LevelDetailModal.test 改断言派生全称。

## 验收

grep 无「区域名 · 区域名」拼接产物；regions 相关测试通过。
