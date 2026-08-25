/**
 * 配置编辑器核心逻辑测试：序列化保序 / 校验引擎 / 跨文件交叉检查 / 全文件建模覆盖。
 */
import { describe, expect, it } from 'vitest';
import { serializeDoc } from '../serialize';
import { buildCatalogs } from '../catalogs';
import { crossChecks, validateDoc } from '../validate';
import type { Field, SheetDef } from '../types';
import { resolveSheet } from '../sheetRegistry';
import { DATA_PATHS, LUCIDE_KEYS, loadAllDocs, SPRITE_PATHS } from '../dataAccess';
import { buildSideTree } from '../sideTree';
import { ENTITY_ID_RE, buildEntityFiles } from '../newEntity';

const env = {
  catalogs: {
    ...buildCatalogs({}),
    item: { label: '物品', options: [{ id: 'timber', label: '木材' }] },
    enemy: { label: '敌人', options: [{ id: 'rat' }] }
  },
  sprites: new Set(['items/resources/timber.png']),
  lucideKeys: new Set(['sword'])
};

describe('serializeDoc', () => {
  const rowFields: Field[] = [
    { kind: 'string', key: 'id', label: 'id' },
    { kind: 'string', key: 'name', label: '名称' },
    { kind: 'icon', key: 'icon', label: '图标' },
    { kind: 'number', key: 'count', label: '数量' }
  ];
  const defMode = { form: 'rows' as const, rowFields, newRow: () => ({}) };
  const def: SheetDef = { pattern: /^$/, domain: '测试', title: '测试', mode: defMode };

  it('schema 键前置、未知键按原序追加、2 空格缩进 + 尾换行', () => {
    const out = serializeDoc([{ count: 3, extra: 1, name: 'n', id: 'a', icon: 'sword' }], def.mode);
    expect(out).toBe(
      [
        '[',
        '  {',
        '    "id": "a",',
        '    "name": "n",',
        '    "icon": "sword",',
        '    "count": 3,',
        '    "extra": 1',
        '  }',
        ']',
        ''
      ].join('\n')
    );
  });

  it('键控表形态仅重排行内键、保留外层键序', () => {
    const keyed: SheetDef = {
      ...def,
      mode: { form: 'keyedRows', rowFields: defMode.rowFields, newRow: defMode.newRow }
    };
    const out = serializeDoc({ k2: { count: 1, id: 'b' }, k1: { name: 'x', id: 'a' } }, keyed.mode);
    expect(out).toBe(
      ['{', '  "k2": {', '    "id": "b",', '    "count": 1', '  },', '  "k1": {', '    "id": "a",', '    "name": "x"', '  }', '}', ''].join('\n')
    );
  });
});

describe('validateDoc', () => {
  const def: SheetDef = {
    pattern: /^$/,
    domain: '测试',
    title: '测试',
    mode: {
      form: 'rows',
      rowFields: [
        { kind: 'string', key: 'id', label: 'id', required: true },
        { kind: 'ref', key: 'itemId', label: '物品', catalog: 'item' },
        { kind: 'icon', key: 'icon', label: '图标' },
        { kind: 'statModList', key: 'mods', label: '修饰符' }
      ],
      newRow: () => ({})
    }
  };

  it('必填缺失 / 引用不存在 / 图标缺失 / 非法 stat 均被捕获', () => {
    const issues = validateDoc(
      'src/data/test.json',
      [
        { id: '', itemId: 'nope', icon: 'missing.png', mods: [{ stat: 'hacking', kind: 'flat', value: 1 }] },
        { id: 'dup' },
        { id: 'dup', itemId: 'timber', icon: 'sword', mods: [] }
      ],
      def,
      env
    );
    const msgs = issues.map((x) => x.message).join('\n');
    expect(msgs).toContain('缺少必填「id」');
    expect(msgs).toContain('「nope」不在物品目录中');
    expect(msgs).toContain('切图不存在：src/assets/sprites/missing.png');
    expect(msgs).toContain('不在 21 属性全集内');
    expect(msgs).toContain('与第 1 行重复');
  });

  it('合法数据零问题', () => {
    const issues = validateDoc(
      'src/data/test.json',
      [{ id: 'ok', itemId: 'timber', icon: 'items/resources/timber.png', mods: [{ stat: 'attack', kind: 'percent', value: 0.1 }] }],
      def,
      env
    );
    expect(issues.filter((x) => x.level === 'error')).toEqual([]);
  });
});

