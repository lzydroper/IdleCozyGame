import type { GameState, HeroEquipment, EquippedItem, AutomationFacility, FacilityType } from '../types/game';
import { calculateDetailedOfflineProgress } from './offline';
import { isTestEnv } from './env';
import { getTalentNodes } from './talents';
import { getQueueCapacity, getActualDuration } from './facility';
import { isWearableEquipment } from './equipment';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';

// 装备槽位归一化（ticket 10）：钳制强化等级 0-30、神话标记布尔化，防御损坏存档写入 NaN/非法值
const normalizeSlot = (item: EquippedItem | null | undefined): EquippedItem | null => {
  if (!item || typeof item !== 'object') return null;
  const enhance = Number.isFinite(item.enhance) ? Math.min(Math.max(item.enhance, 0), 30) : 0;
  return { itemId: item.itemId, enhance, mythic: !!item.mythic };
};

// 天赋投入归一化（ticket 11）：仅保留该英雄树中的已知节点，等级钳制 0..maxLevel，防损坏存档
const normalizeTalents = (heroId: string, talents: Record<string, number> | undefined): Record<string, number> => {
  const known = new Map(getTalentNodes(heroId).map(node => [node.id, node.maxLevel]));
  const out: Record<string, number> = {};
  Object.entries(talents || {}).forEach(([nodeId, level]) => {
    const max = known.get(nodeId);
    if (max === undefined) return; // 未知/过期节点丢弃
    if (Number.isFinite(level) && level > 0) {
      out[nodeId] = Math.min(Math.max(Math.floor(level), 0), max);
    }
  });
  return out;
};

const isUuid = (str: string) => {
  const simpleUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return simpleUuidRegex.test(str);
};

export const getAccountsList = (): string[] => {
  const isTest = isTestEnv();
  const listJson = localStorage.getItem('aether_garden_accounts_list');
  if (listJson) {
    try {
      const parsed = JSON.parse(listJson);
      if (Array.isArray(parsed)) {
        if (isTest) return parsed;

        const list = parsed.filter((u: string) => u !== 'Guest');
        let hasMigrated = false;
        const newList: string[] = [];

        for (const item of list) {
          if (isUuid(item)) {
            newList.push(item);
          } else {
            // 就地将老旧角色代号迁移为规范的 UUID
            const oldKey = `aether_garden_save_${item}`;
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
              const newId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'char_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

              try {
                const saveObj = JSON.parse(oldData);
                saveObj.username = item; // 写入自描述
                localStorage.setItem(`aether_garden_save_${newId}`, JSON.stringify(saveObj));
                localStorage.removeItem(oldKey);
                newList.push(newId);
                hasMigrated = true;

                // 如果当前选中的也是这个老代号，更新它
                const curUser = localStorage.getItem('aether_garden_save_current_user');
                if (curUser === item) {
                  localStorage.setItem('aether_garden_save_current_user', newId);
                }
              } catch {}
            }
          }
        }

        if (hasMigrated) {
          localStorage.setItem('aether_garden_accounts_list', JSON.stringify(newList));
          return newList;
        }
        return list;
      }
    } catch (e) {
      console.error("Failed to parse accounts list", e);
    }
  }
  return isTest ? ['Guest'] : [];
};

export const getSaveKey = (username: string): string => `aether_garden_save_${username}`;

export const saveState = (username: string, state: GameState): void => {
  localStorage.setItem(getSaveKey(username), JSON.stringify(state));
};

// 新开局 / 无存档时的全新状态
export const createFreshState = (initialState: GameState, now: number): GameState => ({
  ...initialState,
  lastTick: now,
  dayStartTime: now
});

// 产线设施实例归一化（ticket 13）：旧存档（单设施对象 + activeRecipeId）→ 多台数组 + FIFO 队列
// ticket 01 去重：被删除的自动配方 id 先经迁移映射（目标为工坊侧保留配方 id），
// 映射后仍按 AUTO_RECIPES + facilityId 校验——目标为手动配方不在自动表，条目被清出而非触发未知 id 异常路径
const RECIPE_ID_MIGRATIONS: Record<string, string> = {
  craft_rusted_spring: 'rusted_spring_craft',
  craft_nanite_slurry: 'nanite_slurry_recipe',
  craft_plasma_arc: 'plasma_arc_craft',
  craft_ration_deluxe: 'ration_deluxe_recipe',
  assemble_energy: 'filter_refill',
};

export const migrateRecipeId = (id: string): string => RECIPE_ID_MIGRATIONS[id] ?? id;

