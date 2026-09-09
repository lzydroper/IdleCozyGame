/**
 * 内容侧 Sheet：物品四表 / 工坊配方 / 农田作物 / 避难所设施与基建 / 装备两表。
 * 依据 docs/config-guide.md §5、§6、§10 与各域 types。
 */
import { EQUIPMENT_SLOTS, FACTIONS, ITEM_CATEGORIES } from '../enums';
import { f } from '../builders';
import type { Field, Issue, SheetDef } from '../types';
import { abilityObjectFields, numberMap, unlockRequirementField, upgradeLevelRow } from './shared';

// === 物品行（§6） ===

const itemFields = (): Field[] => [
  f.string('id', 'id', { required: true }),
  f.string('name', '名称', { required: true }),
  f.string('description', '描述', { multiline: true, required: true }),
  f.icon('icon', '图标（切图路径或 iconKey）', { required: true }),
  f.object(
    'useEffect',
    '使用效果 useEffect',
    [
      f.map('stats', '属性恢复', { kind: 'number', label: '数值' }, { keyLabel: 'food / energy / sanity' }),
      f.number('pollution', '污染变化 pollution'),
      f.map('capsuleCharge', '胶囊充能', { kind: 'number', label: '次数' }, { keyLabel: '胶囊物品', keyCatalog: 'item' }),
      f.number('heroExp', '英雄经验 heroExp', { int: true })
    ]
  )
];

const newRowItem = (): Record<string, unknown> => ({ id: '', name: '', description: '', icon: '' });

export const itemsSheets: SheetDef[] = [
  {
    pattern: /^src\/data\/items\/resources\.json$/,
    domain: '物品',
    title: '资源 materials',
    mode: { form: 'rows', rowFields: itemFields(), newRow: newRowItem },
    notes: ['样板行数组形态；category=resource 由分表默认注入，勿显式写。']
  },
  {
    pattern: /^src\/data\/items\/consumables\.json$/,
    domain: '物品',
    title: '消耗品 consumables',
    mode: { form: 'keyedRows', rowFields: itemFields(), newRow: newRowItem },
    notes: ['键控 map 形态；key 必须等于行内 id。category=item 默认注入。']
  },
  {
    pattern: /^src\/data\/items\/shards\.json$/,
    domain: '物品',
    title: '通用碎片 shards',
    mode: { form: 'keyedRows', rowFields: itemFields(), newRow: newRowItem },
    notes: ['仅放通用碎片（奥术星体/共鸣碎片）；英雄灵魂碎片 shard_<heroId> 由 loader 自动派生，勿手写。']
  },
  {
    pattern: /^src\/data\/items\/equipmentItems\.json$/,
    domain: '物品',
    title: '装备独立物品 equipmentItems',
    mode: { form: 'keyedRows', rowFields: itemFields(), newRow: newRowItem },
    notes: ['仅强化魔晶/图纸等独立物品；12 件系列装备背包条目由 loader 自动派生，勿手写。']
  }
];

// === 工坊配方（§10） ===

const recipeFields = (auto: boolean): Field[] => [
  f.string('id', '配方 id', { required: true }),
  numberMap('cost', '材料消耗 cost', '物品', 'item', true),
  numberMap('reward', '产出 reward', '物品', 'item', true),
  f.number('energyCost', '魔能消耗/批 energyCost（不吃驻守折扣）', { int: true, min: 0 }),
  f.enum('special', '特殊标记 special', ['capsule_charge']),
  f.ref('capsuleTarget', '充能目标胶囊 capsuleTarget', 'item'),
  f.number('capsuleAmount', '充能数量 capsuleAmount', { int: true, min: 1 }),
  f.ref('blueprintId', '前置图纸 blueprintId', 'item'),
  f.string('description', '兜底描述 description（无 reward 建筑类用）', { multiline: true }),
  ...(auto
    ? [f.number('duration', '生产耗时 duration（秒）', { required: true, int: true, min: 1 }), f.ref('facilityId', '所属设施 facilityId', 'facility', { required: true })]
    : [f.ref('facilityId', '所属设施 facilityId', 'facility')]),
  f.enum('category', '分类覆盖 category', [...ITEM_CATEGORIES]),
  f.string('displayName', '兜底显示名 displayName')
];

