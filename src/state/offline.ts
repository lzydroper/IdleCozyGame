import type { GameState, GreenhouseSlot, IdleCombatReport, OfflineReport } from '../types/game';
import type { FacilityType } from '../types/game';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { processFacility } from './facility';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { CROPS_CONFIG } from '../data/crops';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { COMBAT_ZONES } from '../data/combatZones';
import { ITEMS_CONFIG } from '../data/items';
import { HEROES_CONFIG } from '../data/heroes';
import { recoverStamina, settleIdleUpdate } from './combat';

// 纯函数：计算离线或Tick生长时间扣减
export function calculateOfflineProgress(
  slots: GreenhouseSlot[],
  elapsedSeconds: number,
  cropsConfig: Record<string, { growthTime: number }> = CROPS_CONFIG
): GreenhouseSlot[] {
  return slots.map(slot => {
    if (!slot.cropId) return slot;
    const config = cropsConfig[slot.cropId];
    if (!config) return slot;

    // 浇水倍速增长 (生长速度翻倍，相当于扣减时间速度变2倍)
    const speedMultiplier = slot.isWatered ? 2 : 1;
    const timeReduced = elapsedSeconds * speedMultiplier;
    const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
    const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

    return {
      ...slot,
      growthTimeLeft: newTimeLeft,
      growthProgress: progress
    };
  });
}