const normalizeFacilityUnit = (
  type: FacilityType,
  saved: any,
  fallback: AutomationFacility
): AutomationFacility => {
  const maxLevel = SHELTER_UPGRADES[type]?.maxLevel ?? 5;
  const level = Number.isFinite(saved?.level)
    ? Math.min(Math.max(Math.floor(saved.level), 1), maxLevel)
    : 1;
  const rawQueue = Array.isArray(saved?.queue)
    ? saved.queue
    : typeof saved?.activeRecipeId === 'string' && saved.activeRecipeId
      ? [saved.activeRecipeId]
      : [];
  const migratedQueue = rawQueue.map((id: unknown) => (typeof id === 'string' ? migrateRecipeId(id) : id));
  // 队首是否有效须看过滤前的原队首：若原队首已失效（在制进度作废），
  // 其 timeLeft 不得转嫁给后续有效配方
  const headWasValid =
    typeof migratedQueue[0] === 'string' &&
    !!AUTO_RECIPES[migratedQueue[0]] &&
    AUTO_RECIPES[migratedQueue[0]].facilityId === type;
  const queue = migratedQueue
    .filter((id: unknown) => typeof id === 'string' && AUTO_RECIPES[id]?.facilityId === type)
    .slice(0, getQueueCapacity(level));
  // 防御损坏存档：在制进度仅在队首配方仍有效时保留，并钳制到该配方单次耗时以内；
  // 队列为空或队首失效时残留的 timeLeft 会白送给下一配方进度，必须清零
  const rawTimeLeft = Number.isFinite(saved?.timeLeft) ? Math.max(0, Math.floor(saved.timeLeft)) : 0;
  const timeLeft = headWasValid && queue.length > 0 ? Math.min(rawTimeLeft, getActualDuration(queue[0], level)) : 0;
  return {
    id: type,
    name: typeof saved?.name === 'string' ? saved.name : fallback.name,
    level,
    queue,
    currentProgress: 0,
    timeLeft,
    active: saved?.active !== false
  };
};

const normalizeFacilities = (
  saved: any,
  initial: Record<FacilityType, AutomationFacility[]>
): Record<FacilityType, AutomationFacility[]> => {
  const out = {} as Record<FacilityType, AutomationFacility[]>;
  (Object.keys(initial) as FacilityType[]).forEach(type => {
    const savedVal = saved?.[type];
    const fallback = initial[type][0];
    if (Array.isArray(savedVal) && savedVal.length > 0) {
      out[type] = savedVal.map(u => normalizeFacilityUnit(type, u, fallback));
    } else if (savedVal && typeof savedVal === 'object') {
      // 旧版单设施对象存档：迁移为单台数组，activeRecipeId → 队首
      out[type] = [normalizeFacilityUnit(type, savedVal, fallback)];
    } else {
      out[type] = [fallback];
    }
  });
  return out;
};

// 背包装备实例化迁移（ADR-0014 修订）：旧存档 inventory 中的可穿戴装备计数 → +0 实例，
// 并入 equipmentInventory；生态物品（强化魔晶/图纸）保持计数
const migrateEquipmentInstances = (
  inventory: Record<string, number>,
  equipmentInventory: Record<string, EquippedItem[]> = {}
): { inventory: Record<string, number>; equipmentInventory: Record<string, EquippedItem[]> } => {
  const nextInventory = { ...inventory };
  const nextEquipmentInventory: Record<string, EquippedItem[]> = { ...equipmentInventory };
  for (const [id, qty] of Object.entries(nextInventory)) {
    if (qty > 0 && isWearableEquipment(id)) {
      const list = nextEquipmentInventory[id] ? [...nextEquipmentInventory[id]] : [];
      for (let i = 0; i < qty; i++) list.push({ itemId: id, enhance: 0, mythic: false });
      nextEquipmentInventory[id] = list;
      delete nextInventory[id];
    }
  }
  return { inventory: nextInventory, equipmentInventory: nextEquipmentInventory };
};

