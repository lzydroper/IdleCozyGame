/**
 * 战斗 UI 重构原型交互脚本 (prototype.js v10)
 * 已落实：
 * 1. 标签统一为后缀模式并去除杂兵：
 *    - 如 `魔导构造体 [召唤物]`、`剧毒蜂后 [首领]`；
 *    - 普通敌人无后缀 tag，不出现「杂兵」字样；
 * 2. 顶部区域战斗信息使用统一卡片容器包裹；
 * 3. 下方战况播报区域移除多余标题（去除非必要的「交战中...」与「战况实时播报」），保持纯粹流畅滚动；
 * 4. 左右各 6 个纯竖向全宽固定卡槽，阵亡单位原地 0 HP 置灰，零高度跳变；
 * 5. 弹窗按钮文案统一为「确认」。
 */

// === 模拟数据（按主线顺序定义 4 个区域） ===
const MOCK_REGIONS = [
  {
    id: 'wasteland_entrance',
    order: 1,
    name: '废土边缘',
    desc: '避难所大门外的第一片废土，游荡着饥饿的变异鬣狗与鼠群，是检验小队战力的最佳训练场。',
    unlocked: { exploration: true, combat: true, expedition: true },
    levels: [
      {
        id: 'outpost',
        code: '01',
        name: '荒野哨所',
        cleared: true,
        staminaCost: 10,
        enemies: [{ name: '变异鬣狗', boss: false }, { name: '辐射鼠', boss: false }, { name: '巡逻警戒犬', boss: false }],
        drops: [{ name: '废铁', count: 2, chance: '100%' }, { name: '粗制皮革', count: 1, chance: '50%' }],
        firstClear: null
      },
      {
        id: 'barracks',
        code: '02',
        name: '废弃兵营',
        cleared: true,
        staminaCost: 12,
        enemies: [{ name: '巡逻机械兵', boss: false }, { name: '重装警戒蛛', boss: true }],
        drops: [{ name: '废铁', count: 3, chance: '100%' }, { name: '精密芯片', count: 1, chance: '30%' }],
        firstClear: { name: '先锋战术目镜', count: 1 }
      },
      {
        id: 'core',
        code: '03',
        name: '核心枢纽',
        cleared: false,
        staminaCost: 15,
        enemies: [{ name: '废土狂暴领主', boss: true }, { name: '机械侍卫', boss: false }],
        drops: [{ name: '废铁', count: 5, chance: '100%' }, { name: '高能晶体', count: 2, chance: '60%' }],
        firstClear: { name: '统帅重铠', count: 1 }
      }
    ]
  },
  {
    id: 'subway_ruins',
    order: 2,
    name: '地下管道',
    desc: '阴暗潮湿的旧文明排污管网，充斥着强酸腐蚀液与潜伏在暗处的酸蚀掘地虫。',
    unlocked: { exploration: true, combat: false, expedition: false },
    lockReasons: {
      combat: [
        { text: '本区域荒野探索度达到 100%', current: '当前 45%', passed: false }
      ],
      expedition: [
        { text: '本区域荒野探索度达到 100%', current: '当前 45%', passed: false }
      ]
    },
    levels: [
      {
        id: 'subway_01',
        code: '01',
        name: '排污干道',
        cleared: false,
        staminaCost: 12,
        enemies: [{ name: '酸蚀蛞蝓', boss: false }, { name: '毒囊掘地虫', boss: false }],
        drops: [{ name: '腐蚀黏液', count: 2, chance: '100%' }],
        firstClear: null
      },
      {
        id: 'subway_02',
        code: '02',
        name: '深层蓄水池',
        cleared: false,
        staminaCost: 14,
        enemies: [{ name: '强酸母虫', boss: true }, { name: '酸蚀幼虫', boss: false }],
        drops: [{ name: '腐蚀黏液', count: 4, chance: '100%' }, { name: '抗酸外壳', count: 1, chance: '40%' }],
        firstClear: { name: '耐酸靴', count: 1 }
      }
    ]
  },
  {
    id: 'abandoned_lab',
    order: 3,
    name: '废弃研究所',
    desc: '曾是前沿魔导科技的核心据点，充斥着高浓度辐射与失控的机械构造体。',
    unlocked: { exploration: false, combat: false, expedition: false },
    lockReasons: {
      exploration: [
        { text: '前置区域 [地下管道] 探索度达到 100%', current: '当前 45%', passed: false },
        { text: '持有关键物品 [防毒面具 ×1]', current: '背包 0/1', passed: false }
      ],
      combat: [
        { text: '前置区域 [地下管道] 通关', current: '未通关', passed: false },
        { text: '本区域荒野探索度达到 100%', current: '当前 0%', passed: false }
      ]
    },
    levels: [
      {
        id: 'lab_01',
        code: '01',
        name: '消毒走廊',
        cleared: false,
        staminaCost: 15,
        enemies: [{ name: '失控警卫机', boss: false }],
        drops: [{ name: '实验药剂', count: 1, chance: '100%' }],
        firstClear: null
      }
    ]
  },
  {
    id: 'deep_crater',
    order: 4,
    name: '陨石巨坑',
    desc: '魔导晶体坠落引发的超大深坑，能量极不稳定。',
    unlocked: { exploration: false, combat: false, expedition: false },
    lockReasons: {
      exploration: [{ text: '前置区域 [废弃研究所] 探索度达到 100%', current: '当前 0%', passed: false }],
      combat: [{ text: '前置区域 [废弃研究所] 通关', current: '未通关', passed: false }]
    },
    levels: []
  }
];

