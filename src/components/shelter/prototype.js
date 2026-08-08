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
