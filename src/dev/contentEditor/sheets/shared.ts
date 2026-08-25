/**
 * 跨域共享子 schema：属性块 / 掉落表 / 升级等级 / 天赋节点 / 能力与 Buff 模板 / 事件选项。
 * 约定：数组元素字段的 key 为 ''（无键），由 walkMember/序列化器跳过键查找。
 */
import { DAMAGE_ELEMENTS, EFFECT_KINDS, FACTIONS, FORMULA_TEMPLATES, HERO_CLASSES, TARGETING_OPTIONS, TIMING_KEYS } from '../enums';
import { f } from '../builders';
import type { Field } from '../types';

// === 属性三块 ===

export const baseAttrFields = (req: boolean): Field[] =>
  req
    ? [
        f.number('maxHp', '生命上限', { required: true, int: true, min: 1 }),
        f.number('attack', '攻击', { required: true, int: true, min: 0 }),
        f.number('defense', '防御', { required: true, int: true, min: 0 }),
        f.number('maxMp', '魔力上限（可省，默认 50）', { int: true, min: 0 }),
        f.number('critRate', '暴击率（小数，默认 0.05）', { min: 0 }),
        f.number('critDmg', '暴击倍率（默认 1.5）', { min: 0 })
      ]
    : [
        f.number('maxHp', '生命上限', { int: true, min: 0 }),
        f.number('attack', '攻击', { int: true, min: 0 }),
        f.number('defense', '防御', { int: true, min: 0 }),
        f.number('maxMp', '魔力上限', { int: true, min: 0 }),
        f.number('critRate', '暴击率（小数）'),
        f.number('critDmg', '暴击倍率')
      ];

export const primaryAttrFields = (): Field[] => [
  f.number('strength', '力量', { required: true, int: true, min: 0 }),
  f.number('constitution', '体质', { required: true, int: true, min: 0 }),
  f.number('agility', '敏捷', { required: true, int: true, min: 0 }),
  f.number('intelligence', '智力', { required: true, int: true, min: 0 }),
  f.number('willpower', '意志', { required: true, int: true, min: 0 }),
  f.number('transcendence', '超越', { required: true, int: true, min: 0 })
];

export const specialAttrFields = (): Field[] =>
  ['arcaneBoost|奥术增幅', 'arcaneResistance|奥术抵抗', 'mechanicalLoad|机械负荷', 'mechanicalEvolution|机械进化', 'nightmareErosion|梦魇侵蚀', 'voidSpirit|虚无灵体', 'spiritInspire|英灵鼓舞', 'astralGuidance|星界引导', 'soulsealDrive|魂印驱动'].map(
    (pair) => {
      const [key, label] = pair.split('|');
      return f.number(key, `${label}（%）`, { int: true });
    }
  );

// === 掉落表 DropEntry ===

const itemQtyFields = (withChance: boolean): Field[] => {
  const base: Field[] = [f.ref('itemId', '物品', 'item', { required: true }), f.number('count', '数量', { required: true, int: true, min: 1 })];
  return withChance ? [...base, f.number('chancePercent', '概率 %（0-100）', { required: true, int: true, min: 0 })] : base;
};

export const dropEntryField = (label = '掉落条目'): Field =>
  f.union(
    '',
    label,
    'kind',
    {
      fixed: itemQtyFields(false),
      chance: itemQtyFields(true),
      weighted: [
        f.array(
          'pool',
          '权重池',
          f.object('', '池项', [
            f.ref('itemId', '物品', 'item', { required: true }),
            f.number('count', '数量', { required: true, int: true, min: 1 }),
            f.number('weight', '权重', { required: true, int: true, min: 1 })
          ]),
          { required: true, addLabel: '+ 池项' }
        )
      ]
    },
    {
      variantLabels: { fixed: '固定掉落', chance: '概率掉落', weighted: '权重池' },
      variantDefaults: {
        fixed: () => ({ kind: 'fixed', itemId: '', count: 1 }),
        chance: () => ({ kind: 'chance', itemId: '', count: 1, chancePercent: 50 }),
        weighted: () => ({ kind: 'weighted', pool: [{ itemId: '', count: 1, weight: 1 }] })
      },
      addLabel: '+ 掉落'
    }
  );

export const dropListField = (key: string, label: string, required = false): Field =>
  f.array(key, label, dropEntryField(), { required, addLabel: '+ 掉落条目' });

// === 升级等级 UpgradeLevel ===

export const numberMap = (key: string, label: string, keyLabel: string, catalog?: 'item', req = false): Field =>
  f.map(key, label, { kind: 'number', label: '数量' }, { keyLabel, required: req, ...(catalog ? { keyCatalog: catalog } : {}) });