// 英雄初始数据
const HERO_PARTY = [
  { id: 'h1', name: '蕾娜', isSummon: false, maxHp: 320, currentHp: 320, maxMp: 100, currentMp: 50 },
  { id: 'h2', name: '罗伊', isSummon: false, maxHp: 580, currentHp: 580, maxMp: 60, currentMp: 20 },
  { id: 'h3', name: '艾希', isSummon: false, maxHp: 260, currentHp: 260, maxMp: 80, currentMp: 40 }
];

// === 全局状态 ===
let currentSubTab = 'combat';
let combatViewMode = 'active';
let selectedCombatRegionId = 'wasteland_entrance';
let selectedExplorationRegionId = 'wasteland_entrance';
let viewingRegionId = null;
let currentCallerMode = 'combat';
let selectedLevel = null;
let stamina = 85;
const maxStamina = 100;

// 挂机状态
let isIdling = false;
let idleTimerInterval = null;
let idleSeconds = 0;
let idleBattleCount = 0;
let idleDrops = { '废铁': 0, '变异兽肉': 0, '精密芯片': 0 };

// 战场播放状态
let battleSpeed = 1;
let battleInterval = null;
let currentBattleEventIndex = 0;
let battleEventsList = [];
let battleHeroesSlots = [null, null, null, null, null, null];
let battleEnemiesSlots = [null, null, null, null, null, null];
let isEncounterBattle = false;

// === 初始化 ===
window.addEventListener('DOMContentLoaded', () => {
  renderCombatLevels();
});

// === 子 Tab 切换 ===
function switchSubTab(tab) {
  currentSubTab = tab;
  document.getElementById('subtab-wilderness').style.display = tab === 'wilderness' ? 'block' : 'none';
  document.getElementById('subtab-combat').style.display = tab === 'combat' ? 'block' : 'none';

  const wBtn = document.getElementById('subtab-wilderness-btn');
  const cBtn = document.getElementById('subtab-combat-btn');

  if (tab === 'wilderness') {
    wBtn.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow cursor-pointer';
    cBtn.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 text-zinc-400 hover:text-zinc-200 cursor-pointer';
  } else {
    cBtn.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow cursor-pointer';
    wBtn.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 text-zinc-400 hover:text-zinc-200 cursor-pointer';
  }
}

// === 模式切换（挑战 vs 挂机） ===
function setCombatMode(mode) {
  combatViewMode = mode;
  const activeBtn = document.getElementById('mode-active-btn');
  const idleBtn = document.getElementById('mode-idle-btn');

  if (mode === 'active') {
    activeBtn.className = 'flex-1 h-8.5 bg-rose-600/30 border border-rose-500/50 text-rose-300 rounded-xl flex items-center justify-center font-bold cursor-pointer';
    idleBtn.className = 'flex-1 h-8.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center hover:text-zinc-300 font-bold cursor-pointer';
    document.getElementById('levelListHeader').firstElementChild.textContent = '关卡列表（点击关卡查看详情）';
  } else {
    idleBtn.className = 'flex-1 h-8.5 bg-amber-600/30 border border-amber-500/50 text-amber-300 rounded-xl flex items-center justify-center font-bold cursor-pointer';
    activeBtn.className = 'flex-1 h-8.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center hover:text-zinc-300 font-bold cursor-pointer';
    document.getElementById('levelListHeader').firstElementChild.textContent = '关卡列表（点击已通关关卡开启挂机）';
  }
  renderCombatLevels();
}