// 将旧存档与初始状态深度合并，保证新字段有默认值
export const mergeSavedState = (parsed: GameState, initialState: GameState): GameState => {
  // 玩家属性（ticket 14）：全局 HP 体系废除，旧存档残留的 hp/maxHp 一并剥离
  const mergedPlayer = { ...initialState.player, ...(parsed.player || {}) };
  delete (mergedPlayer as Record<string, unknown>).hp;
  delete (mergedPlayer as Record<string, unknown>).maxHp;

  // ADR-0013：旧存档的顶层 survivors 状态直接丢弃（alpha 不迁移，英雄为唯一实体）
  delete (parsed as unknown as Record<string, unknown>).survivors;
  if (parsed.exploration) {
    delete (parsed.exploration as unknown as Record<string, unknown>).survivorResonance;
  }

  // 经济实体物品化（ADR-0014）：仅补物品化新增条目（soul_echo/resonance_shard/shard_*）的默认值，
  // 其余物品以存档为准（缺键视为 0），避免初始物品在精简/空背包存档上“复活”。
  // 注意：物品化前的旧存档其经济余额（顶层 soulEchoes 等）按 ADR-0014 alpha 决策直接舍弃，不迁移。
  const mergedInventory = {
    ...(parsed.inventory || {}),
    ...Object.fromEntries(
      Object.entries(initialState.inventory)
        .filter(([k]) => k === 'soul_echo' || k === 'resonance_shard' || k.startsWith('shard_'))
        .map(([k, v]) => [k, parsed.inventory && parsed.inventory[k] !== undefined ? parsed.inventory[k] : v])
    )
  };
  // 背包装备实例化（ADR-0014 修订）：可穿戴装备计数 → +0 实例
  const migrated = migrateEquipmentInstances(mergedInventory, parsed.equipmentInventory);

  return {
  ...initialState,
  ...parsed,
  player: mergedPlayer,
  inventory: migrated.inventory,
  equipmentInventory: migrated.equipmentInventory,
  greenhouse: {
    ...initialState.greenhouse,
    ...(parsed.greenhouse || {})
  },
  shelter: {
    ...initialState.shelter,
    ...(parsed.shelter || {}),
    facilities: normalizeFacilities(
      (parsed.shelter && (parsed.shelter as any).facilities) as any,
      initialState.shelter.facilities
    )
  },
  exploration: {
    ...initialState.exploration,
    ...(parsed.exploration || {}),
    // 梦境封锁（ticket 14）：旧存档缺失时回退未封锁
    dreamLockdownUntil:
      parsed.exploration && typeof parsed.exploration.dreamLockdownUntil === 'number'
        ? parsed.exploration.dreamLockdownUntil
        : null,
    capsulesCharge: {
      ...initialState.exploration.capsulesCharge,
      ...((parsed.exploration && parsed.exploration.capsulesCharge) || {})
    },
    // 救援进度（ADR-0013）：旧存档的 survivors/survivorResonance 直接丢弃（alpha 不迁移）
    rescueProgress: Object.fromEntries(
      Object.entries((parsed.exploration && parsed.exploration.rescueProgress) || {}).map(([heroId, p]) => {
        const prog = (p || {}) as { resonance?: unknown; locationId?: unknown };
        return [
          heroId,
          {
            resonance: Number.isFinite(prog.resonance) ? Math.min(Math.max(prog.resonance as number, 0), 100) : 0,
            ...(typeof prog.locationId === 'string' && prog.locationId ? { locationId: prog.locationId } : {})
          }
        ];
      })
    )
  },
  heroes: Object.fromEntries(
    Object.entries({ ...initialState.heroes, ...(parsed.heroes || {}) }).map(([heroId, h]) => [
      heroId,
      // 天赋/觉醒字段（ticket 11/12）：旧存档缺失时补默认值，逐节点钳制等级并丢弃未知节点
      {
        ...h,
        talentPoints: Number.isFinite(h.talentPoints) ? Math.max(0, h.talentPoints) : 0,
        talents: normalizeTalents(heroId, h.talents),
        awakened: !!h.awakened
      }
    ])
  ),
  // 装备栏（ticket 10）：旧存档缺失时回退空表；逐槽归一化并钳制字段，防御损坏/半写入存档
  equipment: Object.fromEntries(
    Object.entries((parsed.equipment || {}) as Record<string, HeroEquipment>).map(([heroId, eq]) => [
      heroId,
      {
        weapon: normalizeSlot(eq?.weapon),
        armor: normalizeSlot(eq?.armor),
        trinket: normalizeSlot(eq?.trinket)
      }
    ])
  ),
  summon: {
    ...(initialState.summon || { pityCount: 0 }),
    ...(parsed.summon || {})
  },
  combat: {
    ...initialState.combat,
    ...(parsed.combat || {}),
    // 区域链通关记录：旧存档缺失时回退空列表
    zonesCleared: (parsed.combat && parsed.combat.zonesCleared) || initialState.combat.zonesCleared,
    // 离线挂机开关（ticket 08）：旧存档缺失时回退未挂机
    idle: {
      ...initialState.combat.idle,
      ...((parsed.combat && parsed.combat.idle) || {})
    }
  }
  };
};

// 加载存档（含离线结算）；无存档/损坏时返回全新状态
export const loadOrCreateState = (
  targetUser: string | null,
  initialState: GameState
): GameState => {
  const now = Date.now();

  if (!targetUser) {
    return createFreshState(initialState, now);
  }

  const saved = localStorage.getItem(getSaveKey(targetUser));
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as GameState;
      const elapsedSeconds = parsed.lastTick ? Math.max(0, Math.floor((now - parsed.lastTick) / 1000)) : 0;
      const mergedState = mergeSavedState(parsed, initialState);
      const { updatedState, report } = calculateDetailedOfflineProgress(mergedState, elapsedSeconds);
      return {
        ...updatedState,
        lastTick: now,
        dayStartTime: parsed.dayStartTime || now,
        lastOfflineReport: elapsedSeconds > 10 ? report : null
      };
    } catch (e) {
      console.error("Failed to load save", e);
    }
  }
  return createFreshState(initialState, now);
};

// 创建新角色存档（写入自描述 username）
export const createNewAccountState = (
  username: string,
  characterId: string,
  initialState: GameState
): GameState & { username: string } => {
  const now = Date.now();
  return {
    ...initialState,
    username,
    lastTick: now,
    dayStartTime: now,
    logs: [{ id: `init_${characterId}`, text: `▶ 生存者 ${username} 的避难所系统已初始化。`, timestamp: now, type: 'system' }]
  };
};
