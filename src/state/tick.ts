import type { GameState, LogEntry } from '../types/game';
import type { FacilityType } from '../data/facilities';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { processFacility, resolveDutyBonus, resolveShelterUpgrades } from './facility';
import { autoHarvestAndReplantUpdate, maybeStopAutoFarmOnSeedDepletion, resolveWatererBonuses } from './greenhouse';
import type { ReplantStrategy } from './greenhouse';
import { resolveDutyBonuses } from './duty';
import { getRecipeDisplayName } from './workshop';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { CROPS_CONFIG } from '../data/crops';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { ITEMS_CONFIG } from '../data/items';
import { HEROES_CONFIG } from '../data/heroes';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { COMBAT_ZONES } from '../data/combatZones';
import { recoverStamina, settleIdleUpdate } from './combat';

interface TickLogEntry {
  text: string;
  type: 'event' | 'logistics' | 'system';
}

// 游戏全局 Tick：推进发电机/回收站/温室/流水线/挂机探索/天数
export const applyTick = (prev: GameState, now: number): GameState => {
  // 13 号 R3 + 04 号 04b：无活跃系统且无需推进时返回原引用（React setState bailout，消除每秒整树重渲染）。
  // 活跃系统 = 发电机/回收站/温室作物/流水线设施/挂机探索/梦魇冻结；另需推进天数。
  // 体力每 staminaRegenSeconds 秒恢复 1 点：仅当体力**跨整点**（floor 进位）时才需推进，
  // 未跨整点的亚秒级恢复不触发渲染（recoverStamina 按 elapsedSeconds 累计，跳过不丢进度）。
  const hasActiveSystems =
    prev.shelter.generatorLevel > 0 ||
    prev.shelter.recyclerLevel > 0 ||
    prev.greenhouse.slots.some(s => s.cropId) ||
    Object.values(prev.shelter.facilities).some(units => units.some(u => (u.queue?.length ?? 0) > 0)) ||
    Object.keys(prev.shelter.upgrades || {}).length > 0 || // 基建升级施工中：保证进度条每秒刷新
    (prev.shelter.expedition.locationId != null && prev.shelter.assignedExplorerId != null) ||
    (prev.combat?.idle?.zoneId != null) ||
    prev.activeAlert.type === 'dream_leak';
  const staminaNotFull = (prev.stamina ?? 0) < (prev.maxStamina || COMBAT_CONFIG.maxStamina);
  const elapsedSeconds = Math.max(0, Math.floor((now - prev.lastTick) / 1000));
  const nextStamina = recoverStamina(
    prev.stamina ?? 0,
    prev.maxStamina || COMBAT_CONFIG.maxStamina,
    elapsedSeconds
  );
  const staminaCrossedInteger = Math.floor(nextStamina) > Math.floor(prev.stamina ?? 0);
  const needsDayTick = now - prev.dayStartTime >= GAME_CONSTANTS.GAME_DAY_SECONDS * 1000;
  if (!hasActiveSystems && !(staminaNotFull && staminaCrossedInteger) && !needsDayTick) {
    return prev;
  }

  // 梦魇入侵时冻结温室（基建升级仍按时间戳推进，此处先结算已完成的施工）
  if (prev.activeAlert.type === 'dream_leak') {
    const r = resolveShelterUpgrades(prev, now);
    if (r.completed.length > 0) {
      const entries: LogEntry[] = r.completed.map(c => ({
        id: `${now}_${Math.random()}`,
        text: c.text,
        timestamp: now,
        type: 'logistics'
      }));
      return { ...r.state, lastTick: now, logs: [...entries, ...(r.state.logs || [])].slice(0, 100) };
    }
    return { ...r.state, lastTick: now };
  }

  let currentInventory = { ...prev.inventory };
  let currentEnergy = prev.player.energy;
  const currentMaxEnergy = prev.player.maxEnergy || 100;

  let nextAccumulatedEnergy = prev.shelter.accumulatedEnergy ?? 0;
  let nextAccumulatedScrap = prev.shelter.accumulatedScrap ?? 0;

  // 0. 体力随时间恢复（战斗资源，独立于魔能/食物）——elapsedSeconds/nextStamina 已在短路判定前置计算

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

  // 2. 温室作物托管浇水与生长（06/07/09）
  const isWateredOnline = prev.shelter.assignedWatererId !== null;
  const updatedSlots = prev.greenhouse.slots.map(slot => {
    if (!slot.cropId) return slot;
    const config = (CROPS_CONFIG as any)[slot.cropId];
    if (!config) return slot;

    // 浇水=维持生长（06）：湿润作物按基础 1x 扣减，未湿润作物停滞（不扣减）；
    // 驻守速度加成（07/09）：湿润作物扣减 ×(1 + speedBonus)，按槽位作物解析（作物级 speed）
    const speedBonus = isWateredOnline ? resolveWatererBonuses(prev, slot.cropId).speedMultiplier : 0;
    const timeReduced = (slot.isWatered || isWateredOnline) ? 1 * (1 + speedBonus) : 0;
    const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
    const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

    return {
      ...slot,
      growthTimeLeft: newTimeLeft,
      growthProgress: progress,
      isWatered: isWateredOnline ? true : slot.isWatered
    };
  });

  // 驻守自动收割并补种（07/08）：在线每 tick 检查成熟槽收割 + 按策略播种
  const logsToAdd: TickLogEntry[] = [];
  let greenhouseSlots = updatedSlots;
  let finalAutoFarm = prev.greenhouse.autoFarm;
  if (isWateredOnline) {
    const autoFarm = prev.greenhouse.autoFarm;
    const autoFarmActive = autoFarm.enabled && !!autoFarm.cropId;
    const strategy: ReplantStrategy = autoFarmActive ? { cropId: autoFarm.cropId! } : 'original';
    const autoR = autoHarvestAndReplantUpdate(
      { ...prev, greenhouse: { ...prev.greenhouse, slots: updatedSlots }, inventory: currentInventory },
      strategy
    );
    greenhouseSlots = autoR.state.greenhouse.slots;
    currentInventory = autoR.state.inventory;
    if (autoR.result.harvested && Object.keys(autoR.result.harvested).length > 0) {
      const itemsStr = Object.entries(autoR.result.harvested)
        .map(([id, q]) => `${ITEMS_CONFIG[id]?.name || id} ×${q}`)
        .join('、');
      logsToAdd.push({
        text: `驻守 ${HEROES_CONFIG[prev.shelter.assignedWatererId!]?.name || '英雄'} 自动收割: ${itemsStr}`,
        type: 'logistics'
      });
    }
    // 挂机种子耗光 → 自动停止（08）
    if (autoFarmActive) {
      const seedState = maybeStopAutoFarmOnSeedDepletion({
        ...prev,
        inventory: currentInventory,
        greenhouse: { ...prev.greenhouse, slots: greenhouseSlots }
      });
      finalAutoFarm = seedState.greenhouse.autoFarm;
      if (!finalAutoFarm.enabled) {
        logsToAdd.push({ text: '挂机种子已耗光，温室挂机自动停止。', type: 'logistics' });
      }
    }
  }

  // 3. 工厂流水线 Tick：FIFO 配方队列顺序执行，纯自动运转（ticket 13）
  const updatedFacilities = { ...prev.shelter.facilities };

  (Object.keys(updatedFacilities) as FacilityType[]).forEach(type => {
    const units = updatedFacilities[type];
    const multiUnit = units.length > 1;
    updatedFacilities[type] = units.map((fac, unitIndex) => {
      const r = processFacility(fac, currentInventory, elapsedSeconds, resolveDutyBonus(prev, type, unitIndex).bonuses);
      Object.entries(r.completed).forEach(([recipeId, count]) => {
        const recipe = AUTO_RECIPES[recipeId];
        logsToAdd.push({
          text: `${fac.name}${multiUnit ? ` ${unitIndex + 1}号` : ''} 完成了 ${recipe ? getRecipeDisplayName(recipe) : recipeId} 的加工${count > 1 ? ` ×${count}` : ''}。`,
          type: 'logistics'
        });
      });
      return r.facility;
    });
  });

  // 4. 挂机探索派遣 Tick
  const exp = prev.shelter.expedition;
  let nextLastScavengeTime = exp.lastScavengeTime;
  let autoRecallExplorer = false;
  if (exp.locationId && prev.shelter.assignedExplorerId) {
    const loc = EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS];
    if (loc) {
      // 远征探索员加成（作用域化）：intervalReduction 缩短拾荒间隔，lootChanceBonus 提高掉落几率
      const explorerBonuses = resolveDutyBonuses(
        HEROES_CONFIG[prev.shelter.assignedExplorerId!]?.dutyMeta,
        { role: 'expedition' }
      );
      const actualInterval = Math.max(30, Math.floor(loc.scavengeInterval * (1 - explorerBonuses.intervalReduction)));

      const timeDiff = now - (exp.lastScavengeTime || exp.startTime || now);
      const ticks = Math.floor(timeDiff / (actualInterval * 1000));
      if (ticks > 0) {
        let scavengedCount: Record<string, number> = {};
        for (let t = 0; t < ticks; t++) {
          loc.lootTable.forEach(loot => {
            if (Math.random() <= Math.min(1, loot.chance + explorerBonuses.lootChanceBonus)) {
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
            return `${item?.name || id} ×${q}`;
          }).join(' ');
          logsToAdd.push({ text: `探索员 ${HEROES_CONFIG[prev.shelter.assignedExplorerId]?.name || '英雄'} 拾荒带回: ${itemsStr}`, type: 'logistics' as const });
        }
      }

      // 持续口粮消耗（ADR-0018）：按 rationConsumptionRate 计算消耗，耗尽自动召回
      if (loc.rationConsumptionRate && loc.rationConsumptionRate > 0) {
        const elapsedSinceLastTick = now - prev.lastTick;
        const rationsToConsume = Math.floor(elapsedSinceLastTick / (loc.rationConsumptionRate * 1000));
        if (rationsToConsume > 0) {
          const currentRations = currentInventory['ration'] || 0;
          if (currentRations <= rationsToConsume) {
            // 口粮耗尽：自动召回
            currentInventory['ration'] = 0;
            autoRecallExplorer = true;
            logsToAdd.push({ text: `口粮耗尽，远征探索员 ${HEROES_CONFIG[prev.shelter.assignedExplorerId]?.name || '英雄'} 被自动召回。`, type: 'logistics' as const });
          } else {
            currentInventory['ration'] = currentRations - rationsToConsume;
          }
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

  // 自动召回处理（口粮耗尽）：清除 explorer 的 logisticsFacilityId + 缓存 + expedition
  let updatedHeroes = prev.heroes;
  let finalShelter = {
    ...prev.shelter,
    facilities: updatedFacilities,
    expedition: {
      ...exp,
      lastScavengeTime: nextLastScavengeTime
    },
    accumulatedEnergy: nextAccumulatedEnergy,
    accumulatedScrap: nextAccumulatedScrap
  };

  if (autoRecallExplorer && prev.shelter.assignedExplorerId) {
    const explorerId = prev.shelter.assignedExplorerId;
    updatedHeroes = {
      ...prev.heroes,
      [explorerId]: { ...prev.heroes[explorerId], logisticsFacilityId: null }
    };
    finalShelter = {
      ...finalShelter,
      assignedExplorerId: null,
      expedition: { locationId: null, startTime: null, lastScavengeTime: null }
    };
  }

  // 4.5. 挂机战斗在线推进（修复 09：在线也持续自动战斗，不再只在离线重连时结算）
  const idleZoneId = prev.combat?.idle?.zoneId;
  const logsBeforeIdle = logsToAdd.length; // newLogs 已在挂机段之前构造，挂机日志需单独补入
  let finalCombat = prev.combat;
  let finalStamina = nextStamina;
  let finalInventory = currentInventory;
  let finalHeroes = updatedHeroes;
  if (idleZoneId) {
    const { state: afterIdle, result } = settleIdleUpdate(
      { ...prev, stamina: finalStamina, inventory: finalInventory, heroes: finalHeroes, combat: prev.combat },
      elapsedSeconds,
      Math.random,
      false // 在线：体力不足一场时保持挂机等待（体力恢复后继续），不自动停止
    );
    if (result.battlesFought > 0) {
      finalStamina = afterIdle.stamina;
      finalInventory = afterIdle.inventory;
      finalHeroes = afterIdle.heroes;
      const zoneName = COMBAT_ZONES[idleZoneId]?.name || idleZoneId;
      const stopText = result.autoStopped && result.stopReason === 'defeat'
        ? '，小队战败全员重伤，挂机自动停止'
        : '';
      logsToAdd.push({ text: `挂机战斗：在【${zoneName}】战斗 ${result.battlesFought} 场（胜 ${result.victories}），掉落与经验已入账${stopText}。`, type: 'logistics' as const });
    }
    // 无论是否结算，都要保留最新 combat（idle.accumulatedSeconds 逐秒累计）
    finalCombat = afterIdle.combat;
  }
  // 挂机日志补入 newLogs（挂机段在 newLogs 构造之后执行，避免日志丢失）
  if (logsToAdd.length > logsBeforeIdle) {
    const idleLogEntries: LogEntry[] = logsToAdd.slice(logsBeforeIdle).map(entry => ({
      id: `${Date.now()}_${Math.random()}`,
      text: entry.text,
      timestamp: Date.now(),
      type: entry.type
    }));
    newLogs = [...idleLogEntries, ...newLogs].slice(0, 100);
  }

  const assembled: GameState = {
    ...prev,
    player: { ...prev.player, energy: currentEnergy, days: newDays },
    stamina: finalStamina,
    inventory: finalInventory,
    greenhouse: { ...prev.greenhouse, slots: greenhouseSlots, autoFarm: finalAutoFarm },
    shelter: finalShelter,
    heroes: finalHeroes,
    combat: finalCombat,
    logs: newLogs,
    lastTick: now,
    dayStartTime: newDayStartTime
  };

  // 基建升级完成结算（时间戳驱动）：施工中已计入活跃系统，此处应用到期的升级并写日志
  const upgradeR = resolveShelterUpgrades(assembled, now);
  if (upgradeR.completed.length > 0) {
    const upgradeLogEntries: LogEntry[] = upgradeR.completed.map(c => ({
      id: `${now}_${Math.random()}`,
      text: c.text,
      timestamp: now,
      type: 'logistics'
    }));
    return { ...upgradeR.state, logs: [...upgradeLogEntries, ...(upgradeR.state.logs || [])].slice(0, 100) };
  }
  return upgradeR.state;
};