export const upgradeLevelRow = (): Field[] => [
  f.number('level', '等级（0 或 1 = 初始档，惯例见各表）', { required: true, int: true, min: 0 }),
  numberMap('cost', '升级费用', '物品', 'item'),
  f.number('effectValue', '效果数值', { required: true }),
  f.string('effectText', '效果文案', { required: true }),
  f.number('duration', '施工耗时（秒）', { required: true, int: true, min: 0 })
];

// === 解锁条件 UnlockRequirement ===

export const unlockRequirementField = (label = '解锁条件'): Field =>
  f.union(
    '',
    label,
    'type',
    {
      upgrade_level: [
        f.ref('id', '升级项', 'shelterUpgrade', { required: true }),
        f.number('minValue', '最低等级', { required: true, int: true, min: 0 })
      ],
      item_count: [f.ref('id', '物品', 'item', { required: true }), f.number('minValue', '最低数量', { required: true, int: true, min: 0 })]
    },
    {
      variantLabels: { upgrade_level: '升级项等级', item_count: '持有物品' },
      variantDefaults: {
        upgrade_level: () => ({ type: 'upgrade_level', id: '', minValue: 1 }),
        item_count: () => ({ type: 'item_count', id: '', minValue: 1 })
      }
    }
  );

// === 天赋节点 TalentNodeConfig ===

export const talentGateField = (): Field =>
  f.union(
    '',
    '门控',
    'type',
    {
      talent: [
        f.ref('nodeId', '目标节点', 'talentNode', { required: true }),
        f.enum('operator', '运算符', ['greater', 'equal', 'less'], { required: true }),
        f.number('value', '投入值', { required: true, int: true })
      ],
      awakened: [],
      heroLevel: [f.number('minLevel', '最低角色等级', { required: true, int: true, min: 1 })],
      star: [f.number('minLevel', '最低星级', { required: true, int: true, min: 1 })]
    },
    {
      variantLabels: { talent: '天赋投入', awakened: '已觉醒', heroLevel: '角色等级', star: '星级' },
      variantDefaults: {
        talent: () => ({ type: 'talent', nodeId: '', operator: 'equal', value: 0 }),
        awakened: () => ({ type: 'awakened' }),
        heroLevel: () => ({ type: 'heroLevel', minLevel: 10 }),
        star: () => ({ type: 'star', minLevel: 2 })
      },
      addLabel: '+ 门控'
    }
  );

export const talentNodeFields = (): Field[] => [
  f.string('id', '节点 id', { required: true }),
  f.string('name', '名称', { required: true }),
  f.number('maxLevel', '最大投入等级', { required: true, int: true, min: 1 }),
  f.statModList('effect', '每级效果', { required: true }),
  f.object('pos', '树图位置', [f.number('row', '行', { required: true, int: true, min: 0 }), f.number('col', '列（行内序号，0 起）', { required: true, int: true, min: 0 })], {
    required: true
  }),
  f.refList('requires', '前置节点', 'talentNode', { help: '父节点已投入 ≥1 点；同时是画线来源' }),
  f.refList('children', '子节点列表', 'talentNode', { help: '布局画线来源；顺序 = 槽位顺序' }),
  f.array('gate', '门控条件（AND，只阻塞不画线）', talentGateField(), { addLabel: '+ 门控' }),
  f.array('rewrites', '技能重写（heroes-skills：投入 ≥1 点后压轴应用，只重写不追加）', talentRewriteItem(), { addLabel: '+ 重写' })
];

// === 能力 AbilityConfig（abilities/<id>.json 与 awaken 内联共用） ===

export const effectTemplateItem = (label = '效果'): Field =>
  f.object(
    '',
    label,
    [
      f.enum('kind', '效果种类', EFFECT_KINDS, { required: true }),
      f.json('params', '参数 params', { templates: FORMULA_TEMPLATES, placeholder: '{ "amount": { "kind": "attack", "multiplier": 1 } }' }),
      f.number('fireCount', '重复发次数 fireCount（≥1）', { int: true, min: 1 })
    ],
    {}
  );

export const abilityTriggerItem = (): Field =>
  f.object('', '触发器', [
    f.enum('timing', '时机', TIMING_KEYS, { allowFree: true, required: true }),
    f.enum('unitRef', '单位参照', ['target', 'source'], { required: true })
  ]);

// === 天赋重写 TalentRewrite（heroes-skills 工单 05） ===
// effects/descriptions 键 = 效果索引（"0"/"1"…）；未提及的效果原样保留；重写压轴应用。

export const talentRewriteItem = (): Field =>
  f.object('', '重写补丁', [
    f.ref('targetAbilityId', '被重写技能 targetAbilityId', 'ability', { required: true }),
    f.number('priority', '发动优先级覆盖 priority', { int: true }),
    f.string('description', '主描述模板整体替换 description（占位符照常渲染）', { multiline: true }),
    f.map('effects', '效果替换 effects（键 = 效果索引，未提及的原样保留）', effectTemplateItem(), { keyLabel: '效果索引（字符串，如 "0"）' }),
    f.map('descriptions', '效果描述覆盖 descriptions（键 = 效果索引，预览展示用）', f.string('', '描述文本', { multiline: true }), { keyLabel: '效果索引（字符串，如 "0"）' })
  ], {});