export const workshopSheets: SheetDef[] = [
  {
    pattern: /^src\/data\/workshop\/recipes\.json$/,
    domain: '工坊',
    title: '手动配方 recipes',
    mode: {
      form: 'keyedRows',
      rowFields: recipeFields(false),
      newRow: () => ({ id: '', cost: {}, reward: {} })
    },
    notes: ['键控 map 形态。name/description 已删除——显示文案从产物推导。']
  },
  {
    pattern: /^src\/data\/workshop\/autoRecipes\.json$/,
    domain: '工坊',
    title: '自动配方 autoRecipes',
    mode: {
      form: 'keyedRows',
      rowFields: recipeFields(true),
      newRow: () => ({ id: '', cost: {}, reward: {}, duration: 30, facilityId: '' })
    },
    notes: ['手动字段之外必须带 duration（秒）与 facilityId；取消同价退还魔能。']
  }
];

// === 农田作物 ===

export const farmingSheets: SheetDef[] = [
  {
    pattern: /^src\/data\/farming\/crops\.json$/,
    domain: '农田',
    title: '作物 crops',
    mode: {
      form: 'keyedRows',
      rowFields: [
        f.string('id', '作物 id', { required: true }),
        f.string('name', '名称', { required: true }),
        f.number('growthTime', '生长时间 growthTime（秒）', { required: true, int: true, min: 1 }),
        numberMap('yields', '收获产出 yields', '物品', 'item'),
        numberMap('seedCost', '种子成本 seedCost', '种子物品', 'item'),
        f.string('description', '描述', { multiline: true, required: true })
      ],
      newRow: () => ({ id: '', name: '', growthTime: 60, yields: {}, seedCost: {}, description: '' })
    }
  }
];

// === 避难所设施 / 基建升级（§10） ===

const levelsField = (required: boolean): Field =>
  f.array('levels', '等级表 levels（level 1 为初始档）', f.object('', '等级档', upgradeLevelRow()), { required, addLabel: '+ 等级档' });

const facilityFields = (): Field[] => [
  f.string('id', '设施 id（FacilityType 单一真相源）', { required: true }),
  f.string('name', '名称', { required: true }),
  f.string('shortName', '短标签 shortName（徽章等紧凑场景）'),
  f.string('description', '描述', { multiline: true }),
  f.icon('icon', '图标', { required: true }),
  f.string('effectLabel', '升级效果标签 effectLabel', { required: true }),
  levelsField(true),
  f.object(
    'expansion',
    '扩建 expansion',
    [
      f.number('maxUnits', '最大台数 maxUnits', { required: true, int: true, min: 1 }),
      f.array('costs', '逐台费用 costs[i] = 第 i+2 台费用', numberMap('', '', '物品', 'item'), { required: true, addLabel: '+ 台位费用' }),
      f.array('durations', '逐台施工耗时 durations（秒）', { kind: 'number', label: '秒', int: true }, { required: true, addLabel: '+ 台位耗时' })
    ],
    { required: true }
  ),
  f.array('unlockRequirements', '解锁条件', unlockRequirementField(), { addLabel: '+ 条件' })
];

const upgradePathFields = (): Field[] => [
  f.string('id', '升级项 id', { required: true }),
  f.string('name', '名称', { required: true }),
  f.string('description', '描述', { multiline: true, required: true }),
  f.enum('category', '类别 category', ['base', 'facility'], { required: true }),
  f.string('effectLabel', '效果标签 effectLabel', { required: true }),
  f.icon('icon', '图标'),
  f.array('unlockRequirements', '解锁条件', unlockRequirementField(), { addLabel: '+ 条件' }),
  levelsField(true)
];

export const shelterSheets: SheetDef[] = [
  {
    pattern: /^src\/data\/shelter\/facilities\.json$/,
    domain: '避难所',
    title: '生产设施 facilities',
    mode: {
      form: 'keyedRows',
      rowFields: facilityFields(),
      newRow: () => ({ id: '', name: '', icon: '', effectLabel: '', levels: [], expansion: { maxUnits: 2, costs: [], durations: [] } })
    },
    notes: ['⚠️ 必须保持键控 map 形态——FacilityType 由键集自动派生，转数组会编译报错。新设备零代码改动。'],
    sheetRules: (doc, path): Issue[] =>
      Array.isArray(doc) ? [{ level: 'error', path, loc: '', message: 'facilities.json 必须保持键控 map 形态（FacilityType 由键集派生），不能改为数组' }] : []
  },
  {
    pattern: /^src\/data\/shelter\/shelterUpgrades\.json$/,
    domain: '避难所',
    title: '全局基建 shelterUpgrades',
    mode: {
      form: 'keyedRows',
      rowFields: upgradePathFields(),
      newRow: () => ({ id: '', name: '', description: '', category: 'base', effectLabel: '', levels: [] })
    },
    notes: ['⚠️ 仅数值可改：battery/generator/recycler/greenhouse_dock 四类的状态字段与效果应用为硬编码；新增全局升级种类需改代码。']
  }
];

