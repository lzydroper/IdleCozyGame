# 基建升级项信息显示优化

Type: grilling
Status: claimed
Blocked by: (无)

## Question

基建升级项卡片信息显示混乱，用户指出两个问题：

1. **「下一级消耗」多处显示**：升级按钮内（`ShelterTab.tsx:405-410`，`升级` 按钮下方以 GameIcon + qty 展示）和详情区（`:421`，`下一级消耗: ${qty}×${item}`）重复展示。
2. **消耗显示 item id 而非物品名**：详情区 `Object.entries(nextConfig.cost).map(([item, qty]) => `${qty}×${item}`).join(', ')` 显示的是 `scrap_metal` 这样的 id，不是「废旧金属」。

需解决：

1. **「下一级消耗」的展示归位**：
   - 方案 A：升级按钮只显示「升级」二字（不显示消耗），消耗统一放详情区（`下一级消耗: 废旧金属×40`）。
   - 方案 B：按钮内保留 GameIcon + qty（图形化消耗），详情区只显示效果（去掉文字消耗行）。
   - 方案 C：按钮显示「升级」+ 总材料数（如「升级 · 2种材料」），详情区显示明细。
2. **物品名 vs id**：详情区消耗显示物品名（`ITEMS_CONFIG[item]?.name || item`）而非原始 id。是否顺便用 GameIcon type="item" 图标化？
   - 参考：温室一键收割的日志已用 `ITEMS_CONFIG[id]?.name || id`（ShelterTab.tsx 中类似模式）。
3. **多材料消耗的展示**：`cost` 是 `Record<string, number>` 支持多材料。详情区如何排版多材料？（`废旧金属×40 · 合金板×5` 换行还是列表？）
4. **「下一级」效果预览**：按钮内现有 `下一级: {nextConfig.effectText}`（`:412-414`），是否保留？还是只放详情区？
5. **锁定升级的展示**：`unlockRequirements` 未满足时（当前被 filter 隐藏，`:340-350`），是否应显示为「锁定」卡片（带解锁条件提示，如原型）？还是继续隐藏？

### 调查基线

- 升级卡片结构：`ShelterTab.tsx:364-424`（标题栏 + 升级按钮 + 详情区）。
- 消耗显示：按钮内 `:405-410`（GameIcon+qty）、详情区 `:421`（`${qty}×${item}`）。
- 解锁过滤：`:340-350`（unlockRequirements.every 过滤，未满足隐藏）。
- `ITEMS_CONFIG[id].name`：物品名单一真相源（ADR-0015）。
- 原型：`src/components/shelter/prototype.html`（详情区显示「下一级消耗 废铁 ×40」+「当前效果」；锁定升级显示解锁条件）。

### 约束

- 本 ticket 只产出**信息显示设计决策**，不写实现代码。
- 需覆盖：消耗归位、物品名、多材料排版、效果预览、锁定展示。

## Answer

### 1. 「下一级消耗」归位：按钮只显示「升级」（用户决策）

- **升级按钮**只显示「升级」二字（或满级时「已满级 / MAX」），**不再内嵌消耗图标**（GameIcon + qty 从按钮内移除，`:405-410`）。
- **详情区**统一显示消耗明细：「下一级消耗：废旧金属×40」（`:421`）。
- 按钮简洁，消耗信息集中一处，消除重复。

### 2. 消耗显示物品名而非 id

- 详情区消耗从 `${qty}×${item}`（item 为 id）改为 `ITEMS_CONFIG[item]?.name || item`：
  ```
  {Object.entries(nextConfig.cost).map(([item, qty]) => `${ITEMS_CONFIG[item]?.name || item}×${qty}`).join(' · ')}
  ```
- 多材料用「 · 」分隔（如 `废旧金属×40 · 合金板×5`）。
- 参照温室一键收割日志的 `ITEMS_CONFIG[id]?.name || id` 模式。

### 3. 多材料排版

- 消耗明细在详情区单行用「 · 」连接（材料数通常 ≤3，单行可容）。
- 若未来材料数多（≥4），可改为换行列表。当前 `Record<string, number>` 的 key 数有限，单行足够。

### 4. 「下一级」效果预览

- 按钮内现有 `下一级: {nextConfig.effectText}`（`:412-414`）**移除**（按钮只显「升级」）。
- 效果预览统一放详情区：「当前效果：X」+「下一级：Y」（与原型一致）。
- 详情区结构：
  ```
  当前效果  {currentConfig.effectText}
  下一级    {nextConfig.effectText}
  下一级消耗  {废旧金属×40 · 合金板×5}
  ```

### 5. 锁定升级：继续隐藏（用户决策）

- 未满足 `unlockRequirements` 的升级项**继续隐藏**（保持当前 filter 实现 `:340-350`）。
- 不显示锁定卡片。理由：用户决策保持简洁，隐藏未解锁内容。
- 未来若需引导玩家发现隐藏升级，可再引入锁定卡片，本次不做。

### 领域术语更新

- **升级消耗明细 (Upgrade Cost Detail)**：详情区统一展示的下一级材料消耗，用物品名（`ITEMS_CONFIG.name`）而非 id，多材料「 · 」分隔。

Status: resolved