describe('crossChecks', () => {
  it('levels.enemies ⊄ enemyPool 报错；realityOrder 漏登记提醒；手写英雄碎片提醒', () => {
    const issues = crossChecks({
      'src/data/regions/r1/regionInfo.json': { id: 'r1', enemyPool: ['rat'] },
      'src/data/regions/r1/levels.json': [{ id: 'l1', enemies: ['rat', 'ghost_hound'] }],
      'src/data/events/reality_common.json': { e1: { id: 'e1' }, e2: { id: 'e2' } },
      'src/data/events/realityOrder.json': ['e1'],
      'src/data/items/shards.json': { shard_hero: { id: 'shard_hero' } }
    });
    const msgs = issues.map((x) => x.message).join('\n');
    expect(msgs).toContain('敌人「ghost_hound」不在所在区域 r1 的 enemyPool 中');
    expect(msgs).toContain('以下现实事件未登记发布序');
    expect(msgs).toContain('请勿手写');
  });
});

describe('buildCatalogs', () => {
  it('从原始文档派生物品/敌人/英雄目录', () => {
    const cat = buildCatalogs({
      'src/data/items/resources.json': [{ id: 'timber', name: '木材' }],
      'src/data/entities/enemies/rat.json': { id: 'rat', name: '鼠' },
      'src/data/entities/heroes/nova/heroInfo.json': { id: 'nova', name: '诺娃' }
    });
    expect(cat.item?.options).toContainEqual({ id: 'timber', label: '木材' });
    expect(cat.enemy?.options).toContainEqual({ id: 'rat', label: '鼠' });
    expect(cat.hero?.options).toContainEqual({ id: 'nova', label: '诺娃' });
  });
});

describe('全量建模覆盖', () => {
  it('src/data 下每个 json 文件都有结构化表单（无 rawJson 兜底残留）', () => {
    expect(DATA_PATHS.length).toBeGreaterThan(90);
    for (const p of DATA_PATHS) {
      const r = resolveSheet(p);
      expect(r.def.mode.form, `${p} 落入 rawJson 兜底，请补充 schema`).not.toBe('rawJson');
    }
  });

  it('未建模路径回退 rawJson', () => {
    expect(resolveSheet('src/data/future/newfile.json').def.mode.form).toBe('rawJson');
  });
});

describe('真实数据全量校验', () => {
  it('当前仓库数据 0 error（目录必须覆盖 loader 派生条目：装备物品/英雄碎片）', async () => {
    const { docs, errors } = await loadAllDocs();
    expect(Object.keys(errors), '存在解析失败的数据文件').toEqual([]);
    const env = {
      catalogs: buildCatalogs(docs),
      sprites: new Set(SPRITE_PATHS),
      lucideKeys: new Set(LUCIDE_KEYS)
    };
    const all = [];
    for (const [p, doc] of Object.entries(docs)) {
      all.push(...validateDoc(p, doc, resolveSheet(p).def, env));
    }
    all.push(...crossChecks(docs));
    const errs = all.filter((x) => x.level === 'error');
    expect(errs, errs.map((e) => `${e.path} · ${e.loc}: ${e.message}`).join('\n')).toEqual([]);
  });
});