// === 渲染关卡方块网格 ===
function renderCombatLevels() {
  const container = document.getElementById('levelsContainer');
  container.innerHTML = '';

  const region = MOCK_REGIONS.find(r => r.id === selectedCombatRegionId) || MOCK_REGIONS[0];
  const isRegionUnlocked = region.unlocked.combat;

  document.getElementById('currentRegionDisplay').innerHTML = `
    ${region.name}
    ${!isRegionUnlocked ? '<span class="text-[9px] bg-red-950/60 text-red-400 border border-red-800/40 px-1.5 py-0.5 rounded font-bold">待解锁</span>' : ''}
  `;

  document.getElementById('regionLockedNotice').style.display = isRegionUnlocked ? 'none' : 'inline';

  const levelsToRender = region.levels;

  if (levelsToRender.length === 0) {
    container.innerHTML = `<div class="col-span-full text-xs text-zinc-500 text-center py-8 bg-zinc-950/40 rounded-2xl border border-zinc-900">该区域暂无可用关卡。</div>`;
    return;
  }

  levelsToRender.forEach((level, index) => {
    const card = document.createElement('div');

    let statusHtml = '';
    let borderStyle = 'border-zinc-800';

    if (!isRegionUnlocked) {
      statusHtml = `<span class="text-[9px] font-bold text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">未解锁</span>`;
      borderStyle = 'border-zinc-850 opacity-60 bg-zinc-950/40';
    } else if (combatViewMode === 'idle') {
      if (level.cleared) {
        statusHtml = `<span class="text-[9px] font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-1.5 py-0.5 rounded">可挂机</span>`;
        borderStyle = 'border-amber-500/30 hover:border-amber-500/60';
      } else {
        statusHtml = `<span class="text-[9px] font-bold text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">未解锁</span>`;
        borderStyle = 'border-zinc-850 opacity-60 bg-zinc-950/30';
      }
    } else {
      if (level.cleared) {
        statusHtml = `<span class="text-[9px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded">已通关</span>`;
        borderStyle = 'border-emerald-500/30 hover:border-emerald-500/60';
      } else if (index === 0 || region.levels[index - 1]?.cleared) {
        statusHtml = `<span class="text-[9px] font-bold text-rose-300 bg-rose-950/50 border border-rose-500/40 px-1.5 py-0.5 rounded">可挑战</span>`;
        borderStyle = 'border-rose-500/40 hover:border-rose-500/70';
      } else {
        statusHtml = `<span class="text-[9px] font-bold text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">未解锁</span>`;
        borderStyle = 'border-zinc-850 opacity-60';
      }
    }

    card.className = `p-3 bg-zinc-900/90 hover:bg-zinc-850 border ${borderStyle} rounded-2xl flex flex-col justify-between items-center text-center cursor-pointer transition-all active:scale-95 shadow aspect-square relative`;

    card.innerHTML = `
      <div class="text-[10px] font-mono font-black text-zinc-500">${level.code}</div>
      <div class="text-xs font-black text-zinc-200 leading-tight px-0.5">${level.name}</div>
      <div>${statusHtml}</div>
    `;

    card.onclick = () => openLevelDetail(level, isRegionUnlocked);
    container.appendChild(card);
  });
}

// === 弹窗 1：打开通用区域列表选择器 ===
function openRegionSelector(mode) {
  currentCallerMode = mode;
  const modal = document.getElementById('regionSelectorModal');
  const container = document.getElementById('regionListContainer');
  container.innerHTML = '';

  const currentlySelected = (mode === 'exploration') ? selectedExplorationRegionId : selectedCombatRegionId;

  const visibleRegions = [];
  let foundFirstLocked = false;
  for (const r of MOCK_REGIONS) {
    if (r.unlocked[mode]) {
      visibleRegions.push(r);
    } else if (!foundFirstLocked) {
      visibleRegions.push(r);
      foundFirstLocked = true;
      break;
    }
  }

  visibleRegions.forEach(region => {
    const isUnlocked = region.unlocked[mode];
    const isSelected = region.id === currentlySelected;

    const item = document.createElement('div');
    item.className = `p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
      isSelected
        ? 'bg-zinc-800 border-amber-500/60 shadow-lg'
        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
    }`;

    item.innerHTML = `
      <div>
        <div class="text-xs font-black text-zinc-100 flex items-center gap-1.5">
          ${region.name}
          ${isSelected ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">当前</span>' : ''}
        </div>
        <div class="text-[10px] text-zinc-500 mt-0.5">主线区域 0${region.order}</div>
      </div>
      <div>
        ${
          isUnlocked
            ? '<span class="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-950/50 border border-emerald-500/30 rounded-md">已解锁</span>'
            : '<span class="text-[10px] font-bold text-zinc-500 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md">待解锁</span>'
        }
      </div>
    `;

    item.onclick = () => openRegionDetail(region.id);
    container.appendChild(item);
  });

  modal.style.display = 'flex';
}

function closeRegionSelector() {
  document.getElementById('regionSelectorModal').style.display = 'none';
}

