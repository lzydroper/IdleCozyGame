/**
 * 实体侧 Sheet：英雄五件套（heroInfo/duty/awaken/talent/growth）/ 敌人 / 幸存者档案。
 * 依据 docs/config-guide.md §1、§2、§11 与 entity.types。
 */
import { ENEMY_ROLES, FACTIONS, HERO_CLASSES, SURVIVOR_ROLES } from '../enums';
import { f } from '../builders';
import type { Field, Issue, SheetDef } from '../types';
import { abilityObjectFields, baseAttrFields, primaryAttrFields, specialAttrFields, talentNodeFields } from './shared';

const stem = (path: string): string => path.split('/').pop()?.replace(/\.json$/, '') ?? '';
const folder = (path: string): string => path.split('/').slice(-2)[0] ?? '';

// === 敌人（§2：一敌一文件） ===

const enemyFields = (): Field[] => [
  f.string('id', '敌人 id', { required: true }),
  f.string('name', '名称', { required: true }),
  f.string('description', '描述', { multiline: true }),
  f.enum('kind', 'kind（敌人必写 enemy）', ['enemy'], { required: true }),
  f.enum('role', '角色 role', [...ENEMY_ROLES]),
  f.enum('faction', '阵营 faction', [...FACTIONS], { required: true }),
  f.object('baseAttributes', '基础属性 baseAttributes', baseAttrFields(false), { required: true }),
  f.object('primaryAttributes', '元属性 primaryAttributes（可省）', primaryAttrFields()),
  f.object('specialAttributes', '特殊属性 specialAttributes（可省）', specialAttrFields()),
  f.statModList('modifiers', '修饰符 modifiers'),
  f.array(
    'abilities',
    '能力引用 abilities',
    f.object('', '能力引用', [f.ref('abilityId', '能力 abilityId', 'ability', { required: true }), f.json('overrides', '参数覆盖 overrides')], {}),
    { addLabel: '+ 能力' }
  )
];

export const enemySheets = (): SheetDef[] => [
  {
    pattern: /^src\/data\/entities\/enemies\/[^/]+\.json$/,
    domain: '敌人',
    title: (p) => `敌人 · ${stem(p)}`,
    mode: { form: 'singleObject', fields: enemyFields() },
    sheetRules: (doc, path): Issue[] => {
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [];
      const id = (doc as Record<string, unknown>).id;
      return typeof id === 'string' && id !== stem(path)
        ? [{ level: 'warn', path, loc: 'id', message: `敌人 id「${id}」与文件名「${stem(path)}」不一致（一敌一文件，建议对齐）` }]
        : [];
    }
  }
];

// === 英雄五件套（§1） ===

const heroInfoFields = (): Field[] => [
  f.string('id', '英雄 id（= 文件夹名；shard_<id> 派生依据）', { required: true }),
  f.string('name', '展示名', { required: true }),
  f.string('description', '档案文案', { multiline: true, required: true }),
  f.icon('icon', '立绘 icon（惯例 entities/heroes/<id>.png）', { required: true }),
  f.enum('kind', 'kind（不写或 hero 均可——装配层隐含）', ['hero']),
  f.enum('heroClass', '职阶 heroClass（决定 talentTrunks/growthByClass 键与图鉴分组）', [...HERO_CLASSES], { required: true }),
  f.enum('faction', '阵营 faction', [...FACTIONS], { required: true }),
  f.object('baseAttributes', '基础属性 baseAttributes', baseAttrFields(true), { required: true }),
  f.object('primaryAttributes', '元属性 primaryAttributes（六维齐全书写）', primaryAttrFields(), { required: true }),
  f.object('specialAttributes', '特殊属性 specialAttributes（缺省全 0）', specialAttrFields()),
  f.boolean('starter', 'starter：初始英雄标记（全游戏应恰一人 true）'),
  f.number('order', '图鉴/召唤池发布序 order', { required: true, int: true })
];

const dutyFields = (): Field[] => [
  f.array(
    'bonuses',
    '驻守加成 bonuses',
    f.object(
      '',
      '加成条目',
      [
        f.union(
          'scope',
          '作用范围 scope',
          'kind',
          {
            all: [],
            facility: [f.ref('facilityType', '设施类型 facilityType', 'facility', { required: true })],
            greenhouse: [f.refList('cropIds', '限定作物 cropIds', 'crop')],
            expedition: []
          },
          {
            variantLabels: { all: '全部后勤', facility: '指定设施', greenhouse: '温室作物', expedition: '远征' },
            variantDefaults: {
              all: () => ({ kind: 'all' }),
              facility: () => ({ kind: 'facility', facilityType: '' }),
              greenhouse: () => ({ kind: 'greenhouse' }),
              expedition: () => ({ kind: 'expedition' })
            },
            addLabel: '+ 加成条目'
          }
        ),
        f.number('speedMultiplier', '速度加成 speedMultiplier（0.25 = +25%）'),
        f.number('yieldMultiplier', '产出加成 yieldMultiplier'),
        f.number('costReduction', '成本降低 costReduction'),
        f.number('intervalReduction', '间隔缩短 intervalReduction'),
        f.number('lootChanceBonus', '掉落概率加成 lootChanceBonus')
      ],
      {}
    ),
    { required: true, addLabel: '+ 加成' }
  )
];

