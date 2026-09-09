# icon key 化规范

Type: grilling
Status: resolved

## Question

LucideIcon 组件引用共约 8 处（facilities/items×4/shelterUpgrades/workshopCategories/heroes/entityConfig 类型）。拍板：

1. **iconKey 词表**：字符串命名规范（如 'flame' | 'cpu' | …），与 GameIcon 现有 type/id 体系的关系（复用还是并行）；
2. **映射表形态**：configs/mappings/iconMap.ts 的导出形状与兜底策略（未知 key → 缺省图标）;
3. **SLOT_FALLBACK_ICONS** 等 items 内部映射表的归属；
4. 迁移面清单核对（以 01 号映射表为准）。

## Answer

三问全按推荐案定稿（HITL）：

- **K1 消费方式 = loader 装配注入**：json 只存 `iconKey` 字符串；各域 loader 装配时查 `iconMap` 把真实 LucideIcon 写回对象的 `icon` 字段。渲染点（GameIcon 'upgrade' 源、FacilityCard:337、WorkshopCategoryBar:16 等）**零改动**。
- **K2 key 规范 = kebab-case 显式注册**：key 即 lucide 官方名 kebab-case（'cooking-pot' / 'heart-pulse'）；`configs/mappings/iconMap.ts` 以 named-import 显式注册（tree-shaking 友好），导出 `ICON_MAP` + `iconFor(key): LucideIcon` + `type IconKey = keyof typeof ICON_MAP`。
- **K3 兜底 = DEV warn + HelpCircle 回退**（生产静默不崩）；**GameIcon 现有 sprite/lucide 双轨体系不动**，两套并行不合并。
- **SLOT_FALLBACK_ICONS 归属**：迁入 iconMap.ts 同文件（slot → 缺省 IconKey 表），渲染统一走 `iconFor` 解析，映射层职责单一。
- 迁移面核对：entityConfig.types 的 `icon?: LucideIcon` 改 `iconKey?: IconKey`；json 侧全部存 key；注入仅发生于各域 loader。