// === 装备（§5） ===

const setTierItem = (): Field =>
  f.object('', '档位', [
    f.number('threshold', '阈值 threshold（系列穿戴装备强化总和）', { required: true, int: true, min: 1 }),
    f.statModList('bonus', '加成 bonus（百分比，战斗内生效）', { required: true })
  ]);

// 套装被动（heroes-skills 工单 06）：三槽穿齐同系列才出现，一套至多一条；
// abilityId 与内联 ability 二选一（loader devGuard 强制互斥）；数值随最低强化线性成长。
const setPassiveItem = (): Field =>
  f.object('', '套装被动', [
    f.string('id', '被动 id', { required: true }),
    f.ref('abilityId', '引用全局能力 abilityId（与内联 ability 二选一）', 'ability'),
    f.object('ability', '内联被动本体 ability（与 abilityId 二选一，activation 须为 passive）', abilityObjectFields({ idRequired: false })),
    f.number('enhanceGrowth', '强度系数 enhanceGrowth：S = 1 + n × min(三件强化)')
  ]);

export const equipmentSheets: SheetDef[] = [
  {
    pattern: /^src\/data\/equipment\/equipmentSets\.json$/,
    domain: '装备',
    title: '套装系列 equipmentSets',
    mode: {
      form: 'keyedRows',
      rowFields: [
        f.string('id', '系列 id', { required: true }),
        f.string('name', '系列名', { required: true }),
        f.enum('faction', '阵营 faction', [...FACTIONS], { required: true }),
        f.string('factionLabel', '阵营展示 Label factionLabel', { required: true }),
        f.array('tierEffects', '特效档位 tierEffects', setTierItem(), { required: true, addLabel: '+ 档位' }),
        f.statModList('mythicAffix', '神话通用词条 mythicAffix'),
        f.array('passiveSkills', '套装被动 passiveSkills（至多一条，穿齐三件生效）', setPassiveItem(), { addLabel: '+ 套装被动' })
      ],
      newRow: () => ({ id: '', name: '', faction: '', factionLabel: '', tierEffects: [], mythicAffix: [] })
    },
    notes: ['套装被动走 abilityPassive 触发管线；纯数值加成请继续走 tierEffects/mythicAffix。']
  },
  {
    pattern: /^src\/data\/equipment\/equipment\.json$/,
    domain: '装备',
    title: '装备表 equipment（12 槽位）',
    mode: {
      form: 'keyedRows',
      rowFields: [
        f.string('id', '装备 id', { required: true }),
        f.string('name', '名称', { required: true }),
        f.string('mythicName', '神话锻造后名称 mythicName', { required: true }),
        f.enum('slot', '槽位 slot', [...EQUIPMENT_SLOTS], { required: true }),
        f.ref('set', '所属系列 set', 'equipmentSet', { required: true }),
        f.enum('faction', '阵营 faction（同阵营英雄穿戴 +30% 基础加成）', [...FACTIONS], { required: true }),
        f.statModList('baseStats', '0 强化属性 baseStats（flat）', { required: true }),
        f.statModList('statPerEnhance', '每 +1 强化 statPerEnhance（flat）', { required: true }),
        f.enum('source', '获取途径 source', ['workshop', 'blueprint', 'dreamscape', 'boss'], { required: true }),
        f.ref('blueprintId', '图纸物品 blueprintId', 'item'),
        f.string('description', '描述', { multiline: true, required: true }),
        f.icon('icon', '图标（iconKey，惯用 sword/shield/gem）')
      ],
      newRow: () => ({
        id: '',
        name: '',
        mythicName: '',
        slot: 'weapon',
        set: '',
        faction: '',
        baseStats: [],
        statPerEnhance: [],
        source: 'workshop',
        description: '',
        icon: 'sword'
      })
    },
    sheetRules: (doc, path): Issue[] => {
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [];
      const out: Issue[] = [];
      for (const [k, row] of Object.entries(doc)) {
        if (row && typeof row === 'object' && !Array.isArray(row)) {
          const r = row as Record<string, unknown>;
          if (r.source === 'blueprint' && !r.blueprintId) {
            out.push({ level: 'error', path, loc: `rows["${k}"]`, message: 'source="blueprint" 时 blueprintId 必配' });
          }
        }
      }
      return out;
    }
  }
];
