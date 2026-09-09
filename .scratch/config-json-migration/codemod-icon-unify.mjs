/* eslint-disable */
// codemod-icon-unify.mjs — icon 单字段统一（sprite/iconKey 双轨退役）
// 规则：每行恰一个 icon 字符串——能按 id 在 sprites 树搜到 <id>.png 则写切图逻辑路径，
//       否则继承原 iconKey；随后删除 sprite / iconKey 字段。
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'E:/系统/文档/GitHub/IdleCozyGame';
const SPRITES = join(ROOT, 'src/assets/sprites');

// 全树索引：<basename>.png → 相对 sprites 根的逻辑路径
const pngIndex = new Map();
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.png')) pngIndex.set(name, relative(SPRITES, full).replaceAll('\\', '/'));
  }
})(SPRITES);

const files = [
  'src/data/items/consumables.json',
  'src/data/items/resources.json',
  'src/data/items/shards.json',
  'src/data/items/equipmentItems.json',
  'src/data/shelter/facilities.json',
  'src/data/shelter/shelterUpgrades.json',
  'src/data/equipment/equipment.json',
  ...readdirSync(join(ROOT, 'src/data/entities/heroes')).map(d => `src/data/entities/heroes/${d}/heroInfo.json`)
];

let rowsChanged = 0, pngAdopted = 0, keyKept = 0;

// 行变换：删 sprite/iconKey，按切图优先落 icon；返回 null 表示无变化
function unifyRow(row, label) {
  const before = JSON.stringify(row);
  delete row.sprite;
  const legacyKey = row.iconKey;
  delete row.iconKey;
  const pngPath = pngIndex.get(`${row.id}.png`);
  if (pngPath) { row.icon = pngPath; pngAdopted++; }
  else if (legacyKey) { row.icon = legacyKey; keyKept++; }
  else if (typeof row.icon !== 'string') {
    throw new Error(`${label} 无 iconKey 且无切图，拒绝产出裸行`);
  } // 否则保留上一轮已写入的 icon
  if (JSON.stringify(row) !== before) rowsChanged++;
}

function reorderIcon(row) {
  if (!('icon' in row)) return row;
  const ordered = {};
  let placed = false;
  for (const [k, v] of Object.entries(row)) {
    ordered[k] = v;
    if (k === 'description' && !placed) { ordered.icon = row.icon; placed = true; }
  }
  if (!placed) ordered.icon = row.icon;
  // 若 description 后紧跟的本来就是 icon（追加顺序导致重复）——Object 键唯一，赋值幂等
  return ordered;
}

for (const rel of files) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) { console.log('SKIP(缺文件):', rel); continue; }
  const json = JSON.parse(readFileSync(abs, 'utf8'));
  if (rel.endsWith('heroInfo.json')) {
    unifyRow(json, rel);
    writeFileSync(abs, JSON.stringify(reorderIcon(json), null, 2) + '\n', 'utf8');
    console.log('done:', rel);
    continue;
  }
  for (const [key, row] of Object.entries(json)) {
    unifyRow(row, `${rel}:${key}`);
    json[key] = reorderIcon(row);
  }
  writeFileSync(abs, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log('done:', rel);
}
console.log(`rows=${rowsChanged} 切图=${pngAdopted} 继承key=${keyKept}`);
