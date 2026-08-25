/**
 * 引用目录：从「原始 json 文档」派生各域 id 目录（物品/敌人/英雄/事件……），
 * 不经过 loader——个别文件损坏时仅对应目录缺失，编辑器仍可打开其余全部文件。
 * 静态闭集（职阶/阵营/属性）来自 enums.ts。
 */
import { FACTIONS, HERO_CLASSES, STAT_KEYS } from './enums';
import type { Catalog, CatalogKey, CatalogOption, Catalogs, JsonValue } from './types';

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 键控表 / 行数组 双形态统一取行列表 */
export const docRows = (doc: unknown): Record<string, unknown>[] => {
  if (Array.isArray(doc)) return doc.filter(isObj);
  if (isObj(doc)) return Object.values(doc).filter(isObj);
  return [];
};

const opt = (id: string, label?: string): CatalogOption => (label ? { id, label } : { id });
const fromMapKeys = (doc: unknown, labelOf?: (row: Record<string, unknown>) => string | undefined): CatalogOption[] => {
  if (!isObj(doc)) return [];
  return Object.entries(doc).flatMap(([k, v]) => (isObj(v) ? [opt(k, labelOf?.(v))] : [opt(k)]));
};

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export const buildCatalogs = (docs: Record<string, JsonValue>): Catalogs => {
  const catalogs: Catalogs = {
    heroClass: { label: '职阶', options: HERO_CLASSES.map((c) => opt(c)) },
    faction: { label: '阵营', options: FACTIONS.map((x) => opt(x)) },
    stat: { label: '属性', options: STAT_KEYS.map((s) => opt(s)) }
  };
  const put = (key: CatalogKey, catalog: Catalog) => {
    catalogs[key] = catalog;
  };

  // 物品（四分表 + loader 派生条目，组成对齐 items.loader 的 ITEMS_CONFIG）：
  // 1) 显式分表 resources/consumables/shards/equipmentItems；
  // 2) 装备派生：equipment.json 12 件在背包中即普通物品（deriveEquipmentItems，同 id）；
  // 3) 英雄碎片派生：shard_<heroId>（deriveHeroShards）。
  const itemOpts: CatalogOption[] = [];
  for (const p of ['items/resources', 'items/consumables', 'items/shards', 'items/equipmentItems']) {
    for (const row of docRows(docs[`src/data/${p}.json`])) {
      const id = str(row.id);
      if (id) itemOpts.push(opt(id, str(row.name)));
    }
  }
  for (const row of docRows(docs['src/data/equipment/equipment.json'])) {
    const id = str(row.id);
    if (id && !itemOpts.some((o) => o.id === id)) itemOpts.push(opt(id, str(row.name)));
  }
  for (const [p, doc] of Object.entries(docs)) {
    if (!/^src\/data\/entities\/heroes\/[^/]+\/heroInfo\.json$/.test(p) || !isObj(doc)) continue;
    const id = str(doc.id);
    if (id && !itemOpts.some((o) => o.id === `shard_${id}`)) itemOpts.push(opt(`shard_${id}`, `${str(doc.name) ?? id}灵魂碎片`));
  }
  put('item', { label: '物品', options: itemOpts });

  // 敌人（一敌一文件）
  put('enemy', {
    label: '敌人',
    options: Object.entries(docs)
      .filter(([p]) => /^src\/data\/entities\/enemies\/[^/]+\.json$/.test(p))
      .flatMap(([, doc]) => {
        if (!isObj(doc)) return [];
        const id = str(doc.id);
        return id ? [opt(id, str(doc.name))] : [];
      })
  });

  // 英雄（<hero>/heroInfo.json）
  put('hero', {
    label: '英雄',
    options: Object.entries(docs)
      .filter(([p]) => /^src\/data\/entities\/heroes\/[^/]+\/heroInfo\.json$/.test(p))
      .flatMap(([, doc]) => {
        if (!isObj(doc)) return [];
        const id = str(doc.id);
        return id ? [opt(id, str(doc.name))] : [];
      })
  });

  // 能力 / Buff
  const fileIds = (re: RegExp, key: string): CatalogOption[] =>
    Object.entries(docs)
      .filter(([p]) => re.test(p))
      .flatMap(([, doc]) => {
        if (!isObj(doc)) return [];
        const id = str(doc[key]);
        return id ? [opt(id, str(doc.name) ?? str(doc.title))] : [];
      });
  put('ability', { label: '能力', options: fileIds(/^src\/data\/combat\/abilities\/[^/]+\.json$/, 'id') });
  put('buff', { label: 'Buff', options: fileIds(/^src\/data\/combat\/buffs\/[^/]+\.json$/, 'buffId') });

  // 装备系列 / 单件
  const sets = docs['src/data/equipment/equipmentSets.json'];
  put('equipmentSet', { label: '装备系列', options: fromMapKeys(sets, (r) => str(r.name)) });
  const eq = docs['src/data/equipment/equipment.json'];
  put('equipment', { label: '装备', options: fromMapKeys(eq, (r) => str(r.name)) });

  // 后勤
  put('facility', { label: '设施', options: fromMapKeys(docs['src/data/shelter/facilities.json'], (r) => str(r.name)) });
  put('shelterUpgrade', { label: '基建升级', options: fromMapKeys(docs['src/data/shelter/shelterUpgrades.json'], (r) => str(r.name)) });
  put('crop', { label: '作物', options: fromMapKeys(docs['src/data/farming/crops.json'], (r) => str(r.name)) });

  // 区域与关卡
  const regionInfos = Object.entries(docs).filter(([p]) => /^src\/data\/regions\/[^/]+\/regionInfo\.json$/.test(p));
  put('region', {
    label: '区域',
    options: regionInfos.flatMap(([, doc]) => {
      if (!isObj(doc)) return [];
      const id = str(doc.id);
      return id ? [opt(id, str(doc.name))] : [];
    })
  });
  const levelOpts: CatalogOption[] = [];
  for (const [p, doc] of Object.entries(docs)) {
    if (!/^src\/data\/regions\/[^/]+\/levels\.json$/.test(p)) continue;
    for (const row of docRows(doc)) {
      const id = str(row.id);
      if (id) levelOpts.push(opt(id, str(row.name)));
    }
  }
  put('level', { label: '关卡', options: levelOpts });

  // 事件三系
  const eventIdsFrom = (re: RegExp): CatalogOption[] =>
    Object.entries(docs)
      .filter(([p]) => re.test(p))
      .flatMap(([, doc]) =>
        docRows(doc).flatMap((row) => {
          const id = str(row.id);
          return id ? [opt(id, str(row.title))] : [];
        })
      );
  put('realityEvent', {
    label: '现实事件',
    options: [...eventIdsFrom(/^src\/data\/events\/reality_[a-z]+\.json$/), ...eventIdsFrom(/^src\/data\/events\/rescueEvents\.json$/)]
  });
  put('dreamEvent', { label: '梦境事件', options: eventIdsFrom(/^src\/data\/events\/dreamEvents\.json$/) });
  put('rescueEvent', { label: '救援事件', options: eventIdsFrom(/^src\/data\/events\/rescueEvents\.json$/) });

  // 救援地点
  const locDoc = docs['src/data/events/rescueLocations.json'];
  const locNames = isObj(locDoc) && isObj(locDoc.names) ? locDoc.names : {};
  put(
    'rescueLocation',
    {
      label: '救援地点',
      options: Object.entries(locNames).flatMap(([k, v]) => (isObj(v) ? [opt(k, str(v.displayName))] : [opt(k)]))
    }
  );

  // 天赋节点（专属 talent.json + 职阶公共主干）
  const talentOpts: CatalogOption[] = [];
  const pushTalentRows = (doc: unknown) => {
    for (const row of docRows(doc)) {
      const id = str(row.id);
      if (id) talentOpts.push(opt(id, str(row.name)));
    }
  };
  const trunkDoc = docs['src/data/progression/talentTrunks.json'];
  if (isObj(trunkDoc)) {
    for (const v of Object.values(trunkDoc)) pushTalentRows(v);
  }
  for (const [p, doc] of Object.entries(docs)) {
    if (/^src\/data\/entities\/heroes\/[^/]+\/talent\.json$/.test(p)) pushTalentRows(doc);
  }
  put('talentNode', { label: '天赋节点', options: talentOpts });

  return catalogs;
};

/** 目录显示名：id · label */
export const catalogDisplay = (cat: Catalog | undefined, id: string): string => {
  const found = cat?.options.find((o) => o.id === id);
  return found?.label ? `${id} · ${found.label}` : id;
};
