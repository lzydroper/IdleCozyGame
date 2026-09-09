/**
 * 侧栏树构建（纯函数）：把扁平路径列表组织成 域 → (组 → 文件) 结构。
 * - 英雄：每位英雄一组（heroInfo/duty/awaken/talent/growth 收纳，默认折叠）；
 * - 区域：每区域一组（regionInfo/levels/expedition，默认折叠）；
 * - 敌人：域内平铺 + 「新建」动作；战斗：能力 / Buff 两个子组，各带「新建」。
 */
import type { JsonValue } from './types';
import { isObj } from './catalogs';
import { resolveSheet } from './sheetRegistry';

export type NewAction = 'newEnemy' | 'newAbility' | 'newBuff' | 'newHero' | 'newRegion';

export interface SideFile {
  kind: 'file';
  path: string;
  title: string;
}

export interface SideGroup {
  kind: 'group';
  key: string;
  label: string;
  children: SideFile[];
  /** 默认是否折叠 */
  defaultCollapsed: boolean;
  action?: NewAction;
}

export interface SideDomain {
  domain: string;
  files: SideFile[];
  groups: SideGroup[];
  action?: NewAction;
}

const HERO_FILE_LABEL: Record<string, string> = {
  'heroInfo.json': '档案',
  'duty.json': '后勤驻守',
  'awaken.json': '觉醒',
  'talent.json': '专属天赋',
  'growth.json': '成长里程碑',
  'skills.json': '技能槽位'
};

const REGION_FILE_LABEL: Record<string, string> = {
  'regionInfo.json': '区域信息',
  'levels.json': '关卡',
  'expedition.json': '远征点'
};

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

const fileOf = (path: string, title: string): SideFile => ({ kind: 'file', path, title });

const entityLabel = (docs: Record<string, JsonValue>, infoPath: string, fallback: string): string =>
  (docs[infoPath] && isObj(docs[infoPath]) ? str(docs[infoPath].name) ?? str(docs[infoPath].id) : undefined) ?? fallback;

export const buildSideTree = (paths: string[], docs: Record<string, JsonValue>): SideDomain[] => {
  const order = ['物品', '工坊', '农田', '避难所', '装备', '英雄', '敌人', '幸存者', '区域', '事件', '战斗', '养成', '其他'];
  const byDomain = new Map<string, SideDomain>();
  const domainOf = (d: string): SideDomain => {
    let x = byDomain.get(d);
    if (!x) {
      x = { domain: d, files: [], groups: [] };
      byDomain.set(d, x);
    }
    return x;
  };

  const heroes = new Map<string, SideFile[]>();
  const regions = new Map<string, SideFile[]>();
  const enemies: SideFile[] = [];
  const abilities: SideFile[] = [];
  const buffs: SideFile[] = [];

  for (const p of paths) {
    let m = /^src\/data\/entities\/heroes\/([^/]+)\/([^/]+\.json)$/.exec(p);
    if (m) {
      const list = heroes.get(m[1]) ?? [];
      list.push(fileOf(p, HERO_FILE_LABEL[m[2]] ?? m[2]));
      heroes.set(m[1], list);
      continue;
    }
    m = /^src\/data\/regions\/([^/]+)\/([^/]+\.json)$/.exec(p);
    if (m) {
      const list = regions.get(m[1]) ?? [];
      list.push(fileOf(p, REGION_FILE_LABEL[m[2]] ?? m[2]));
      regions.set(m[1], list);
      continue;
    }
    m = /^src\/data\/entities\/enemies\/([^/]+)\.json$/.exec(p);
    if (m) {
      enemies.push(fileOf(p, m[1]));
      continue;
    }
    m = /^src\/data\/combat\/abilities\/([^/]+)\.json$/.exec(p);
    if (m) {
      abilities.push(fileOf(p, m[1]));
      continue;
    }
    m = /^src\/data\/combat\/buffs\/([^/]+)\.json$/.exec(p);
    if (m) {
      buffs.push(fileOf(p, m[1]));
      continue;
    }
    const r = resolveSheet(p);
    domainOf(r.domain).files.push(fileOf(p, r.title));
  }

  // 敌人：平铺 + 新建
  {
    const d = domainOf('敌人');
    d.files.push(...enemies.sort((a, b) => a.title.localeCompare(b.title)));
    d.action = 'newEnemy';
  }

  // 战斗：能力 / Buff 子组
  const combat = domainOf('战斗');
  combat.groups.push({
    kind: 'group',
    key: 'combat:abilities',
    label: '能力',
    children: abilities.sort((a, b) => a.title.localeCompare(b.title)),
    defaultCollapsed: false,
    action: 'newAbility'
  });
  combat.groups.push({
    kind: 'group',
    key: 'combat:buffs',
    label: 'Buff',
    children: buffs.sort((a, b) => a.title.localeCompare(b.title)),
    defaultCollapsed: false,
    action: 'newBuff'
  });

  // 英雄组（默认折叠）
  const heroDomain = domainOf('英雄');
  for (const [folder, files] of [...heroes.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    heroDomain.groups.push({
      kind: 'group',
      key: `hero:${folder}`,
      label: entityLabel(docs, `src/data/entities/heroes/${folder}/heroInfo.json`, folder),
      children: files.sort((a, b) => a.title.localeCompare(b.title, 'zh')),
      defaultCollapsed: true
    });
  }
  heroDomain.action = 'newHero';

  // 区域组（默认折叠）
  const regionDomain = domainOf('区域');
  for (const [folder, files] of [...regions.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    regionDomain.groups.push({
      kind: 'group',
      key: `region:${folder}`,
      label: entityLabel(docs, `src/data/regions/${folder}/regionInfo.json`, folder),
      children: files.sort((a, b) => a.title.localeCompare(b.title, 'zh')),
      defaultCollapsed: true
    });
  }
  regionDomain.action = 'newRegion';

  return [...byDomain.values()].sort((a, b) => order.indexOf(a.domain) - order.indexOf(b.domain));
};
