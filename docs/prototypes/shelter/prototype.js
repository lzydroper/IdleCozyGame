// ===============================================
// Tab 切换
// ===============================================
const tabs = [
  { id: 'base', label: '基建', icon: '⚙️', badge: null },
  { id: 'greenhouse', label: '温室', icon: '🌱', badge: '2' },
  { id: 'facility', label: '产线', icon: '🔧', badge: '1/2' },
  { id: 'expedition', label: '远征', icon: '🧭', badge: '进行中' },
];
const tabBar = document.getElementById('tabBar');
tabs.forEach((tab) => {
  const btn = document.createElement('button');
  btn.className = 'flex-1 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200';
  btn.innerHTML = `<span>${tab.icon}</span>${tab.label}${tab.badge ? `<span class="text-[8px] opacity-70">(${tab.badge})</span>` : ''}`;
  btn.onclick = () => switchTab(tab.id, btn);
  tabBar.appendChild(btn);
});

function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.getElementById('tab-' + id).style.display = '';
  document.querySelectorAll('#tabBar button').forEach(b => {
    b.className = 'flex-1 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200';
  });
  btn.className = 'flex-1 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-md';
}

// ===============================================
// 产线风格卡片模板
// ===============================================
function card(glow, icon, title, subtitle, levelText, badge, body) {
  return `<div class="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50"><div class="h-0.5 w-full ${glow}"></div><div class="p-4 space-y-3"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="w-7 h-7 rounded-lg bg-zinc-950/50 border ${glow.replace('bg-','border-').replace('/30','/30')} flex items-center justify-center text-xs">${icon}</div><div><div class="text-xs font-bold text-zinc-100 flex items-center gap-1.5">${title}${levelText ? ` <span class="text-[9px] font-mono text-zinc-400 bg-white/5 px-1 py-0.5 rounded">${levelText}</span>` : ''}</div><div class="text-[9px] text-zinc-500">${subtitle}</div></div></div>${badge || ''}</div>${body}</div></div>`;
}

// ===============================================
// 模拟状态
// ===============================================
const state = {
  heroes: {
    nova: { name: '诺娃', class: '进攻者', faction: '机械', duty: null, dutyMeta: { speed: '+25%速度' } },
    mei: { name: '阿梅', class: '协奏者', faction: '奥术', duty: { type: 'waterer', target: 'greenhouse' }, dutyMeta: { yield: '+25%产量' } },
    zero: { name: '赛罗', class: '协奏者', faction: '魂印', duty: { type: 'explorer', target: 'radar_station' }, dutyMeta: { speed: '+20%速度' } },
    buster: { name: '巴斯特', class: '进攻者', faction: '星界', duty: null, dutyMeta: { yield: '+20%产量' } },
    soldier: { name: '铁卫', class: '守护者', faction: '英灵', duty: { type: 'facility', target: 'smelter_0' }, dutyMeta: { cost: '-15%原料' } },
  },
  facilities: {
    smelter: [{ name: '魔导冶炼炉', level: 2, queue: ['smelt_alloy'], capacity: 2 }],
    assembler: [{ name: '微型芯片组装台', level: 1, queue: [], capacity: 1 }],
  },
  greenhouse: { assignedWatererId: 'mei', slots: [
    { id: 1, crop: '辐射荧光草', progress: 30 },
    { id: 2, crop: '辐射荧光草', progress: 80 },
    { id: 3, crop: null, progress: 0 },
    { id: 4, crop: null, progress: 0 },
  ]},
  expedition: { locationId: 'radar_station', assignedExplorerId: 'zero' },
};

// 获取可指派的英雄（duty 为 null）
function getAvailableHeroes() {
  return Object.entries(state.heroes).filter(([, h]) => !h.duty);
}
// 获取英雄显示名
function heroName(id) { return state.heroes[id]?.name || id; }