const awakenFields = (): Field[] => [
  f.string('awakenedName', '觉醒后名称 awakenedName', { required: true }),
  f.statModList('passive', '觉醒被动 passive（百分比，战斗内生效）', { required: true }),
  f.object('ability', '觉醒专属能力 ability（内联本体，并入全局能力注册表）', abilityObjectFields(), { required: true })
];

const growthMilestoneValue = (): Field =>
  f.object('', '该级面板加成', [...baseAttrFields(false), ...primaryAttrFields().map((x) => ({ ...x, required: false })), ...specialAttrFields()]);

const growthFields = (): Field[] => [f.map('levelMilestones', '等级里程碑 levelMilestones', growthMilestoneValue(), { keyLabel: '等级（字符串键）' })];

export const heroSheets = (): SheetDef[] => [
  {
    pattern: /^src\/data\/entities\/heroes\/[^/]+\/heroInfo\.json$/,
    domain: '英雄',
    title: (p) => `${folder(p)} · 档案`,
    mode: { form: 'singleObject', fields: heroInfoFields() },
    sheetRules: (doc, path): Issue[] => {
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [];
      const id = (doc as Record<string, unknown>).id;
      return typeof id === 'string' && id !== folder(path)
        ? [{ level: 'warn', path, loc: 'id', message: `英雄 id「${id}」与文件夹名「${folder(path)}」不一致（碎片派生 STARTER 均依赖 id）` }]
        : [];
    },
    notes: ['新增英雄只建此文件夹 + survivors.json 补一行即可：碎片/背包条目自动派生。']
  },
  {
    pattern: /^src\/data\/entities\/heroes\/[^/]+\/duty\.json$/,
    domain: '英雄',
    title: (p) => `${folder(p)} · 后勤驻守`,
    mode: { form: 'singleObject', fields: dutyFields() }
  },
  {
    pattern: /^src\/data\/entities\/heroes\/[^/]+\/awaken\.json$/,
    domain: '英雄',
    title: (p) => `${folder(p)} · 觉醒`,
    mode: { form: 'singleObject', fields: awakenFields() },
    sheetRules: (doc, path): Issue[] => {
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [];
      const ability = (doc as Record<string, unknown>).ability;
      if (!ability || typeof ability !== 'object' || Array.isArray(ability)) return [];
      const id = (ability as Record<string, unknown>).id;
      return typeof id === 'string' && id !== `awaken_${folder(path)}`
        ? [{ level: 'warn', path, loc: 'ability.id', message: `觉醒能力 id 惯例为 awaken_<heroId>（当前「${id}」，期望 awaken_${folder(path)}）` }]
        : [];
    },
    notes: ['无 ability 即视为不可觉醒。']
  },
  {
    pattern: /^src\/data\/entities\/heroes\/[^/]+\/talent\.json$/,
    domain: '英雄',
    title: (p) => `${folder(p)} · 专属天赋`,
    mode: { form: 'rows', rowFields: talentNodeFields(), newRow: () => ({ id: '', name: '', maxLevel: 1, effect: [], pos: { row: 0, col: 0 } }) }
  },
  {
    pattern: /^src\/data\/entities\/heroes\/[^/]+\/growth\.json$/,
    domain: '英雄',
    title: (p) => `${folder(p)} · 成长里程碑`,
    mode: { form: 'singleObject', fields: growthFields() }
  }
];

// === 幸存者档案（§11，ADR-0013） ===

export const survivorSheets: SheetDef[] = [
  {
    pattern: /^src\/data\/entities\/survivors\.json$/,
    domain: '幸存者',
    title: '幸存者档案 survivors',
    mode: {
      form: 'rows',
      rowFields: [
        f.ref('id', '英雄 id（= 幸存者身份）', 'hero', { required: true }),
        f.string('name', '姓名', { required: true }),
        f.enum('role', '职能 role', [...SURVIVOR_ROLES], { required: true }),
        f.string('roleLabel', '职能中文职位 roleLabel', { required: true }),
        f.string('backstory', '背景故事 backstory（梦境共鸣文案）', { multiline: true, required: true }),
        f.string('dreamTrigger', '梦境触发语 dreamTrigger', { multiline: true, required: true }),
        f.ref('realityLocationId', '现实坐标 realityLocationId', 'rescueLocation', { required: true })
      ],
      newRow: () => ({ id: '', name: '', role: 'farmer', roleLabel: '', backstory: '', dreamTrigger: '', realityLocationId: '' })
    },
    notes: ['九人救援剧情档案；新增英雄必须同步补一行。']
  }
];