// === 弹窗 2：打开区域详情与解锁诊断弹窗 ===
function openRegionDetail(regionId) {
  viewingRegionId = regionId;
  const region = MOCK_REGIONS.find(r => r.id === regionId);
  if (!region) return;

  document.getElementById('detailRegionTitle').textContent = region.name;
  document.getElementById('detailRegionOrder').textContent = `主线区域 0${region.order}`;
  document.getElementById('detailRegionDesc').textContent = region.desc;

  const isUnlocked = region.unlocked[currentCallerMode];
  const lockSection = document.getElementById('lockDiagnosticsSection');
  const lockList = document.getElementById('lockReasonsList');
  const confirmBtn = document.getElementById('confirmSelectRegionBtn');

  confirmBtn.textContent = '确认';

  if (isUnlocked) {
    lockSection.style.display = 'none';
    confirmBtn.disabled = false;
    confirmBtn.className = 'flex-1 h-9.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow cursor-pointer flex items-center justify-center';
  } else {
    lockSection.style.display = 'block';
    lockList.innerHTML = '';
    const reasons = region.lockReasons?.[currentCallerMode] || [
      { text: '前置区域探索度达到 100%', current: '未达成', passed: false }
    ];
    reasons.forEach(r => {
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center';
      row.innerHTML = `
        <span class="text-zinc-300">${r.text}</span>
        <span class="text-red-400 font-bold">${r.current}</span>
      `;
      lockList.appendChild(row);
    });

    confirmBtn.disabled = false;
    confirmBtn.className = 'flex-1 h-9.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-black rounded-xl cursor-pointer flex items-center justify-center';
  }

  document.getElementById('regionDetailModal').style.display = 'flex';
}

function closeRegionDetail() {
  document.getElementById('regionDetailModal').style.display = 'none';
}

function confirmSelectRegion() {
  if (!viewingRegionId) return;
  if (currentCallerMode === 'exploration') {
    selectedExplorationRegionId = viewingRegionId;
    const r = MOCK_REGIONS.find(r => r.id === viewingRegionId);
    document.getElementById('wildernessRegionName').textContent = r?.name;
    document.getElementById('wildernessRegionSubtitle').textContent = r?.unlocked.exploration ? '探索度 65%' : '待解锁';
  } else {
    selectedCombatRegionId = viewingRegionId;
    renderCombatLevels();
  }
  closeRegionDetail();
  closeRegionSelector();
}

// === 弹窗 3：打开关卡详情弹窗 ===
function openLevelDetail(level, isRegionUnlocked) {
  selectedLevel = level;
  document.getElementById('detailLevelTitle').textContent = `${level.code} ${level.name}`;
  document.getElementById('detailLevelCost').textContent = `消耗体力: ${level.staminaCost} 点`;

  const lockAlert = document.getElementById('detailLevelLockAlert');
  const actionBtn = document.getElementById('confirmLevelActionBtn');

  actionBtn.textContent = '确认';

  if (!isRegionUnlocked) {
    lockAlert.style.display = 'block';
    lockAlert.innerHTML = `<div>⚠️ 区域待解锁，本关卡信息处于封锁状态，不可挑战或挂机。</div>`;
    actionBtn.disabled = true;
    actionBtn.className = 'flex-1 h-9.5 bg-zinc-800 border border-zinc-700 text-zinc-600 text-xs font-black rounded-xl cursor-not-allowed flex items-center justify-center';
  } else if (combatViewMode === 'idle' && !level.cleared) {
    lockAlert.style.display = 'block';
    lockAlert.innerHTML = `<div>⚠️ 未通关此关卡，无法开启挂机。需先在「挑战」模式下通关该关卡。</div>`;
    actionBtn.disabled = true;
    actionBtn.className = 'flex-1 h-9.5 bg-zinc-800 border border-zinc-700 text-zinc-600 text-xs font-black rounded-xl cursor-not-allowed flex items-center justify-center';
  } else {
    lockAlert.style.display = 'none';
    actionBtn.disabled = false;
    actionBtn.className = 'flex-1 h-9.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black rounded-xl shadow cursor-pointer flex items-center justify-center';
  }

  const enemyContainer = document.getElementById('detailEnemiesList');
  enemyContainer.innerHTML = '';
  level.enemies.forEach(e => {
    const span = document.createElement('span');
    span.className = `px-2.5 py-1 rounded-lg border font-bold ${
      e.boss
        ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
        : 'bg-zinc-950 border-zinc-800 text-zinc-300'
    }`;
    // 后缀格式：名称 [首领]
    span.textContent = e.boss ? `${e.name} [首领]` : e.name;
    enemyContainer.appendChild(span);
  });

  const dropsContainer = document.getElementById('detailDropsList');
  dropsContainer.innerHTML = '';
  if (level.firstClear && !level.cleared) {
    const fc = document.createElement('span');
    fc.className = 'px-2.5 py-1 rounded-lg border border-amber-500/50 bg-amber-950/50 text-amber-300 font-bold';
    fc.textContent = `首通：${level.firstClear.name} ×${level.firstClear.count}`;
    dropsContainer.appendChild(fc);
  }
  level.drops.forEach(d => {
    const span = document.createElement('span');
    span.className = 'px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 font-bold';
    span.textContent = `${d.name} ×${d.count} (${d.chance})`;
    dropsContainer.appendChild(span);
  });

  document.getElementById('levelDetailModal').style.display = 'flex';
}

