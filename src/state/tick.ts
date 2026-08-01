import type { GameState, LogEntry } from '../types/game';
import type { FacilityType } from '../types/game';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { processFacility } from './facility';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { CROPS_CONFIG } from '../data/crops';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { ITEMS_CONFIG } from '../data/items';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { recoverStamina } from './combat';

interface TickLogEntry {
  text: string;
  type: 'event' | 'logistics' | 'system';
}

// 游戏全局 Tick：推进发电机/回收站/温室/流水线/挂机探索/天数
export const applyTick = (prev: GameState, now: number): GameState => {
  // 梦魇入侵时冻结温室
  if (prev.activeAlert.type === 'dream_leak') {
    return { ...prev, lastTick: now };
  }

  let currentInventory = { ...prev.inventory };
  let currentEnergy = prev.player.energy;
  const currentMaxEnergy = prev.player.maxEnergy || 100;

  let nextAccumulatedEnergy = prev.shelter.accumulatedEnergy ?? 0;
  let nextAccumulatedScrap = prev.shelter.accumulatedScrap ?? 0;

  // 0. 体力随时间恢复（战斗资源，独立于魔能/食物）
  const elapsedSeconds = Math.max(0, Math.floor((now - prev.lastTick) / 1000));
  const nextStamina = recoverStamina(
    prev.stamina ?? 0,
    prev.maxStamina || COMBAT_CONFIG.maxStamina,
    elapsedSeconds
  );

  // 1. 发电机与回收站自动产出
  if (prev.shelter.generatorLevel > 0) {
    const genConfig = SHELTER_UPGRADES.generator.levels.find(l => l.level === prev.shelter.generatorLevel);
    const generatorRate = genConfig ? genConfig.effectValue : 0;
    const energyGained = generatorRate;
    nextAccumulatedEnergy += energyGained;
  }

  if (prev.shelter.recyclerLevel > 0) {
    const recConfig = SHELTER_UPGRADES.recycler.levels.find(l => l.level === prev.shelter.recyclerLevel);
    const recyclerRate = recConfig ? recConfig.effectValue : 0;
    const scrapGained = recyclerRate;
    nextAccumulatedScrap += scrapGained;
  }

  if (nextAccumulatedEnergy >= 1) {
    const intEnergy = Math.floor(nextAccumulatedEnergy);
    currentEnergy = Math.min(currentMaxEnergy, currentEnergy + intEnergy);
    nextAccumulatedEnergy -= intEnergy;
  }

  if (nextAccumulatedScrap >= 1) {
    const intScrap = Math.floor(nextAccumulatedScrap);
    currentInventory.scrap_metal = (currentInventory.scrap_metal || 0) + intScrap;
    nextAccumulatedScrap -= intScrap;
  }

  // 2. 温室作物托管浇水与生长
  const isWateredOnline = prev.shelter.assignedWatererId !== null;
  const updatedSlots = prev.greenhouse.slots.map(slot => {
    if (!slot.cropId) return slot;
    const config = (CROPS_CONFIG as any)[slot.cropId];
    if (!config) return slot;

    let speedMultiplier = (slot.isWatered || isWateredOnline) ? 2 : 1;
    const timeReduced = 1 * speedMultiplier;
    const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
    const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

    return {
      ...slot,
      growthTimeLeft: newTimeLeft,
      growthProgress: progress,
      isWatered: isWateredOnline ? true : slot.isWatered
    };
  });

  // 3. 工厂流水线 Tick：FIFO 配方队列顺序执行，纯自动运转（ticket 13）
  const updatedFacilities = { ...prev.shelter.facilities };
  const logsToAdd: TickLogEntry[] = [];

  (Object.keys(updatedFacilities) as FacilityType[]).forEach(type => {
    const units = updatedFacilities[type];
    const multiUnit = units.length > 1;
    updatedFacilities[type] = units.map((fac, unitIndex) => {
      const r = processFacility(fac, currentInventory, elapsedSeconds);
      Object.entries(r.completed).forEach(([recipeId, count]) => {
        const recipe = AUTO_RECIPES[recipeId];
        logsToAdd.push({
          text: `🏭 ${fac.name}${multiUnit ? ` ${unitIndex + 1}号` : ''} 完成了 ${recipe?.name || recipeId} 的加工${count > 1 ? ` ×${count}` : ''}。`,
          type: 'logistics'
        });
      });
      return r.facility;
    });
  });

  // 4. 挂机探索派遣 Tick
  const exp = prev.shelter.expedition;
  let nextLastScavengeTime = exp.lastScavengeTime;
  if (exp.locationId && prev.shelter.assignedExplorerId) {
    const loc = EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS];
    if (loc) {
      const explorer = prev.survivors[prev.shelter.assignedExplorerId];
      const actualInterval = Math.max(30, Math.floor(loc.scavengeInterval));

      const timeDiff = now - (exp.lastScavengeTime || exp.startTime || now);
      const ticks = Math.floor(timeDiff / (actualInterval * 1000));
      if (ticks > 0) {
        let scavengedCount: Record<string, number> = {};
        for (let t = 0; t < ticks; t++) {
          loc.lootTable.forEach(loot => {
            if (Math.random() <= loot.chance) {
              const qty = Math.floor(Math.random() * (loot.maxQty - loot.minQty + 1)) + loot.minQty;
              scavengedCount[loot.itemId] = (scavengedCount[loot.itemId] || 0) + qty;
            }
          });
        }

        Object.entries(scavengedCount).forEach(([itemId, qty]) => {
          currentInventory[itemId] = (currentInventory[itemId] || 0) + qty;
        });

        nextLastScavengeTime = (exp.lastScavengeTime || exp.startTime || now) + ticks * actualInterval * 1000;

        if (Object.keys(scavengedCount).length > 0) {
          const itemsStr = Object.entries(scavengedCount).map(([id, q]) => {
            const item = ITEMS_CONFIG[id];
            return `${item?.emoji || ''} ${item?.name || id} ×${q}`;
          }).join(' ');
          logsToAdd.push({ text: `🤠 探索员 ${explorer?.name || '幸存者'} 拾荒带回: ${itemsStr}`, type: 'logistics' as const });
        }
      }
    }
  }

  // 天数递增
  let newDays = prev.player.days;
  let newDayStartTime = prev.dayStartTime;
  if (now - prev.dayStartTime >= GAME_CONSTANTS.GAME_DAY_SECONDS * 1000) {
    newDays += 1;
    newDayStartTime = now;
  }

  // 更新日志
  let newLogs = prev.logs;
  if (logsToAdd.length > 0) {
    const logEntries: LogEntry[] = logsToAdd.map(entry => ({
      id: `${Date.now()}_${Math.random()}`,
      text: entry.text,
      timestamp: Date.now(),
      type: entry.type
    }));
    newLogs = [...logEntries, ...prev.logs].slice(0, 100);
  }

  return {
    ...prev,
    player: { ...prev.player, energy: currentEnergy, days: newDays },
    stamina: nextStamina,
    inventory: currentInventory,
    greenhouse: { ...prev.greenhouse, slots: updatedSlots },
    shelter: {
      ...prev.shelter,
      facilities: updatedFacilities,
      expedition: {
        ...exp,
        lastScavengeTime: nextLastScavengeTime
      },
      accumulatedEnergy: nextAccumulatedEnergy,
      accumulatedScrap: nextAccumulatedScrap
    },
    logs: newLogs,
    lastTick: now,
    dayStartTime: newDayStartTime
  };
};
