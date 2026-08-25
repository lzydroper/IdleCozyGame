/**
 * 战斗与养成 Sheet：能力 / Buff / 羁绊 / 职阶天赋主干 / 职阶成长。
 * 依据 docs/config-guide.md §3、§4、§9 与 abilityTypes/buffTypes/progression.types。
 */
import { f } from '../builders';
import type { Field, Issue, JsonValue, SheetDef } from '../types';
import { abilityObjectFields, buffObjectFields, talentNodeFields } from './shared';

const stem = (path: string): string => path.split('/').pop()?.replace(/\.json$/, '') ?? '';

const idMatchesFileRule =
  (idKey: string) =>
  (doc: JsonValue, path: string): Issue[] => {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [];
    const id = (doc as Record<string, unknown>)[idKey];
    return typeof id === 'string' && id !== stem(path)
      ? [{ level: 'warn', path, loc: idKey, message: `「${id}」与文件名「${stem(path)}」不一致（注册表按内容 id 收口，建议对齐）` }]
      : [];
  };

export const combatSheets = (): SheetDef[] => [
  {
    pattern: /^src\/data\/combat\/abilities\/[^/]+\.json$/,
    domain: '战斗',
    title: (p) => `能力 · ${stem(p)}`,
    mode: { form: 'singleObject', fields: abilityObjectFields() },
    sheetRules: (doc, path): Issue[] => {
      const base = idMatchesFileRule('id')(doc, path);
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return base;
      const d = doc as Record<string, unknown>;
      if (d.activation === 'active' && !d.targeting) {
        base.push({ level: 'error', path, loc: 'targeting', message: 'activation="active" 时 targeting 必配' });
      }
      if (d.activation === 'passive' && !d.passive) {
        base.push({ level: 'error', path, loc: 'passive', message: 'activation="passive" 时 passive:{triggers,effects} 必配' });
      }
      return base;
    }
  },
  {
    pattern: /^src\/data\/combat\/buffs\/[^/]+\.json$/,
    domain: '战斗',
    title: (p) => `Buff · ${stem(p)}`,
    mode: { form: 'singleObject', fields: buffObjectFields() },
    sheetRules: idMatchesFileRule('buffId')
  }
];

// === 养成（§9） ===

const bondFields = (): Field[] => [
  f.string('id', '羁绊 id', { required: true }),
  f.string('name', '羁绊名', { required: true }),
  f.string('description', '描述', { multiline: true, required: true }),
  f.refList('heroes', '必须同时上阵的英雄 heroes', 'hero'),
  f.map('factions', '阵营人数要求 factions', { kind: 'number', label: '最少上阵人数', int: true, min: 1 }, { keyLabel: '阵营', keyCatalog: 'faction' }),
  f.statModList('bonus', '触发加成 bonus', { required: true })
];

export const progressionSheets = (): SheetDef[] => [
  {
    pattern: /^src\/data\/progression\/bonds\.json$/,
    domain: '养成',
    title: '羁绊 bonds',
    mode: {
      form: 'rows',
      rowFields: bondFields(),
      newRow: () => ({ id: '', name: '', description: '', heroes: [], factions: {}, bonus: [] })
    },
    sheetRules: (doc, path): Issue[] => {
      if (!Array.isArray(doc)) return [];
      const out: Issue[] = [];
      doc.forEach((row, i) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return;
        const r = row as Record<string, unknown>;
        const heroCount = Array.isArray(r.heroes) ? r.heroes.length : 0;
        const factionCount = r.factions && typeof r.factions === 'object' && !Array.isArray(r.factions) ? Object.keys(r.factions).length : 0;
        if (heroCount === 0 && factionCount === 0) {
          out.push({ level: 'error', path, loc: `[${i}]`, message: 'heroes 与 factions 至少一组非空（纯英雄组合或纯阵营条件）' });
        }
      });
      return out;
    }
  },
  {
    // 根级 Record<职阶, TalentNodeConfig[]>
    pattern: /^src\/data\/progression\/talentTrunks\.json$/,
    domain: '养成',
    title: '职阶公共天赋主干 talentTrunks',
    mode: {
      form: 'mapRoot',
      keyLabel: '职阶',
      keyCatalog: 'heroClass',
      valueField: f.array('', '节点列表', f.object('', '天赋节点', talentNodeFields()), { addLabel: '+ 节点' })
    },
    notes: ['结构同英雄专属 talent（TalentNodeConfig[]）。']
  },
  {
    // 根级 Record<职阶, 成长率>
    pattern: /^src\/data\/progression\/growthByClass\.json$/,
    domain: '养成',
    title: '职阶成长 growthByClass',
    mode: {
      form: 'mapRoot',
      keyLabel: '职阶',
      keyCatalog: 'heroClass',
      valueField: f.object('', '每级成长', [
        f.number('attackPerLevel', '攻击/级', { required: true }),
        f.number('defensePerLevel', '防御/级', { required: true }),
        f.number('maxHpPerLevel', '生命/级', { required: true }),
        f.number('maxMpPerLevel', '魔力/级', { required: true }),
        f.number('critRatePerLevel', '暴击率/级'),
        f.number('critDmgPerLevel', '暴击倍率/级')
      ])
    }
  }
];
