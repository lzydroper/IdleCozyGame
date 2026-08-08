# 01 修饰符数据模型形态 — 原型归档

**ticket**：`.scratch/stat-bonus-unification/issues/01-modifier-model-shape.md`
**问题**：统一加成修饰符采用什么数据形状？（候选 A `StatModifier[]` / B `ModifierMap` / C `SourceModifier[]`）

## 运行方式

双击打开 `01-modifier-model-shape.html` 即可（单文件、零依赖、状态全在内存）。

## 内容

- **三个候选 tab**：类型签名 + 同一混合场景（羁绊+装备+天赋+觉醒+buff 共 9 条修饰符）在各自形态下的写法 + 优缺点标签。
- **可交互演示**：五个来源的滑条自由调节，右侧实时输出聚合中间态与最终面板（含 clamp、元属性折算、damageReduction 派生）。切换 tab 不改变数值——三种形态表达同一份数据。
- **统一计算语义**：percent 加算；`final = (base + Σflat) × (1 + Σpercent)`；clamp 在最终级；元属性先按 statConfig 系数折算；maxHp 当前血量缩放归战斗入场快照（02 号 ticket）。

## 结论

由用户在原型上拍板（HITL）。选定后：答案写入 ticket 01 的 Answer、关闭，并在 map Decisions-so-far 追加；02/03 随之解锁。