function closeLevelDetail() {
  document.getElementById('levelDetailModal').style.display = 'none';
}

function executeLevelAction() {
  if (!selectedLevel) return;
  if (stamina < selectedLevel.staminaCost) {
    alert(`体力不足（需要 ${selectedLevel.staminaCost} 点）！`);
    return;
  }

  stamina -= selectedLevel.staminaCost;
  updateStaminaDisplay();
  closeLevelDetail();

  if (combatViewMode === 'idle') {
    startIdleCombat(selectedLevel);
  } else {
    startDedicatedBattle(selectedLevel, false);
  }
}

function updateStaminaDisplay() {
  document.getElementById('staminaVal').textContent = stamina;
  document.getElementById('staminaBar').style.width = `${(stamina / maxStamina) * 100}%`;
}

// === 模拟荒野遭遇战触发 ===
function simulateWildernessEncounter() {
  const encounterLevel = {
    code: '遭遇',
    name: '变异兽群突袭',
    staminaCost: 0,
    enemies: [
      { name: '腐蚀狂犬', boss: false },
      { name: '剧毒蜂后', boss: true },
      { name: '酸蚀幼蛛', boss: false }
    ]
  };
  startDedicatedBattle(encounterLevel, true);
}

// === 弹窗 4：独立全屏战斗场景启动（纯竖向 6 槽位） ===
function startDedicatedBattle(level, isEncounter) {
  isEncounterBattle = isEncounter;
  document.getElementById('battleSceneTitle').textContent = `${level.code} ${level.name}`;
  document.getElementById('battleExitBtn').style.display = isEncounter ? 'none' : 'flex';

  // 英雄方 6 槽位
  battleHeroesSlots = [
    { ...HERO_PARTY[0] },
    { ...HERO_PARTY[1] },
    { ...HERO_PARTY[2] },
    null,
    null,
    null
  ];

  // 敌方 6 槽位
  battleEnemiesSlots = [null, null, null, null, null, null];
  level.enemies.forEach((e, idx) => {
    if (idx < 6) {
      battleEnemiesSlots[idx] = {
        id: `e_${idx}`,
        name: e.name,
        isBoss: e.boss,
        isSummon: false,
        maxHp: e.boss ? 650 : 220,
        currentHp: e.boss ? 650 : 220,
        maxMp: 50,
        currentMp: 0
      };
    }
  });

  generateMockBattleEvents(battleHeroesSlots, battleEnemiesSlots);
  renderBattleUnits();
  document.getElementById('battleEventLog').innerHTML = '';
  document.getElementById('dedicatedBattleModal').style.display = 'flex';

  currentBattleEventIndex = 0;
  playNextBattleEvent();
}