export const abilityObjectFields = (opts?: { idRequired?: boolean }): Field[] => [
  f.string('id', '能力 id', { required: opts?.idRequired ?? true }),
  f.string('name', '名称', { required: true }),
  f.string('description', '描述（数值用 token：{attackPct}/{maxHpPct}/{flat}）', { multiline: true, required: true }),
  f.enum('activation', '激活方式', ['active', 'passive'], { required: true }),
  f.enum('targeting', '目标策略（active 必配）', TARGETING_OPTIONS),
  f.number('cooldown', '冷却（回合）', { int: true, min: 0 }),
  f.number('priority', '选用优先级（高者先被 AI 选中）', { int: true }),
  f.object('cost', '消耗 cost', [f.string('resource', '资源 id'), f.number('amount', '数量', { int: true, min: 1 })]),
  f.json('formula', '面板基准公式 formula', { templates: FORMULA_TEMPLATES.slice(0, 3) }),
  f.array('effects', '效果列表 effects', effectTemplateItem(), { addLabel: '+ 效果' }),
  f.object(
    'passive',
    '被动定义 passive（passive 能力必配）',
    [
      f.array('triggers', '触发时机', abilityTriggerItem(), { required: true, addLabel: '+ 触发器' }),
      f.array('effects', '被动效果', effectTemplateItem(), { required: true, addLabel: '+ 效果' })
    ]
  )
];

// === Buff BuffConfig ===

export const buffObjectFields = (): Field[] => [
  f.string('buffId', 'Buff id', { required: true }),
  f.enum('durationKind', '时长类型', ['forever', 'temporary'], { required: true }),
  f.boolean('renew', 'renew：重复获得取 max 时长'),
  f.boolean('stack', 'stack：重复获得叠加层数'),
  f.number('stackIncrement', '每次叠加层数 stackIncrement', { required: true, int: true, min: 0 }),
  f.boolean('removable', 'removable：可被驱散（缺省 true）'),
  f.boolean('consumeOnTrigger', 'consumeOnTrigger：forever 消耗类每触发扣 1 层'),
  f.array('triggers', '触发器 triggers', abilityTriggerItem(), { required: true, addLabel: '+ 触发器' }),
  f.array(
    'effects',
    '效果模板 effects',
    f.object('', '效果', [
      f.enum('kind', '效果种类', EFFECT_KINDS, { required: true }),
      f.string('label', '效果标签 label（effectId 后缀/测试过滤键）'),
      f.enum('targetRef', '目标参照', ['holder', 'eventTarget']),
      f.json('params', '参数 params', { templates: FORMULA_TEMPLATES, placeholder: '{ "amount": { "kind": "perStack", "base": 30 } }' })
    ]),
    { required: true, addLabel: '+ 效果' }
  )
];

// === 元素/伤害参数提示用 ===

export const DAMAGE_ELEMENTS_REF = DAMAGE_ELEMENTS;
export const FACTIONS_REF = FACTIONS;
export const HERO_CLASSES_REF = HERO_CLASSES;

// === 事件选项 ===

export const dreamChoiceField = (side: 'A' | 'B'): Field =>
  f.object(
    side,
    `选项 ${side}`,
    [
      f.string('text', '选项文本', { required: true }),
      f.object(
        'results',
        '结果 results',
        [
          f.map('stats', '属性变化', { kind: 'number', label: '数值' }, { keyLabel: 'sanity / pollution / resonance' }),
          f.map('items', '物品变化', { kind: 'number', label: '数量' }, { keyLabel: '物品', keyCatalog: 'item' }),
          f.string('logText', '日志文案 logText', { multiline: true, required: true }),
          f.ref('targetHeroId', '共鸣目标英雄', 'hero')
        ],
        { required: true }
      )
    ],
    {}
  );

export const realityChoiceField = (side: 'A' | 'B'): Field =>
  f.object(
    side,
    `选项 ${side}`,
    [
      f.string('text', '选项文本', { required: true }),
      f.map('requirements', '选项消耗 requirements', { kind: 'number', label: '数量' }, { keyLabel: '物品', keyCatalog: 'item' }),
      f.object(
        'results',
        '结果 results',
        [
          f.map('stats', '属性变化', { kind: 'number', label: '数值' }, { keyLabel: 'food / energy / sanity' }),
          f.map('items', '物品变化', { kind: 'number', label: '数量' }, { keyLabel: '物品', keyCatalog: 'item' }),
          f.string('logText', '日志文案 logText', { multiline: true, required: true })
        ],
        { required: true }
      )
    ],
    {}
  );
