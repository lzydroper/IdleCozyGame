# 02 — 驻守加成与批量扣料的语义

Type: grilling

Status: resolved

Blocked by: None — can start immediately

## Question

"开始扣全部材料"（扣 `targetCount × 每批成本`）与现有**驻守英雄加成**（`dutyMeta`：`speedMultiplier` 速度 / `yieldMultiplier` 产量 / `costReduction` 原料减免）之间存在张力，精确语义是什么？

需要决策的子问题：

1. **产量加成（yieldMultiplier）**：当前 `processFacility` 每批产出 `floor(reward × (1 + yieldMult))`。新模型下：
   - a) 加成提高每批产出，实际产出可能**超过目标数量**（如目标 100 个、加成后每批产 2 个 → 50 批就完成 100 个）——"目标数量"是"批次数"还是"产出物数量"？
   - b) 加成只缩短完成时间（并入速度），产量恒等于目标——与"开始扣全部材料"自洽，但弱化了产量加成的存在意义？
   - 必须二选一或给出混合方案。
2. **原料减免（costReduction）**：扣料时按 `max(1, floor(成本 × (1 - costReduction)))` 打折扣除；中断退款时按**折扣后的成本**退还（否则玩家白赚差价）。确认这一点。
3. **速度加成（speedMultiplier）**：批次耗时缩短，计时模型（见 01）必须能表达变动的批次耗时——这影响 01 的计时方案选择。
4. **"目标数量"的语义统一**：滑条上玩家选的是"生产 N 个产物"还是"生产 N 批"？若产量加成存在，"产出数量"与"批次数"脱钩，UI 和退款计算必须统一口径。

## Context

- 加成来源：`resolveDutyBonus`（`facility.ts`）反查驻守英雄的 `dutyMeta`；现有公式见 `processFacility`（速度乘算、产量 floor、原料 max(1, floor)）。
- 用户已拍板：开始扣全部材料；中断退还未开始 + 进行中批次（按已扣口径退）。

## Resolution

**决议（用户拍板）**：

1. **口径**：确认 01 的**批次口径**——`targetCount` = 批次数；滑条上限 = `floor(材料库存 / 每批折扣成本)` 批次数（按驻守加成折扣后成本计算）。
2. **产量加成（yieldMultiplier）**：沿用现有公式 `每批产出 = floor(reward × (1 + yieldMult))`，**不做余数累计**。已知局限并被接受：对 reward=1 且 yield<1 的配方（如合金板×1、+20% 加成）每批仍产 1 个，加成被向下取整吞掉；对 reward≥2 或加成≥100% 时生效。若未来要修复需改为小数余数累计（超出本 effort 范围，见 map Out of scope）。
3. **原料减免（costReduction）**：扣料与退款均按折扣价 `max(1, floor(qty × (1 - costReduction)))` 计算（确认 01），玩家不因退款赚差价。
4. **速度加成（speedMultiplier）**：批次耗时 = `getActualDuration(recipeId, level, speedMult)`（现有公式），`timeLeft` 逐秒推进天然支持速度变化（确认 01）。
5. **UI 展示**：任务卡显示"每批产出 M 个（含驻守加成）"与"预计总产出 = targetCount × M"；滑条以批次为单位。