// ===============================================
// 指派选择器（可交互弹窗）
// ===============================================
let currentPickerContext = null; // { type, target, returnFn }

function openHeroPicker(title, availableHeroes, onSelect) {
  currentPickerContext = { title, onSelect };
  renderHeroPicker();
}

function renderHeroPicker() {
  const ctx = currentPickerContext;
  if (!ctx) return;
  const overlay = document.getElementById('heroPickerOverlay');
  const available = getAvailableHeroes();
  overlay.innerHTML = `
    <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onclick="closeHeroPicker(event)">
      <div class="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl" onclick="event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-bold text-white">${ctx.title}</h3>
          <button onclick="closeHeroPicker()" class="text-zinc-500 hover:text-white cursor-pointer w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800 text-xs">✕</button>
        </div>
        <div class="space-y-2 overflow-y-auto max-h-[60vh]">
          ${available.length === 0 ? '<p class="text-zinc-600 text-center py-4 text-xs">无可用英雄（所有英雄已在岗）</p>' :
            available.map(([id, h]) => `
              <div onclick="selectHero('${id}')" class="p-2.5 rounded-xl border bg-zinc-950 border-zinc-800 hover:border-cyan-500/50 cursor-pointer transition-all flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm">🦸</div>
                  <div>
                    <div class="text-xs font-bold text-zinc-100">${h.name}</div>
                    <div class="text-[9px] text-zinc-500">${h.class} · ${h.faction}</div>
                  </div>
                </div>
                <div class="flex gap-1">
                  ${h.dutyMeta.speed ? '<span class="text-[9px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">' + h.dutyMeta.speed + '</span>' : ''}
                  ${h.dutyMeta.yield ? '<span class="text-[9px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">' + h.dutyMeta.yield + '</span>' : ''}
                  ${h.dutyMeta.cost ? '<span class="text-[9px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">' + h.dutyMeta.cost + '</span>' : ''}
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    </div>`;
  overlay.style.display = 'block';
}

function closeHeroPicker(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('heroPickerOverlay').style.display = 'none';
  currentPickerContext = null;
}

function selectHero(id) {
  if (currentPickerContext && currentPickerContext.onSelect) {
    currentPickerContext.onSelect(id);
  }
  closeHeroPicker();
}

// ===============================================
// 基建 tab
// ===============================================
document.getElementById('tab-base').innerHTML = `
  <h2 class="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">⚙️ 避难所基建 Core Upgrades</h2>
  ${card('bg-cyan-500/30', '🔋', '蓄电池', '离线续航 · 6.0h', 'Lv.3',
    '<button class="text-[9px] px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-zinc-700 cursor-pointer">升级</button>',
    '<div class="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50"><div class="flex justify-between"><span>当前效果</span><span class="text-zinc-200 font-bold">6.0h</span></div><div class="flex justify-between mt-1"><span>下一级消耗</span><span class="text-amber-400">废铁 ×40</span></div></div>')}
  ${card('bg-amber-500/30', '⚡', '魔导发电机', '能量凝结率 · 0.90/min', 'Lv.3',
    '<button class="text-[9px] px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-zinc-700 cursor-pointer">升级</button>',
    '<div class="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50"><div class="flex justify-between"><span>当前效果</span><span class="text-zinc-200 font-bold">0.90 能量/分</span></div><div class="flex justify-between mt-1"><span>下一级消耗</span><span class="text-amber-400">废铁 ×60</span></div></div>')}
  ${card('bg-emerald-500/30', '♻️', '物资回收站', '废铁提炼率 · 0.36/min', 'Lv.3',
    '<button class="text-[9px] px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-zinc-700 cursor-pointer">升级</button>',
    '<div class="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50"><div class="flex justify-between"><span>当前效果</span><span class="text-zinc-200 font-bold">0.36 废铁/分</span></div><div class="flex justify-between mt-1"><span>下一级消耗</span><span class="text-amber-400">废铁 ×60</span></div></div>')}
  ${card('bg-purple-500/30', '🛡️', '魔导护盾发生器', '解锁条件：蓄电池 ≥ Lv.5', null,
    '<span class="text-[9px] px-2 py-0.5 bg-zinc-800 text-zinc-500 border border-zinc-700 rounded-md">🔒 未解锁</span>',
    '<div class="text-[10px] text-zinc-500 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50"><div class="flex justify-between"><span>解锁条件</span><span class="text-rose-400">蓄电池 Lv.5（当前 Lv.3）</span></div><div class="flex justify-between mt-1"><span>效果预览</span><span class="text-zinc-400">减少梦魇入侵伤害 10%</span></div></div>')}
  ${card('bg-rose-500/30', '⚗️', '炼金台', '解锁条件：合金金属板 ≥ 5', null,
    '<span class="text-[9px] px-2 py-0.5 bg-zinc-800 text-zinc-500 border border-zinc-700 rounded-md">🔒 未解锁</span>',
    '<div class="text-[10px] text-zinc-500 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50"><div class="flex justify-between"><span>解锁条件</span><span class="text-rose-400">合金金属板 5（当前 2）</span></div><div class="flex justify-between mt-1"><span>效果预览</span><span class="text-zinc-400">离线自动炼制药剂</span></div></div>')}
`;


// ===============================================
// 温室 tab（含可交互指派）
// ===============================================
function renderGreenhouse() {
  const waterer = state.greenhouse.assignedWatererId;
  const watererHero = waterer ? state.heroes[waterer] : null;
  document.getElementById('tab-greenhouse').innerHTML = `
    <h2 class="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">🌱 温室控制中心</h2>
    <div class="grid grid-cols-2 gap-3">
      ${state.greenhouse.slots.map(slot => card('bg-emerald-500/30', '🌱', `槽位 #${slot.id}`,
        slot.crop ? `${slot.crop} · ${slot.progress}%` : '闲置中', null, '',
        slot.crop
          ? `<div class="w-full bg-zinc-900/80 rounded-full h-1 mb-1"><div class="h-full rounded-full bg-emerald-400" style="width:${slot.progress}%"></div></div><button class="w-full py-1 bg-emerald-500 text-zinc-950 font-extrabold rounded-md text-[9px] cursor-pointer" onclick="harvestSlot(${slot.id})">收割</button>`
          : '<div class="text-center text-zinc-600 text-[10px]">点击播种</div>'
      )).join('')}
    </div>
    ${card('bg-emerald-500/30', '💧', '浇水操作员',
      watererHero ? `托管中 · ${watererHero.name}` : '未指派', null,
      watererHero
        ? `<button onclick="unassignWaterer()" class="text-[9px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer">解除</button>`
        : `<button onclick="openHeroPicker('指派浇水操作员', getAvailableHeroes(), assignWaterer)" class="text-[9px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer">驻守</button>`,
      `<div class="text-[10px] text-zinc-400">${watererHero
        ? '当前操作员：<b class="text-zinc-200">' + watererHero.name + '</b> · ' + (watererHero.dutyMeta.yield || watererHero.dutyMeta.speed || '') + ' · 指派后自动浇水（生长翻倍）'
        : '指派英雄后温室插槽自动维持浇水状态（生长速度翻倍），离线也生效'}</div>`)}
    <div class="flex gap-2">
      <button class="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer">💧 一键浇水</button>
      <button class="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs cursor-pointer">✨ 一键收割播种</button>
    </div>`;
}

function assignWaterer(heroId) {
  state.heroes[heroId].duty = { type: 'waterer', target: 'greenhouse' };
  state.greenhouse.assignedWatererId = heroId;
  renderGreenhouse();
}
function unassignWaterer() {
  const id = state.greenhouse.assignedWatererId;
  if (id) { state.heroes[id].duty = null; state.greenhouse.assignedWatererId = null; }
  renderGreenhouse();
}
function harvestSlot(slotId) {
  const slot = state.greenhouse.slots.find(s => s.id === slotId);
  if (slot) { slot.crop = null; slot.progress = 0; }
  renderGreenhouse();
}

// ===============================================
// 产线 tab（统一指派按钮为温室风格）
// ===============================================
function renderFacility() {
  const smelter = state.facilities.smelter[0];
  const garrisonId = Object.entries(state.heroes).find(([, h]) => h.duty?.type === 'facility' && h.duty?.target === 'smelter_0')?.[0];
  const garrisonHero = garrisonId ? state.heroes[garrisonId] : null;
  const accent = 'amber';
  document.getElementById('tab-facility').innerHTML = `
    <h2 class="text-sm font-bold magic-blue flex items-center gap-2 border-b border-zinc-800/80 pb-2">🔧 工业自动生产流水线</h2>
    ${card('bg-amber-500/30', '🔥', '魔导冶炼炉 <span class="text-[9px] text-zinc-500">1号</span>',
      garrisonHero
        ? `驻守中 · ${garrisonHero.name} · 效率 ${Math.round((1 + smelter.level * 0.1) * 100)}%`
        : `未驻守 · 效率 ${Math.round((1 + smelter.level * 0.1) * 100)}% · 队列 ${smelter.queue.length}/${smelter.capacity}`,
      'Lv.' + smelter.level,
      garrisonHero
        ? `<button onclick="unassignFacility('smelter_0')" class="text-[9px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer">解除</button>`
        : `<button onclick="openHeroPicker('指派驻守英雄 · 冶炼炉', getAvailableHeroes(), (id) => assignFacility(id, 'smelter_0'))" class="text-[9px] px-2 py-1 rounded-lg bg-${accent}-500/10 text-${accent}-400 border border-${accent}-500/30 hover:bg-${accent}-500/20 cursor-pointer">驻守</button>`,
      `<div class="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50">
         ${garrisonHero
           ? '<div class="flex justify-between"><span>驻守英雄</span><span class="text-zinc-200 font-bold">' + garrisonHero.name + ' · ' + (garrisonHero.dutyMeta.speed || garrisonHero.dutyMeta.yield || garrisonHero.dutyMeta.cost || '') + '</span></div>'
           : '<div class="text-zinc-500">未驻守英雄，指派后获得 dutyMeta 加成（速度/产量/原料）</div>'}
         <div class="flex justify-between mt-1"><span>队列</span><span class="text-zinc-300 font-bold">' + smelter.queue.length + '/' + smelter.capacity + '</span></div>
       </div>
       <div class="flex gap-1.5">
         <select class="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-300 p-1.5 rounded-lg text-xs"><option>合成 合金金属板 ×1</option></select>
         <button class="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold cursor-pointer">入队</button>
       </div>`)}`;
}

function assignFacility(heroId, target) {
  state.heroes[heroId].duty = { type: 'facility', target };
  renderFacility();
}
function unassignFacility(target) {
  const id = Object.entries(state.heroes).find(([, h]) => h.duty?.type === 'facility' && h.duty?.target === target)?.[0];
  if (id) state.heroes[id].duty = null;
  renderFacility();
}

// ===============================================
// 远征 tab（统一指派按钮为温室风格）
// ===============================================
function renderExpedition() {
  const exp = state.expedition;
  const explorerId = exp.assignedExplorerId;
  const explorer = explorerId ? state.heroes[explorerId] : null;
  if (explorer) {
    // 已派遣状态
    document.getElementById('tab-expedition').innerHTML = `
      <h2 class="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">🧭 挂机探索远征</h2>
      ${card('bg-cyan-500/30', '🚀', '雷达站废墟',
        `探索中 · ${explorer.name} [${explorer.class} · ${explorer.faction}]`, null,
        `<button onclick="recallExpedition()" class="text-[9px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer">召回</button>`,
        `<div class="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-900/30 text-[10px]">
           <div class="bg-zinc-950/60 p-2 rounded-xl border border-zinc-900/50"><div class="text-zinc-500 font-bold">⏱️ 已累积</div><div class="text-zinc-200 font-mono font-bold mt-1">12分34秒</div></div>
           <div class="bg-zinc-950/60 p-2 rounded-xl border border-zinc-900/50"><div class="text-zinc-500 font-bold text-cyan-400">⏳ 下次拾荒</div><div class="text-cyan-400 font-mono font-bold mt-1 animate-pulse">45 秒</div></div>
         </div>
         <div class="text-[9px] text-zinc-500 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50"><span class="font-bold text-zinc-400 block mb-1">🔍 战利品：</span><div class="flex flex-wrap gap-x-2.5"><span>• 废旧金属(70%)</span><span>• 魔能补充(10%)</span><span>• 荧光草种子(20%)</span></div></div>`)}`;
  } else {
    // 未派遣状态
    document.getElementById('tab-expedition').innerHTML = `
      <h2 class="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">🧭 挂机探索远征</h2>
      ${card('bg-cyan-500/30', '🧭', '远征派遣',
        '未指派探索员', null,
        `<button onclick="openHeroPicker('指派远征探索员', getAvailableHeroes(), assignExplorer)" class="text-[9px] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer">派遣</button>`,
        `<div class="space-y-2">
           <div class="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50">
             选择探索员后可前往废土地点挂机拾荒。部分地点需要特定职阶或阵营的英雄。
           </div>
           <div class="space-y-1.5">
             <div class="p-2.5 rounded-xl border bg-cyan-950/15 border-cyan-500/50 cursor-pointer text-xs flex justify-between items-center">
               <span>雷达站废墟</span><span class="text-[9px] text-zinc-500">300s/次 · 无门槛</span>
             </div>
             <div class="p-2.5 rounded-xl border bg-zinc-950/40 border-zinc-900 cursor-pointer text-xs flex justify-between items-center">
               <span>坍塌地铁站</span><span class="text-[9px] text-zinc-500">240s/次 · 需魂印</span>
             </div>
             <div class="p-2.5 rounded-xl border bg-zinc-950/40 border-zinc-900 cursor-pointer text-xs flex justify-between items-center">
               <span>生化实验室</span><span class="text-[9px] text-zinc-500">360s/次 · 需机械</span>
             </div>
           </div>
         </div>`)}`;
  }
}

function assignExplorer(heroId) {
  state.heroes[heroId].duty = { type: 'explorer', target: 'radar_station' };
  state.expedition.assignedExplorerId = heroId;
  state.expedition.locationId = 'radar_station';
  renderExpedition();
}
function recallExpedition() {
  const id = state.expedition.assignedExplorerId;
  if (id) { state.heroes[id].duty = null; }
  state.expedition.assignedExplorerId = null;
  state.expedition.locationId = null;
  renderExpedition();
}

// ===============================================
// 初始化
// ===============================================
renderGreenhouse();
renderFacility();
renderExpedition();
switchTab('base', tabBar.children[0]);


// ===============================================
// 基建数据结构原型展示
// ===============================================
const schemas = {
  typeDef: `// UnlockRequirement 统一为 type/id/minValue
interface UnlockRequirement {
  type: 'upgrade_level' | 'item_count';
  id: string;        // upgrade_level -> 升级项 id; item_count -> 物品 id
  minValue: number;  // upgrade_level -> 最低等级; item_count -> 最低数量
}

// UpgradePath 新增字段
interface UpgradePath {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  category: 'base' | 'facility';
  effectLabel: string;
  icon?: string;                        // 新增：图标标识
  theme?: { glow: string };             // 新增：配色
  unlockRequirements?: UnlockRequirement[];  // 新增：解锁条件
  levels: UpgradeLevel[];
}`,
  basic: `// 基础升级（保持兼容）
{
  id: 'battery', name: '蓄电池',
  maxLevel: 10, category: 'base',
  effectLabel: '离线续航',
  icon: 'battery',
  theme: { glow: 'bg-cyan-500/30' },
  levels: [
    { level: 1, cost: {}, effectValue: 14400, effectText: '4.0h' },
    { level: 2, cost: { scrap_metal: 20 }, effectValue: 18000, effectText: '5.0h' },
  ]
}`,
  multi: `// 多材料消耗升级
{
  id: 'shield_generator', name: '魔导护盾发生器',
  maxLevel: 5, category: 'base',
  effectLabel: '梦魇防御',
  icon: 'shield',
  theme: { glow: 'bg-purple-500/30' },
  levels: [
    { level: 1, cost: { scrap_metal: 50, alloy_plate: 5 },
      effectValue: 0.10, effectText: '减伤 10%' },
    { level: 2, cost: { scrap_metal: 100, alloy_plate: 10, mana_dust: 5 },
      effectValue: 0.20, effectText: '减伤 20%' },
    { level: 5, cost: { scrap_metal: 300, alloy_plate: 30, mana_dust: 20,
                       crystal_silicon: 5 },
      effectValue: 0.50, effectText: '减伤 50%' },
  ]
}`,
  locked: `// 条件解锁升级（单条件）
{
  id: 'alchemy_bench', name: '炼金台',
  maxLevel: 5, category: 'base',
  effectLabel: '自动炼药',
  icon: 'flask',
  theme: { glow: 'bg-rose-500/30' },
  unlockRequirements: [
    { type: 'item_count', id: 'alloy_plate', minValue: 5 },
  ],
  levels: [
    { level: 1, cost: { alloy_plate: 5, mana_dust: 10 },
      effectValue: 1, effectText: '每小时炼制 1 瓶药剂' },
  ]
}`,
  unlockReq: `// 多条件组合解锁（所有条件都满足才显示）
{
  id: 'advanced_reactor', name: '高级魔导反应堆',
  maxLevel: 3, category: 'base',
  effectLabel: '全产能加成',
  icon: 'reactor',
  theme: { glow: 'bg-amber-500/30' },
  unlockRequirements: [
    { type: 'upgrade_level', id: 'battery', minValue: 5 },
    { type: 'upgrade_level', id: 'generator', minValue: 5 },
    { type: 'item_count', id: 'crystal_silicon', minValue: 3 },
  ],
  levels: [
    { level: 1, cost: { scrap_metal: 200, alloy_plate: 20,
                        crystal_silicon: 3 },
      effectValue: 0.05, effectText: '全产线效率 +5%' },
  ]
}`
};

const schemaBtns = document.getElementById('schemaBtns');
const schemaDisplay = document.getElementById('schemaDisplay');
const schemaLabels = { typeDef: '类型定义', basic: '基础升级', multi: '多材料', locked: '条件解锁', unlockReq: '多条件组合' };
Object.keys(schemas).forEach((key, i) => {
  const btn = document.createElement('button');
  btn.className = 'px-2 py-1 text-[10px] rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 cursor-pointer hover:bg-zinc-700';
  btn.textContent = schemaLabels[key];
  btn.onclick = () => {
    schemaDisplay.textContent = schemas[key];
    document.querySelectorAll('#schemaBtns button').forEach(b => {
      b.className = 'px-2 py-1 text-[10px] rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 cursor-pointer hover:bg-zinc-700';
    });
    btn.className = 'px-2 py-1 text-[10px] rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/50 cursor-pointer';
  };
  schemaBtns.appendChild(btn);
});
schemaDisplay.textContent = schemas.typeDef;
schemaBtns.children[0].className = 'px-2 py-1 text-[10px] rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/50 cursor-pointer';

