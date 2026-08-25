/**
 * 世界侧 Sheet：区域三件套（regionInfo/levels/expedition）/ 事件域七类 + 顺序表 + 救援。
 * 依据 docs/config-guide.md §7、§8 与 region.types / event.types。
 */
import { FACTIONS, HERO_CLASSES } from '../enums';
import { f } from '../builders';
import type { Field, Issue, JsonValue, SheetDef } from '../types';
import { dropListField, dreamChoiceField, realityChoiceField } from './shared';

// === 区域（§7） ===

const regionUnlockItem = (): Field =>
  f.union(
    '',
    '前置条件',
    'type',
    {
      regionExplored: [f.ref('regionId', '前置区域 regionId', 'region', { required: true }), f.number('percent', '探索度 percent（%）', { required: true, int: true, min: 0 })],
      levelCleared: [
        f.ref('regionId', '前置区域 regionId', 'region', { required: true }),
        f.ref('levelId', '前置关卡 levelId', 'level', { required: true })
      ],
      itemHeld: [f.ref('itemId', '持有物品 itemId', 'item', { required: true }), f.number('count', '数量 count', { required: true, int: true, min: 1 })]
    },
    {
      variantLabels: { regionExplored: '区域探索度', levelCleared: '通关关卡', itemHeld: '持有物品' },
      variantDefaults: {
        regionExplored: () => ({ type: 'regionExplored', regionId: '', percent: 100 }),
        levelCleared: () => ({ type: 'levelCleared', regionId: '', levelId: '' }),
        itemHeld: () => ({ type: 'itemHeld', itemId: '', count: 1 })
      },
      addLabel: '+ 前置'
    }
  );

const regionInfoFields = (): Field[] => [
  f.string('id', '区域 id', { required: true }),
  f.string('name', '名称', { required: true }),
  f.string('description', '描述', { multiline: true, required: true }),
  f.number('order', '主线顺序 order（isTestZone 排除）', { required: true, int: true }),
  f.number('recommendedLevel', '推荐等级 recommendedLevel', { required: true, int: true }),
  f.icon('icon', '图标 icon（Lucide key）'),
  f.refList('enemyPool', '敌人池 enemyPool', 'enemy', { help: 'levels.enemies 必须是本池子集' }),
  f.refList('explorationEvents', '探索事件池 explorationEvents', 'realityEvent'),
  f.number('explorationStepsToClear', '探索 100% 目标步数（测试区可为 0）', { required: true, int: true, min: 0 }),
  f.array(
    'explorationMilestones',
    '探索里程碑 explorationMilestones',
    f.object('', '里程碑', [
      f.number('atPercent', '进度 atPercent（%）', { required: true, int: true, min: 0 }),
      f.ref('eventId', '触发事件 eventId', 'realityEvent', { required: true })
    ]),
    { required: true, addLabel: '+ 里程碑' }
  ),
  f.array('unlock', '解锁前置 unlock', regionUnlockItem(), { addLabel: '+ 前置' }),
  f.object('initialCost', '首次进入消耗 initialCost', [f.number('food', '饱食', { int: true }), f.number('energy', '魔能', { int: true })]),
  f.boolean('isTestZone', '测试区 isTestZone（排除主线排序）')
];

const levelRowFields = (): Field[] => [
  f.string('id', '关卡 id', { required: true }),
  f.string('name', '关卡名', { required: true }),
  f.refList('enemies', '参战敌人 enemies（⊆ enemyPool）', 'enemy', { help: '必须是所在区域 enemyPool 的子集' }),
  f.number('staminaCost', '体力消耗 staminaCost', { required: true, int: true, min: 0 }),
  dropListField('drops', '掉落表 drops', true),
  dropListField('firstClearDrops', '首通掉落 firstClearDrops')
];

const expeditionFields = (): Field[] => [
  f.string('id', '远征点 id', { required: true }),
  f.string('name', '地点名 name', { required: true }),
  f.string('displayName', '展示名 displayName', { required: true }),
  f.string('shortName', '短名 shortName'),
  f.number('scavengeInterval', '拾荒间隔 scavengeInterval（秒）', { required: true, int: true, min: 1 }),
  dropListField('lootTable', '拾荒掉落 lootTable', true),
  f.enum('requiredHeroClass', '限定职阶 requiredHeroClass', [...HERO_CLASSES]),
  f.enum('requiredFaction', '限定阵营 requiredFaction', [...FACTIONS]),
  f.number('rationCost', '口粮消耗 rationCost', { int: true, min: 0 }),
  f.number('rationConsumptionRate', '口粮速率 rationConsumptionRate')
];

export const regionSheets = (): SheetDef[] => [
  {
    pattern: /^src\/data\/regions\/[^/]+\/regionInfo\.json$/,
    domain: '区域',
    title: (p) => `区域 · ${p.split('/')[3]}`,
    mode: { form: 'singleObject', fields: regionInfoFields() }
  },
  {
    pattern: /^src\/data\/regions\/[^/]+\/levels\.json$/,
    domain: '区域',
    title: (p) => `关卡 · ${p.split('/')[3]}（末位=关底）`,
    mode: {
      form: 'rows',
      rowFields: levelRowFields(),
      newRow: () => ({ id: '', name: '', enemies: [], staminaCost: 10, drops: [] }),
      ordered: true
    }
  },
  {
    pattern: /^src\/data\/regions\/[^/]+\/expedition\.json$/,
    domain: '区域',
    title: (p) => `远征点 · ${p.split('/')[3]}`,
    mode: { form: 'singleObject', fields: expeditionFields() },
    notes: ['无此文件即该区无远征点。']
  }
];