// 渲染左右各 6 个纯竖向全宽固定卡槽（标签放名称后）
function renderBattleUnits() {
  const heroesContainer = document.getElementById('battleHeroesList');
  heroesContainer.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const h = battleHeroesSlots[i];
    const slotEl = document.createElement('div');
    slotEl.className = 'h-full flex flex-col justify-center';

    if (h) {
      const isDead = h.currentHp <= 0;
      const displayHp = isDead ? 0 : h.currentHp;
      const hpPct = Math.max(0, Math.round((displayHp / h.maxHp) * 100));
      const mpPct = Math.max(0, Math.round((h.currentMp / h.maxMp) * 100));

      slotEl.id = `unit-card-${h.id}`;
      slotEl.className += ` px-2.5 py-1 rounded-xl border relative shadow transition-all duration-200 ${
        isDead
          ? 'bg-zinc-950/40 border-zinc-900 opacity-40 grayscale'
          : (h.isSummon ? 'bg-cyan-950/40 border-cyan-500/50' : 'bg-zinc-950/90 border-cyan-900/40')
      }`;

      slotEl.innerHTML = `
        <div class="flex justify-between items-center text-xs font-black ${isDead ? 'text-zinc-500' : 'text-zinc-100'} leading-tight">
          <span class="truncate">${h.name}${h.isSummon ? '<span class="text-[9px] text-cyan-400 font-bold ml-1">[召唤物]</span>' : ''}</span>
          <span class="text-[10px] font-mono ${isDead ? 'text-zinc-500' : (hpPct < 30 ? 'text-red-400' : 'text-emerald-400')} shrink-0">
            ${isDead ? `0/${h.maxHp} [阵亡]` : `${displayHp}/${h.maxHp}`}
          </span>
        </div>
        <div class="space-y-0.5 mt-1">
          <div class="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div id="hp-bar-${h.id}" class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200" style="width: ${hpPct}%;"></div>
          </div>
          <div class="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden">
            <div class="h-full bg-cyan-500 transition-all duration-200" style="width: ${mpPct}%;"></div>
          </div>
        </div>
      `;
    } else {
      slotEl.className += ' rounded-xl border border-dashed border-zinc-850/60 bg-zinc-950/20 flex items-center justify-center';
      slotEl.innerHTML = `<span class="text-[9px] text-zinc-700/60 font-mono">槽位 ${i + 1}</span>`;
    }

    heroesContainer.appendChild(slotEl);
  }

  const enemiesContainer = document.getElementById('battleEnemiesList');
  enemiesContainer.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const e = battleEnemiesSlots[i];
    const slotEl = document.createElement('div');
    slotEl.className = 'h-full flex flex-col justify-center';

    if (e) {
      const isDead = e.currentHp <= 0;
      const displayHp = isDead ? 0 : e.currentHp;
      const hpPct = Math.max(0, Math.round((displayHp / e.maxHp) * 100));

      slotEl.id = `unit-card-${e.id}`;
      slotEl.className += ` px-2.5 py-1 rounded-xl border relative shadow transition-all duration-200 ${
        isDead
          ? 'bg-zinc-950/40 border-zinc-900 opacity-40 grayscale'
          : (e.isBoss ? 'bg-rose-950/40 border-rose-500/50' : (e.isSummon ? 'bg-cyan-950/30 border-cyan-500/40' : 'bg-zinc-950/90 border-rose-950/40'))
      }`;

      // 标签后置：名称 [首领] 或 名称 [召唤物]
      let tagSuffix = '';
      if (e.isBoss) tagSuffix = '<span class="text-[9px] text-rose-300 font-bold ml-1">[首领]</span>';
      else if (e.isSummon) tagSuffix = '<span class="text-[9px] text-cyan-400 font-bold ml-1">[召唤物]</span>';

      slotEl.innerHTML = `
        <div class="flex justify-between items-center text-xs font-black ${isDead ? 'text-zinc-500' : (e.isBoss ? 'text-rose-300' : 'text-zinc-100')} leading-tight">
          <span class="truncate">${e.name}${tagSuffix}</span>
          <span class="text-[10px] font-mono ${isDead ? 'text-zinc-500' : (hpPct < 30 ? 'text-red-400' : 'text-emerald-400')} shrink-0">
            ${isDead ? `0/${e.maxHp} [阵亡]` : `${displayHp}/${e.maxHp}`}
          </span>
        </div>
        <div class="space-y-0.5 mt-1">
          <div class="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div id="hp-bar-${e.id}" class="h-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-200" style="width: ${hpPct}%;"></div>
          </div>
          <div class="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden">
            <div class="h-full bg-amber-500/80 transition-all duration-200" style="width: ${e.isBoss ? '60%' : '20%'}"></div>
          </div>
        </div>
      `;
    } else {
      slotEl.className += ' rounded-xl border border-dashed border-zinc-850/60 bg-zinc-950/20 flex items-center justify-center';
      slotEl.innerHTML = `<span class="text-[9px] text-zinc-700/60 font-mono">槽位 ${i + 1}</span>`;
    }

    enemiesContainer.appendChild(slotEl);
  }
}

// 模拟事件流生成
function generateMockBattleEvents(heroesSlots, enemiesSlots) {
  const h0 = heroesSlots[0];
  const h1 = heroesSlots[1];
  const h2 = heroesSlots[2];
  const e0 = enemiesSlots[0];
  const e1 = enemiesSlots[1];

  battleEventsList = [
    { round: 1, text: `[第1轮] 双方进入战斗距离，回合开始`, type: 'info' },
    { round: 1, source: h0, target: e0, damage: 85, text: `${h0.name} 施放 [苍蓝雷霆]，对 ${e0.name} 造成 85 点伤害` },
    { round: 1, source: e0, target: h1, damage: 60, text: `${e0.name} 撕咬 ${h1.name}，造成 60 点物理伤害` },
    {
      round: 2,
      type: 'summon_hero',
      text: `[第2轮] 蕾娜 吟唱 [魔导具现]，召唤出 魔导构造体 [召唤物] 入驻 4 号槽位！`,
      summonSlotIndex: 3,
      summon: { id: 'summon_1', name: '魔导构造体', isSummon: true, maxHp: 200, currentHp: 200, maxMp: 30, currentMp: 0 }
    },
    {
      round: 2,
      type: 'summon_enemy',
      text: `[第2轮] 敌方母体呼唤支援，酸蚀幼虫 [召唤物] 入驻敌方 4 号槽位！`,
      minionSlotIndex: 3,
      minion: { id: 'minion_1', name: '酸蚀幼虫', isBoss: false, isSummon: true, maxHp: 120, currentHp: 120, maxMp: 0, currentMp: 0 }
    },
    { round: 2, source: h2, target: e0, damage: 140, isCrit: true, text: `${h2.name} 触发暴击！精准射击对 ${e0.name} 造成 140 点暴击伤害，${e0.name} 阵亡倒下！` },
    { round: 2, source: h1, target: e1, damage: 120, text: `${h1.name} 挥动巨盾猛击 ${e1.name} [首领]，造成 120 点伤害` },
    { round: 3, source: h0, target: e1, damage: 550, isCrit: true, text: `${h0.name} 吟唱终极技能 [毁灭风暴]，对 ${e1.name} [首领] 造成 550 点毁灭伤害，清理敌方全阵列！` },
    { round: 3, text: `敌方单位已全部被击溃，战斗结束。`, type: 'victory' }
  ];
}

