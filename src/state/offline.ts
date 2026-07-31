import type { GameState, GreenhouseSlot, OfflineReport } from '../types/game';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { CROPS_CONFIG } from '../data/crops';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';

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
  elapsedSeconds: number
): { updatedState: GameState; report: OfflineReport } {
  const actualSeconds = Math.min(elapsedSeconds, state.shelter.maxOfflineDuration);
  const reportLogs: string[] = [];
  const recoveredItems: Record<string, number> = {};

  let currentInventory = { ...state.inventory };
  let currentEnergy = state.player.energy;

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
      reportLogs.push(`⚡ 避难所魔能发电机在挂机期间累计凝聚了 ${energyGained} 点魔能。`);
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
      reportLogs.push(`🔧 物资回收站自动收集并提炼了 ${scrapGained} 个废旧金属。`);
    }
  }

  // 3. 挂机派遣拾荒结算
  const exp = state.shelter.expedition;
  let nextLastScavengeTime = exp.lastScavengeTime;
  if (exp.locationId && state.shelter.assignedExplorerId) {
    const loc = EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS];
    if (loc) {
      const explorer = state.survivors[state.shelter.assignedExplorerId];
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
        reportLogs.push(`🤠 幸存者 ${explorer?.name || '探索员'} 挂机探索 ${loc.name} 结束，带回了物资。`);
      }
    }
  }

  // 4. 工厂自动化流水线结算
  const updatedFacilities = { ...state.shelter.facilities };
  Object.entries(updatedFacilities).forEach(([facId, fac]) => {
    if (fac.active === false || !fac.activeRecipeId) return;
    const recipe = AUTO_RECIPES[fac.activeRecipeId];
    if (!recipe) return;

    // 产线纯自动：效率由设施等级决定（每级 +10%，与 shelterUpgrades 配置一致）
    const speedBonus = 1 + fac.level * 0.1;
    const actualDuration = Math.max(1, Math.floor(recipe.duration / speedBonus));

    let facilityGained = 0;
    let facTimeLeft = fac.timeLeft;
    let tempInventory = { ...currentInventory };

    let remainingSeconds = actualSeconds;
    if (facTimeLeft > 0) {
      if (remainingSeconds < facTimeLeft) {
        facTimeLeft -= remainingSeconds;
        remainingSeconds = 0;
      } else {
        remainingSeconds -= facTimeLeft;
        facilityGained += 1;
        facTimeLeft = 0;
      }
    }

    if (remainingSeconds > 0) {
      const maxCycles = Math.floor(remainingSeconds / actualDuration);
      if (maxCycles > 0) {
        let limitCycles = maxCycles;
        Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
          const available = tempInventory[itemId] || 0;
          const possibleCycles = Math.floor(available / qtyNeeded);
          limitCycles = Math.min(limitCycles, possibleCycles);
        });

        if (limitCycles > 0) {
          Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
            tempInventory[itemId] = Math.max(0, (tempInventory[itemId] || 0) - qtyNeeded * limitCycles);
          });
          facilityGained += limitCycles;
          remainingSeconds -= limitCycles * actualDuration;
        }
      }

      if (remainingSeconds > 0) {
        let canStartNext = true;
        Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
          if ((tempInventory[itemId] || 0) < qtyNeeded) {
            canStartNext = false;
          }
        });
        if (canStartNext) {
          Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
            tempInventory[itemId] = (tempInventory[itemId] || 0) - qtyNeeded;
          });
          facTimeLeft = Math.max(1, Math.round(actualDuration - remainingSeconds));
        } else {
          facTimeLeft = 0;
        }
      } else {
        facTimeLeft = 0;
      }
    }

    // 无论本次离线是否产出了成品，凡是涉及到启动下一轮生产或者有原料消耗的改动，都必须同步写回给背包
    currentInventory = tempInventory;

    if (facilityGained > 0) {
      Object.entries(recipe.output).forEach(([itemId, qtyProduced]) => {
        const totalQty = qtyProduced * facilityGained;
        currentInventory[itemId] = (currentInventory[itemId] || 0) + totalQty;
        recoveredItems[itemId] = (recoveredItems[itemId] || 0) + totalQty;
      });
      reportLogs.push(`🏭 ${fac.name} 离线运转 ${facilityGained} 次，加工出 ${recipe.name} 产物。`);
    }

    const progress = facTimeLeft > 0 ? Math.min(100, Math.round(((actualDuration - facTimeLeft) / actualDuration) * 100)) : 0;
    updatedFacilities[facId] = {
      ...fac,
      timeLeft: facTimeLeft,
      currentProgress: progress
    };
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
    inventory: currentInventory,
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
      recoveredItems,
      logs: reportLogs
    }
  };
}
