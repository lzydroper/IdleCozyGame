# 加载器与类型策略细化

Type: grilling
Status: resolved

## Question

J3 已定「resolveJsonModule + 静态 import + 断言 + 测试兜底」，本票细化到可实施：

1. tsconfig（app/node）具体开启项与类型声明；
2. loader 形态：regions 用 `import.meta.glob(eager)` 扫 NN_ 文件夹 vs 显式逐文件 import——glob 的 TS 泛型收窄方案；其余域 glob 还是显式；
3. 断言规范：`as Interface` 的使用边界、每域完整性测试 seam 的检查项（必填字段/id 唯一/引用可解析）；
4. 存档兼容显式验证：loader 层不动 GameState 的结论坐实。

前置事实：map Notes 关键事实节。

## Answer

三问全按推荐案定稿（HITL）：

- **L1 分载 = 混合制**：
  - **glob 域（开放集合，import.meta.glob eager）**：`regions/*/`（NN_ 文件夹）、`entities/heroes/*/`、`entities/enemies/*.json`、`combat/abilities/*.json`——新增实体/区域零代码改动；
  - **显式域（固定集合）**：items 五表、workshop（recipes/autoRecipes）、shelter 两表、farming/crops、events 五文件、progression 四文件——删改名即编译错；
  - glob 的 TS 收窄：loader 内统一 `as XxxRaw[]` 单点断言 + L2 守卫兜形状。
- **L2 断言强度 = 静态断言 + DEV 守卫**：loader 出口 `as Interface` 单点定型（禁止消费方散落断言）；配套 `configs/loaders/devGuard.ts` 轻量必填检查（id 非空/name 存在），仅 `import.meta.env.DEV` 执行，生产树摇零开销；不引入 zod。
- **L3 测试 seam = 五项全集**：每域一个 `<domain>.integrity.test.ts`：① id 唯一且与 key 一致 ② 引用可解析（abilityId/enemyIds/itemId/drop.itemId）③ 必填字段非空 ④ regions NN_ 文件夹名 ↔ regionInfo.id 一致 ⑤ 跨域抽查（recipes 材料 ⊆ items 等）。

**修订（用户澄清，效力高于上文 L1/L3 相应条目）：路径透明原则**
- 开放集合域的文件/文件夹命名（含 NN_ 前缀、\<enemyId\>.json 等）**仅为人类导航约定，不是加载契约**；
- loader 对路径不做任何语义解析（不拆前缀、不从文件名推导 id）；实体/区域的唯一身份 = **json 内容字段**（如 regionInfo.id）；
- L3 第 ④ 项据此作废，替换为：**「身份内容化」——校验 id 仅取自 json 内容，且跨文件重复 id 抛错**（文件名失去消歧能力后，重名防护全靠此项）；
- glob 模式形状化为 `*/regionInfo.json`、`entities/heroes/*/heroInfo.json` 等结构位匹配，不含名字假设。

**配套事实与裁决**：
1. tsconfig.app.json 追加 `"resolveJsonModule": true`（当前未开；src 现零 json import，无存量冲突）；
2. **存档兼容坐实**：types/game.ts 对 data 的唯一引用是 `FacilityType` 类型（编译期擦除，零运行时耦合）→ json 化不动 GameState schema 的结论成立；该引用在批次①切至 `configs/types/gameplay.types.ts`；
3. types→configs 方向合法化确认：类型依赖单向 state/types → configs → data(json)。