function playNextBattleEvent() {
  if (currentBattleEventIndex >= battleEventsList.length) {
    showBattleSettlement(true);
    return;
  }

  const evt = battleEventsList[currentBattleEventIndex];
  currentBattleEventIndex++;

  document.getElementById('battleRoundText').textContent = `第 ${evt.round || 1}/30 轮`;

  // 召唤物填入竖向空槽
  if (evt.type === 'summon_hero' && evt.summon) {
    battleHeroesSlots[evt.summonSlotIndex] = evt.summon;
    renderBattleUnits();
  } else if (evt.type === 'summon_enemy' && evt.minion) {
    battleEnemiesSlots[evt.minionSlotIndex] = evt.minion;
    renderBattleUnits();
  }

  const log = document.getElementById('battleEventLog');
  const line = document.createElement('div');
  line.className = 'text-xs leading-relaxed';
  if (evt.isCrit) line.className += ' text-amber-300 font-bold';
  else if (evt.type === 'victory') line.className += ' text-emerald-400 font-black';
  else if (evt.type === 'summon_hero' || evt.type === 'summon_enemy') line.className += ' text-cyan-300 font-bold';
  else line.className += ' text-zinc-300';
  line.textContent = evt.text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;

  // 伤害扣减与阵亡
  if (evt.target && evt.damage) {
    evt.target.currentHp = Math.max(0, evt.target.currentHp - evt.damage);
    const card = document.getElementById(`unit-card-${evt.target.id}`);
    if (card) {
      card.classList.remove('hit-shake');
      void card.offsetWidth;
      card.classList.add('hit-shake');
      showDamageFloat(card, evt.damage, evt.isCrit);
    }
    renderBattleUnits();
  }

  const delay = battleSpeed === 2 ? 300 : 650;
  battleInterval = setTimeout(playNextBattleEvent, delay);
}

function showDamageFloat(targetCard, damage, isCrit) {
  const rect = targetCard.getBoundingClientRect();
  const layer = document.getElementById('floatingDamageLayer');
  const layerRect = layer.getBoundingClientRect();
  const floatEl = document.createElement('div');
  floatEl.className = `absolute z-50 text-xs font-black damage-float ${
    isCrit ? 'text-amber-400 text-sm font-mono' : 'text-red-400 font-mono'
  }`;
  floatEl.style.left = `${rect.left - layerRect.left + rect.width / 2 - 12}px`;
  floatEl.style.top = `${rect.top - layerRect.top - 4}px`;
  floatEl.textContent = `-${damage}${isCrit ? '!' : ''}`;
  layer.appendChild(floatEl);

  setTimeout(() => floatEl.remove(), 800);
}

function toggleBattleSpeed() {
  battleSpeed = battleSpeed === 1 ? 2 : 1;
  document.getElementById('speedToggleBtn').textContent = `${battleSpeed}x`;
  document.getElementById('speedToggleBtn').className = battleSpeed === 2
    ? 'h-8 px-3 bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-mono font-bold rounded-xl cursor-pointer flex items-center justify-center'
    : 'h-8 px-3 bg-zinc-800/90 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold rounded-xl cursor-pointer flex items-center justify-center';
}

function skipBattle() {
  clearTimeout(battleInterval);
  battleEnemiesSlots.forEach(e => {
    if (e) e.currentHp = 0;
  });
  renderBattleUnits();
  showBattleSettlement(true);
}

function promptForfeitBattle() {
  if (confirm('退出将视为战斗失败，小队全员将进入重伤状态，是否确认退出？')) {
    clearTimeout(battleInterval);
    showBattleSettlement(false);
  }
}

