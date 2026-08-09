import type { GameState, GreenhouseSlot, IdleCombatReport, OfflineReport } from '../types/game';
import type { FacilityType } from '../data/facilities';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { processFacility, resolveDutyBonus, resolveShelterUpgrades } from './facility';
import { resolveDutyBonuses } from './duty';
import { advanceGreenhouseAutomation, maybeStopAutoFarmOnSeedDepletion } from './greenhouse';
import type { ReplantStrategy } from './greenhouse';
import { getRecipeName } from './workshop';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { CROPS_CONFIG } from '../data/crops';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { COMBAT_ZONES } from '../data/combatZones';
import { ITEMS_CONFIG } from '../data/items';
import { HEROES_CONFIG } from '../data/heroes';
import { recoverStamina, settleIdleUpdate } from './combat';
import { addItemRewards } from './equipment';

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

    // 浇水=维持生长（06）：湿润作物按基础 1x 扣减，未湿润作物停滞（不扣减）
    const timeReduced = slot.isWatered ? elapsedSeconds : 0;
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
  rng: () => number = Math.random,
  now = Date.now()
): { updatedState: GameState; report: OfflineReport } {
  // 0. 基建升级完成结算（先应用再结算产出）：离线期间完成的升级立即生效，
  //    之后全部离线产出（含 maxOfflineDuration 封顶）按新等级计算
  const upgraded = resolveShelterUpgrades(state, now);
  state = upgraded.state; // 重新绑定为升级结算后的状态（无施工时为同一引用，纯函数不变性保持）
  const actualSeconds = Math.min(elapsedSeconds, state.shelter.maxOfflineDuration);
  // 升级完成由 report.completedUpgrades 单独区块展示，不重复进运转明细
  const reportLogs: string[] = [];
  const recoveredItems: Record<string, number> = {};

  let currentInventory = { ...state.inventory };
  let currentEquipmentInventory = { ...state.equipmentInventory };
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
    currentEquipmentInventory = afterIdle.equipmentInventory;
    currentHeroes = afterIdle.heroes;
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
  let autoRecallExplorerId: string | null = null;
  if (exp.locationId && state.shelter.assignedExplorerId) {
    const loc = EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS];
    if (loc) {
      // 远征探索员加成（作用域化）：intervalReduction 缩短拾荒间隔，lootChanceBonus 提高掉落几率
      const explorerBonuses = resolveDutyBonuses(
        HEROES_CONFIG[state.shelter.assignedExplorerId!]?.dutyMeta,
        { role: 'expedition' }
      );
      const actualInterval = Math.max(30, Math.floor(loc.scavengeInterval * (1 - explorerBonuses.intervalReduction)));
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
          if (Math.random() <= Math.min(1, loot.chance + explorerBonuses.lootChanceBonus)) {
            const qty = Math.floor(Math.random() * (loot.maxQty - loot.minQty + 1)) + loot.minQty;
            scavengedCount[loot.itemId] = (scavengedCount[loot.itemId] || 0) + qty;
          }
        });
      }

      // 派遣入账（ADR-0017 修订）：可穿戴装备实例化，其余计数
      Object.entries(scavengedCount).forEach(([itemId, qty]) => {
        const r = addItemRewards(currentInventory, currentEquipmentInventory, { [itemId]: qty });
        currentInventory = r.inventory;
        currentEquipmentInventory = r.equipmentInventory;
        recoveredItems[itemId] = (recoveredItems[itemId] || 0) + qty;
      });

      if (Object.keys(scavengedCount).length > 0) {
        reportLogs.push(`英雄 ${HEROES_CONFIG[state.shelter.assignedExplorerId]?.name || '探索员'} 挂机探索 ${loc.name} 结束，带回了物资。`);
      }

      // 持续口粮消耗（ADR-0018）：离线期间按 rationConsumptionRate 消耗口粮
      if (loc.rationConsumptionRate && loc.rationConsumptionRate > 0) {
        const rationsToConsume = Math.floor(elapsedSeconds / loc.rationConsumptionRate);
        if (rationsToConsume > 0) {
          const currentRations = currentInventory['ration'] || 0;
          if (currentRations <= rationsToConsume) {
            // 口粮耗尽：自动召回
            currentInventory['ration'] = 0;
            reportLogs.push(`口粮耗尽，远征探索员 ${HEROES_CONFIG[state.shelter.assignedExplorerId]?.name || '英雄'} 被自动召回。`);
            // 标记需要自动召回（在返回 state 时处理）
            autoRecallExplorerId = state.shelter.assignedExplorerId;
          } else {
            currentInventory['ration'] = currentRations - rationsToConsume;
          }
        }
      }
    }
  }

  // 4. 工厂自动化流水线结算（单任务批量推进，issue 06）
  const updatedFacilities = { ...state.shelter.facilities };
  (Object.keys(updatedFacilities) as FacilityType[]).forEach(type => {
    const units = updatedFacilities[type];
    const multiUnit = units.length > 1;
    updatedFacilities[type] = units.map((fac, unitIndex) => {
      const r = processFacility(fac, currentInventory, actualSeconds, resolveDutyBonus(state, type, unitIndex).bonuses);

      // 产出并入离线报告
      Object.entries(r.produced).forEach(([itemId, qty]) => {
        recoveredItems[itemId] = (recoveredItems[itemId] || 0) + qty;
      });

      const batches = Object.entries(r.completed);
      if (batches.length > 0) {
        const parts = batches
          .map(([recipeId, count]) => {
            const recipe = AUTO_RECIPES[recipeId];
            return `${recipe ? getRecipeName(recipe) : recipeId} ×${count} 批`;
          })
          .join('、');
        reportLogs.push(`${fac.name}${multiUnit ? ` ${unitIndex + 1}号` : ''} 离线运转完成: ${parts}。`);
      }

      return r.facility;
    });
  });

  // 5. 温室作物离线生长结算（06）+ 驻守自动收割播种（07）
  let finalGreenhouse = state.greenhouse;
  if (state.shelter.assignedWatererId) {
    // 驻守：循环「自动浇水 → 生长（含速度加成） → 收割+播种」，多轮结算
    const autoFarm = state.greenhouse.autoFarm;
    const autoFarmActive = autoFarm.enabled && !!autoFarm.cropId;
    const strategy: ReplantStrategy = autoFarmActive ? { cropId: autoFarm.cropId! } : 'original';
    const autoR = advanceGreenhouseAutomation(
      { ...state, inventory: currentInventory },
      actualSeconds,
      strategy
    );
    finalGreenhouse = autoR.state.greenhouse;
    currentInventory = autoR.state.inventory;
    if (autoR.result.harvested && Object.keys(autoR.result.harvested).length > 0) {
      Object.entries(autoR.result.harvested).forEach(([itemId, qty]) => {
        recoveredItems[itemId] = (recoveredItems[itemId] || 0) + qty;
      });
      const itemsStr = Object.entries(autoR.result.harvested)
        .map(([id, q]) => `${ITEMS_CONFIG[id]?.name || id} ×${q}`)
        .join('、');
      reportLogs.push(`驻守 ${HEROES_CONFIG[state.shelter.assignedWatererId]?.name || '英雄'} 离线自动收割: ${itemsStr}`);
    }
    // 挂机种子耗光 → 自动停止（08）
    if (autoFarmActive) {
      const seedState = maybeStopAutoFarmOnSeedDepletion({
        ...state,
        inventory: currentInventory,
        greenhouse: finalGreenhouse
      });
      finalGreenhouse = seedState.greenhouse;
      if (!seedState.greenhouse.autoFarm.enabled) {
        reportLogs.push('挂机种子已耗光，温室挂机自动停止。');
      }
    }
  } else {
    // 无驻守：仅生长推进（06：湿润 1x、未湿润停滞）
    const updatedSlots = state.greenhouse.slots.map(slot => {
      if (!slot.cropId) return slot;
      const config = (CROPS_CONFIG as any)[slot.cropId];
      if (!config) return slot;
      const timeReduced = slot.isWatered ? actualSeconds : 0;
      const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
      const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));
      return { ...slot, growthTimeLeft: newTimeLeft, growthProgress: progress };
    });
    finalGreenhouse = { ...state.greenhouse, slots: updatedSlots };
  }

  let updatedState: GameState = {
    ...state,
    player: { ...state.player, energy: currentEnergy },
    stamina: finalStamina,
    inventory: currentInventory,
    equipmentInventory: currentEquipmentInventory,
    heroes: currentHeroes,
    combat: currentCombat,
    greenhouse: finalGreenhouse,
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

  // 自动召回处理（口粮耗尽）：清除 explorer 的 logisticsFacilityId + 缓存 + expedition
  if (autoRecallExplorerId) {
    const explorerHero = currentHeroes[autoRecallExplorerId];
    if (explorerHero) {
      currentHeroes = {
        ...currentHeroes,
        [autoRecallExplorerId]: { ...explorerHero, logisticsFacilityId: null }
      };
    }
    updatedState = {
      ...updatedState,
      heroes: currentHeroes,
      shelter: {
        ...updatedState.shelter,
        assignedExplorerId: null,
        expedition: { locationId: null, startTime: null, lastScavengeTime: null }
      }
    };
  }

  return {
    updatedState,
    report: {
      elapsedSeconds,
      recoveredEnergy: energyGained,
      recoveredStamina,
      recoveredItems,
      logs: reportLogs,
      completedUpgrades: upgraded.completed.length > 0 ? upgraded.completed.map(c => `${c.text}（离线期间完成）`) : undefined,
      idleCombat
    }
  };
}