describe('侧栏分组 sideTree', () => {
  const docs = {
    'src/data/entities/heroes/nova/heroInfo.json': { id: 'nova', name: '诺娃' },
    'src/data/entities/heroes/nova/duty.json': { bonuses: [] },
    'src/data/entities/heroes/nova/awaken.json': {},
    'src/data/entities/heroes/nova/talent.json': [],
    'src/data/entities/heroes/nova/growth.json': {},
    'src/data/regions/01_x/regionInfo.json': { id: 'x', name: '废土边缘' },
    'src/data/regions/01_x/levels.json': [],
    'src/data/entities/enemies/rat.json': { id: 'rat' },
    'src/data/entities/enemies/owl.json': { id: 'owl' },
    'src/data/combat/abilities/basic_attack.json': { id: 'basic_attack' },
    'src/data/combat/buffs/burn.json': { buffId: 'burn' },
    'src/data/items/resources.json': []
  };
  const paths = Object.keys(docs);

  it('英雄五件收纳为一组、以档案名命名、默认折叠、带新建动作', () => {
    const tree = buildSideTree(paths, docs);
    const hero = tree.find((d) => d.domain === '英雄');
    expect(hero?.groups).toHaveLength(1);
    expect(hero?.groups[0]?.label).toBe('诺娃');
    expect(hero?.groups[0]?.children).toHaveLength(5);
    expect(hero?.groups[0]?.defaultCollapsed).toBe(true);
    expect(hero?.action).toBe('newHero');
  });

  it('区域三件收纳为一组；敌人平铺；战斗拆能力/Buff 子组，各带新建', () => {
    const tree = buildSideTree(paths, docs);
    const region = tree.find((d) => d.domain === '区域');
    expect(region?.groups[0]?.label).toBe('废土边缘');
    expect(region?.groups[0]?.children).toHaveLength(2);
    expect(region?.action).toBe('newRegion');

    const enemy = tree.find((d) => d.domain === '敌人');
    expect(enemy?.files.map((f) => f.title).sort()).toEqual(['owl', 'rat']);
    expect(enemy?.action).toBe('newEnemy');

    const combat = tree.find((d) => d.domain === '战斗');
    const abilityGroup = combat?.groups.find((g) => g.label === '能力');
    const buffGroup = combat?.groups.find((g) => g.label === 'Buff');
    expect(abilityGroup?.action).toBe('newAbility');
    expect(buffGroup?.action).toBe('newBuff');
    expect(abilityGroup?.children).toHaveLength(1);
  });

  it('新建的运行期路径（不在初始 glob）同样被正确分组', () => {
    const tree = buildSideTree([...paths, 'src/data/entities/enemies/new_boss.json', 'src/data/regions/09_new/regionInfo.json'], docs);
    expect(tree.find((d) => d.domain === '敌人')?.files.some((f) => f.path.endsWith('new_boss.json'))).toBe(true);
    expect(tree.find((d) => d.domain === '区域')?.groups.some((g) => g.label === '09_new')).toBe(true);
  });
});

describe('新建实体模板', () => {
  const env = {
    catalogs: buildCatalogs({}),
    sprites: new Set(['entities/heroes/vigil.png']),
    lucideKeys: new Set(['sword'])
  };

  it('五类模板文件全部通过 schema 校验（0 error）', () => {
    for (const kind of ['enemy', 'ability', 'buff', 'hero', 'region'] as const) {
      const files = buildEntityFiles(kind, 'vigil');
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) {
        const errs = validateDoc(f.path, f.doc, resolveSheet(f.path).def, env).filter((x) => x.level === 'error');
        expect(errs, `${f.path}: ${errs.map((e) => e.message).join('; ')}`).toEqual([]);
        expect(() => JSON.parse(serializeDoc(f.doc, resolveSheet(f.path).def.mode))).not.toThrow();
      }
    }
  });

  it('id 命名约束', () => {
    expect(ENTITY_ID_RE.test('ember_lord')).toBe(true);
    expect(ENTITY_ID_RE.test('05_deep_mine')).toBe(true);
    expect(ENTITY_ID_RE.test('9start')).toBe(true);
    expect(ENTITY_ID_RE.test('Bad Name')).toBe(false);
    expect(ENTITY_ID_RE.test('123')).toBe(false);
    expect(ENTITY_ID_RE.test('_lead')).toBe(false);
  });
});