// === 事件（§8） ===

export const REALITY_TYPES = ['common', 'danger', 'combat', 'welfare', 'relic', 'anomaly', 'encounter'] as const;

const realityEventFields = (): Field[] => [
  f.string('id', '事件 id', { required: true }),
  f.string('title', '标题 title', { required: true }),
  f.string('description', '描述 description', { multiline: true, required: true }),
  f.enum('type', '类型 type（文件名即类别）', [...REALITY_TYPES], { required: true }),
  f.object('choices', '选项 choices（与 battle 二选一）', [realityChoiceField('A'), realityChoiceField('B')]),
  f.object(
    'battle',
    '战斗遭遇 battle（与 choices 二选一）',
    [
      f.refList('enemies', '遭遇敌人 enemies', 'enemy', { required: false }),
      f.number('expReward', '胜利经验 expReward（每位上阵英雄）', { required: true, int: true, min: 0 }),
      dropListField('drops', '胜利掉落 drops（入临时背囊）', true)
    ]
  ),
  f.number('weight', '出现权重 weight（缺省 100）', { int: true, min: 0 })
];

const choiceOrBattleRule = (doc: JsonValue, path: string): Issue[] => {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [];
  const out: Issue[] = [];
  for (const [k, row] of Object.entries(doc)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const hasChoices = !!r.choices;
    const hasBattle = !!r.battle;
    if (!hasChoices && !hasBattle) out.push({ level: 'error', path, loc: `rows["${k}"]`, message: 'choices 与 battle 必须二选一配置' });
    if (hasChoices && hasBattle) out.push({ level: 'warn', path, loc: `rows["${k}"]`, message: 'choices 与 battle 同时存在——战斗事件以 battle 为准，choices 将被忽略' });
  }
  return out;
};

export const eventSheets = (): SheetDef[] => [
  {
    pattern: /^src\/data\/events\/dreamEvents\.json$/,
    domain: '事件',
    title: '梦境事件 dreamEvents',
    mode: {
      form: 'keyedRows',
      rowFields: [
        f.string('id', '事件 id', { required: true }),
        f.string('title', '标题', { required: true }),
        f.string('description', '描述', { multiline: true, required: true }),
        f.enum('type', '类型 type', ['welfare', 'common', 'danger', 'signal'], { required: true }),
        f.object('choices', '选项 choices', [dreamChoiceField('A'), dreamChoiceField('B')], { required: true }),
        f.number('weight', '出现权重 weight（缺省 100）', { int: true, min: 0 })
      ],
      newRow: () => ({ id: '', title: '', description: '', type: 'common', choices: {}, weight: 100 })
    },
    notes: ['resonance + targetHeroId 驱动救援共鸣。']
  },
  ...REALITY_TYPES.map<SheetDef>((t) => ({
    pattern: new RegExp(`^src\\/data\\/events\\/reality_${t}\\.json$`),
    domain: '事件',
    title: `现实事件 · ${t}`,
    mode: {
      form: 'keyedRows',
      rowFields: realityEventFields(),
      newRow: () => ({ id: '', title: '', description: '', type: t })
    },
    sheetRules: choiceOrBattleRule,
    notes: ['新事件必须在 realityOrder.json 登记发布序。']
  })),
  {
    pattern: /^src\/data\/events\/realityOrder\.json$/,
    domain: '事件',
    title: '现实事件发布序 realityOrder',
    mode: { form: 'stringList', catalog: 'realityEvent' },
    notes: ['全部现实事件 id 的发布序清单；loader 先按单归并再依此重排，漏登记排尾部。']
  },
  {
    pattern: /^src\/data\/events\/rescueEvents\.json$/,
    domain: '事件',
    title: '救援剧情 rescueEvents',
    mode: {
      form: 'keyedRows',
      rowFields: realityEventFields(),
      newRow: () => ({ id: '', title: '', description: '', type: 'combat' })
    },
    sheetRules: choiceOrBattleRule,
    notes: ['九人救援剧情（combat 语义）；requirements 表达选项消耗。']
  },
  {
    pattern: /^src\/data\/events\/rescueLocations\.json$/,
    domain: '事件',
    title: '救援坐标 rescueLocations',
    mode: {
      form: 'singleObject',
      fields: [
        f.map('names', '地点名录 names', f.object('', '地点', [f.string('displayName', '显示名', { required: true }), f.string('shortName', '短名 shortName')]), {
          keyLabel: '地点 locId'
        }),
        f.map('eventToLocation', '事件→地点映射 eventToLocation', f.ref('', '救援事件 rescueEventId', 'rescueEvent'), { keyLabel: '地点 locId' })
      ]
    },
    notes: ['与 survivors.realityLocationId 对齐。']
  }
];