// === 弹窗 5：战斗结算卡片 ===
function showBattleSettlement(victory) {
  clearTimeout(battleInterval);
  const modal = document.getElementById('battleSettlementModal');
  const title = document.getElementById('settlementTitle');
  const subtext = document.getElementById('settlementSubtext');
  const dropsSection = document.getElementById('settlementDropsSection');
  const dropsList = document.getElementById('settlementDropsList');

  if (victory) {
    title.textContent = '战斗胜利';
    title.className = 'text-base font-black text-emerald-400';
    subtext.textContent = '成功消灭所有废土敌人，战利品已入账。';
    dropsSection.style.display = 'block';
    dropsList.innerHTML = `
      <span class="px-2.5 py-1 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-300 font-bold">废铁 ×3</span>
      <span class="px-2.5 py-1 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-300 font-bold">变异兽肉 ×1</span>
      <span class="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 font-bold">灵魂残响 ×10</span>
    `;
  } else {
    title.textContent = '战斗失败';
    title.className = 'text-base font-black text-red-400';
    subtext.textContent = '小队全员重伤倒下，需使用纳米修复剂治愈。';
    dropsSection.style.display = 'none';
  }

  modal.style.display = 'flex';
}

function closeBattleSettlement() {
  document.getElementById('battleSettlementModal').style.display = 'none';
  document.getElementById('dedicatedBattleModal').style.display = 'none';
}

// === 挂机战斗逻辑 (Idle Combat) ===
function startIdleCombat(level) {
  isIdling = true;
  idleSeconds = 0;
  idleBattleCount = 0;
  idleDrops = { '废铁': 0, '变异兽肉': 0, '精密芯片': 0 };

  document.getElementById('regionSelectCard').style.display = 'none';
  document.getElementById('combatModeToggle').style.display = 'none';
  document.getElementById('levelListView').style.display = 'none';
  document.getElementById('idleDashboardView').style.display = 'block';
  document.getElementById('idleLocationTitle').textContent = `挂机中：${selectedCombatRegionId === 'wasteland_entrance' ? '废土边缘' : selectedCombatRegionId} · ${level.code} ${level.name}`;

  const logContainer = document.getElementById('idleLogContainer');
  logContainer.innerHTML = `<div class="text-xs text-amber-400">挂机已开启：队伍进入持续战斗循环...</div>`;

  idleTimerInterval = setInterval(() => {
    idleSeconds++;
    const m = String(Math.floor(idleSeconds / 60)).padStart(2, '0');
    const s = String(idleSeconds % 60).padStart(2, '0');
    document.getElementById('idleTimer').textContent = `${m}:${s}`;

    if (idleSeconds % 5 === 0) {
      if (stamina < level.staminaCost) {
        stopIdleCombat();
        alert('体力已耗尽，挂机自动停止！');
        return;
      }
      stamina -= level.staminaCost;
      updateStaminaDisplay();

      idleBattleCount++;
      document.getElementById('idleBattleCount').textContent = idleBattleCount;
      idleDrops['废铁'] += 2;
      idleDrops['变异兽肉'] += 1;

      const logLine = document.createElement('div');
      logLine.className = 'text-xs text-zinc-300 leading-relaxed';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      logLine.innerHTML = `<span class="text-zinc-500 font-mono">${timeStr}</span> 蕾娜 施放 [苍蓝雷霆] 击败 变异犬，获得 <span class="text-amber-300 font-bold">废铁 ×2</span> (体力 -${level.staminaCost})`;
      logContainer.appendChild(logLine);
      logContainer.scrollTop = logContainer.scrollHeight;

      document.getElementById('idleDropsGrid').innerHTML = `
        <span class="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 font-bold">废铁 ×${idleDrops['废铁']}</span>
        <span class="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 font-bold">变异兽肉 ×${idleDrops['变异兽肉']}</span>
      `;
    }
  }, 1000);
}

function stopIdleCombat() {
  if (!isIdling) return;
  clearInterval(idleTimerInterval);
  isIdling = false;

  document.getElementById('idleSummaryStats').textContent = `总挂机 ${document.getElementById('idleTimer').textContent} · 共完成 ${idleBattleCount} 场战斗`;
  document.getElementById('idleSummaryDrops').innerHTML = `
    <span class="px-2.5 py-1 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-300 font-bold">废铁 ×${idleDrops['废铁']}</span>
    <span class="px-2.5 py-1 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-300 font-bold">变异兽肉 ×${idleDrops['变异兽肉']}</span>
  `;

  document.getElementById('idleSummaryModal').style.display = 'flex';
}

function closeIdleSummary() {
  document.getElementById('idleSummaryModal').style.display = 'none';
  document.getElementById('idleDashboardView').style.display = 'none';
  document.getElementById('regionSelectCard').style.display = 'flex';
  document.getElementById('combatModeToggle').style.display = 'flex';
  document.getElementById('levelListView').style.display = 'block';
  setCombatMode('idle');
}