export function calculateDetailedOfflineProgress(
  state: GameState,
  elapsedSeconds: number,
  rng: () => number = Math.random
): { updatedState: GameState; report: OfflineReport } {
  const actualSeconds = Math.min(elapsedSeconds, state.shelter.maxOfflineDuration);
  const reportLogs: string[] = [];
  const recoveredItems: Record<string, number> = {};

  let currentInventory = { ...state.inventory };
  let currentEnergy = state.player.energy;

  // 1. 体力离线恢复（随时间恢复，封顶体力上限）
  const currentStamina = state.stamina || 0;
  const nextStamina = recoverStamina(currentStamina, state.maxStamina || COMBAT_CONFIG.maxStamina, actualSeconds);
  const recoveredStamina = Math.max(0, Math.floor(nextStamina - currentStamina));
  if (recoveredStamina > 0) {
    reportLogs.push(`战斗体力在挂机期间恢复了 ${recoveredStamina} 点。`);
  }

  // 1.5. 确认式离线挂机战斗结算（ticket 08）：仅当玩家在某区域主动开启挂机后才推进；
  // 体力耗尽或小队战败自动停止；未开启时离线不产生任何战斗结算
  let currentHeroes = { ...state.heroes };
  let currentSoulEchoes = state.soulEchoes;
  let currentCombat = state.combat;
  let finalStamina = nextStamina;
  let idleCombat: IdleCombatReport | null = null;
  const idleZoneId = state.combat?.idle?.zoneId;
  if (idleZoneId) {
    const { state: afterIdle, result } = settleIdleUpdate(
      { ...state, stamina: nextStamina },
      actualSeconds,
      rng
    );
    finalStamina = afterIdle.stamina;
    currentInventory = afterIdle.inventory;
    currentHeroes = afterIdle.heroes;
    currentSoulEchoes = afterIdle.soulEchoes;
    currentCombat = afterIdle.combat;

    if (result.battlesFought > 0 || result.autoStopped) {
      const zoneName = COMBAT_ZONES[idleZoneId]?.name || idleZoneId;
      idleCombat = {
        zoneId: idleZoneId,
        zoneName,
        battlesFought: result.battlesFought,
        victories: result.victories,
        defeats: result.defeats,
        draws: result.draws,
        drops: { ...result.drops },
        soulEchoesGained: result.soulEchoesGained,
        expPerHero: result.expPerHero,
        staminaConsumed: result.staminaConsumed,
        autoStopped: result.autoStopped,
        stopReason: result.stopReason
      };
      if (result.battlesFought > 0) {
        const dropsText = Object.entries(result.drops)
          .map(([id, qty]) => `${ITEMS_CONFIG[id]?.name || id} ×${qty}`)
          .join('、');
        const stopText = result.autoStopped
          ? (result.stopReason === 'defeat'
            ? '，小队战败全员重伤，挂机已自动停止'
            : '，体力耗尽，挂机已自动停止')
          : '';
        reportLogs.push(
          `挂机战斗：在【${zoneName}】战斗 ${result.battlesFought} 场（胜 ${result.victories} / 平 ${result.draws} / 败 ${result.defeats}），` +
          `获得 ${dropsText || '少量材料'}、灵魂残响 ×${result.soulEchoesGained}、经验 ×${result.expPerHero}/英雄${stopText}。`
        );
      } else {
        reportLogs.push(
          `挂机已自动停止：${result.stopReason === 'defeat' ? '小队战败全员重伤' : '体力耗尽'}，未进行战斗，剩余体力保留。`
        );
      }
    } else if (currentCombat.idle?.zoneId === null) {
      // 防御性停止（区域未知/队伍为空/重伤）：无战斗结算，仅日志提示
      reportLogs.push('挂机因队伍状态异常自动停止（区域未知/队伍为空/重伤），未产生战斗结算。');
    }
  }

  // 2. 发电机与回收站自动产出
  let energyGained = 0;
  const currentMaxEnergy = state.player.maxEnergy || 100;

  let finalAccumulatedEnergy = state.shelter.accumulatedEnergy || 0;
  if (state.shelter.generatorLevel > 0) {
    const genConfig = SHELTER_UPGRADES.generator.levels.find(l => l.level === state.shelter.generatorLevel);
    const generatorRate = genConfig ? genConfig.effectValue : 0;
    const totalOfflineEnergy = actualSeconds * generatorRate;
    energyGained = Math.floor(totalOfflineEnergy);

    // 合并离线与下线前的魔能累加器，避免极微小的精度损失
    finalAccumulatedEnergy += (totalOfflineEnergy - energyGained);
    if (finalAccumulatedEnergy >= 1) {
      const extraEnergy = Math.floor(finalAccumulatedEnergy);
      energyGained += extraEnergy;
      finalAccumulatedEnergy -= extraEnergy;
    }

    currentEnergy = Math.min(currentMaxEnergy, currentEnergy + energyGained);
    if (energyGained > 0) {
      reportLogs.push(`避难所魔能发电机在挂机期间累计凝聚了 ${energyGained} 点魔能。`);
    }
  }

  let scrapGained = 0;
  let finalAccumulatedScrap = state.shelter.accumulatedScrap || 0;
  if (state.shelter.recyclerLevel > 0) {
    const recConfig = SHELTER_UPGRADES.recycler.levels.find(l => l.level === state.shelter.recyclerLevel);
    const recyclerRate = recConfig ? recConfig.effectValue : 0;
    const totalOfflineScrap = actualSeconds * recyclerRate;
    scrapGained = Math.floor(totalOfflineScrap);

    // 合并离线与下线前的回收站累加器
    finalAccumulatedScrap += (totalOfflineScrap - scrapGained);
    if (finalAccumulatedScrap >= 1) {
      const extraScrap = Math.floor(finalAccumulatedScrap);
      scrapGained += extraScrap;
      finalAccumulatedScrap -= extraScrap;
    }

    if (scrapGained > 0) {
      currentInventory.scrap_metal = (currentInventory.scrap_metal || 0) + scrapGained;
      recoveredItems.scrap_metal = (recoveredItems.scrap_metal || 0) + scrapGained;
      reportLogs.push(`物资回收站自动收集并提炼了 ${scrapGained} 个废旧金属。`);
    }
  }

  // 3. 挂机派遣拾荒结算
  const exp = state.shelter.expedition;
  let nextLastScavengeTime = exp.lastScavengeTime;
  if (exp.locationId && state.shelter.assignedExplorerId) {
    const loc = EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS];
    if (loc) {
      const actualInterval = Math.max(30, Math.floor(loc.scavengeInterval));
      const scavengeTicks = Math.floor(actualSeconds / actualInterval);

      if (scavengeTicks > 0) {
        const baseScavengeTime = exp.lastScavengeTime || exp.startTime || Date.now();
        // 核心修复：更新 lastScavengeTime 时，必须加上全部流逝时间 elapsedSeconds (即便超出了离线时长上限)
        // 确保未被结算的多余溢出时间能够被彻底消耗，防止重新上线后被秒级 Tick 定时器恶意“补发”
        nextLastScavengeTime = baseScavengeTime + elapsedSeconds * 1000;
      }

      let scavengedCount: Record<string, number> = {};
      for (let i = 0; i < scavengeTicks; i++) {
        loc.lootTable.forEach(loot => {
          if (Math.random() <= loot.chance) {
            const qty = Math.floor(Math.random() * (loot.maxQty - loot.minQty + 1)) + loot.minQty;
            scavengedCount[loot.itemId] = (scavengedCount[loot.itemId] || 0) + qty;
          }
        });
      }

      Object.entries(scavengedCount).forEach(([itemId, qty]) => {
        currentInventory[itemId] = (currentInventory[itemId] || 0) + qty;
        recoveredItems[itemId] = (recoveredItems[itemId] || 0) + qty;
      });

      if (Object.keys(scavengedCount).length > 0) {
        reportLogs.push(`英雄 ${HEROES_CONFIG[state.shelter.assignedExplorerId]?.name || '探索员'} 挂机探索 ${loc.name} 结束，带回了物资。`);
      }
    }
  }

  // 4. 工厂自动化流水线结算（FIFO 配方队列，ticket 13）
  const updatedFacilities = { ...state.shelter.facilities };
  (Object.keys(updatedFacilities) as FacilityType[]).forEach(type => {
    const units = updatedFacilities[type];
    const multiUnit = units.length > 1;
    updatedFacilities[type] = units.map((fac, unitIndex) => {
      const r = processFacility(fac, currentInventory, actualSeconds);

      // 产出并入离线报告
      Object.entries(r.produced).forEach(([itemId, qty]) => {
        recoveredItems[itemId] = (recoveredItems[itemId] || 0) + qty;
      });

      const batches = Object.entries(r.completed);
      if (batches.length > 0) {
        const parts = batches
          .map(([recipeId, count]) => {
            const recipe = AUTO_RECIPES[recipeId];
            return `${recipe?.name || recipeId}${count > 1 ? ` ×${count}` : ''}`;
          })
          .join('、');
        reportLogs.push(`${fac.name}${multiUnit ? ` ${unitIndex + 1}号` : ''} 离线运转完成: ${parts}。`);
      }

      return r.facility;
    });
  });

  // 5. 温室作物离线生长结算
  const isWateredOffline = state.shelter.assignedWatererId !== null;
  const updatedSlots = state.greenhouse.slots.map(slot => {
    if (!slot.cropId) return slot;
    const config = (CROPS_CONFIG as any)[slot.cropId];
    if (!config) return slot;

    let speedMultiplier = (slot.isWatered || isWateredOffline) ? 2 : 1;
    const timeReduced = actualSeconds * speedMultiplier;
    const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
    const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

    return {
      ...slot,
      growthTimeLeft: newTimeLeft,
      growthProgress: progress,
      isWatered: isWateredOffline ? true : slot.isWatered
    };
  });

  const updatedState: GameState = {
    ...state,
    player: { ...state.player, energy: currentEnergy },
    stamina: finalStamina,
    inventory: currentInventory,
    heroes: currentHeroes,
    soulEchoes: currentSoulEchoes,
    combat: currentCombat,
    greenhouse: { ...state.greenhouse, slots: updatedSlots },
    shelter: {
      ...state.shelter,
      facilities: updatedFacilities,
      expedition: {
        ...exp,
        lastScavengeTime: nextLastScavengeTime
      },
      accumulatedEnergy: finalAccumulatedEnergy,
      accumulatedScrap: finalAccumulatedScrap
    }
  };

  return {
    updatedState,
    report: {
      elapsedSeconds,
      recoveredEnergy: energyGained,
      recoveredStamina,
      recoveredItems,
      logs: reportLogs,
      idleCombat
    }
  };
}
