import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import type { EquipmentSlot } from '../types/game';
import {
  EQUIPMENT_CONFIG,
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS,
  ENHANCE_MAX,
  enhanceCost,
  FORGE_COST
} from '../data/equipment';
import { ITEMS_CONFIG } from '../data/items';
import GameIcon from './GameIcon';
import { SLOT_ICON_MAP } from './iconMaps';
import { Backpack, Hammer } from 'lucide-react';
import { getEquippedItemStats, getSetEnhanceProgress } from '../state/equipment';
import { formatModifiers } from '../state/statSystem';

// 英雄装备面板（ticket 10）：3 槽穿戴 / 强化（上限 +30）/ 神话锻造 / 套装特效进度
const HeroEquipmentPanel: React.FC<{ heroId: string }> = ({ heroId }) => {
  const { state, equipItem, unequipItem, enhanceItem, forgeMythic } = useGame();
  const { showToast } = useToast();
  const [openSlot, setOpenSlot] = useState<EquipmentSlot | null>(null);

  const equip = state.equipment?.[heroId] || { weapon: null, armor: null, trinket: null };
  const inventory = state.inventory;
  const equipmentInventory = state.equipmentInventory || {};
  const stoneCount = inventory.enhance_stone || 0;

  const handleEquip = (slot: EquipmentSlot, itemId: string, index?: number) => {
    const ok = equipItem(heroId, slot, itemId, index);
    if (ok) {
      showToast(`已穿戴【${ITEMS_CONFIG[itemId]?.name || itemId}】`, 'success');
      setOpenSlot(null);
    } else {
      showToast('穿戴失败：背包中没有该装备。', 'error');
    }
  };

  const handleUnequip = (slot: EquipmentSlot) => {
    // ADR-0014 修订：卸下保留强化等级与神话状态，直接卸下无需确认
    if (unequipItem(heroId, slot)) {
      showToast('已卸下装备，返回背包（强化保留）。', 'success');
    }
  };

  const handleEnhance = (slot: EquipmentSlot) => {
    const item = equip[slot];
    if (!item) return;
    const cost = enhanceCost(item.enhance);
    const result = enhanceItem(heroId, slot);
    if (result === true) {
      showToast(`强化成功！${ITEMS_CONFIG[item.itemId]?.name || item.itemId} +${item.enhance + 1}`, 'success');
    } else if (result === 'no_stone') {
      showToast(`强化失败：需要强化魔晶 ×${cost}（工坊合成或战斗掉落）。`, 'error');
    } else if (result === 'maxed') {
      showToast('已强化至 +30 上限，可锻造为神话装备！', 'warning');
    } else if (result === 'mythic') {
      showToast('神话装备无法继续强化。', 'warning');
    }
  };

  const handleForge = (slot: EquipmentSlot) => {
    const result = forgeMythic(heroId, slot);
    if (result === true) {
      const item = equip[slot];
      const cfg = item && EQUIPMENT_CONFIG[item.itemId];
      showToast(`锻造成功！【${cfg?.mythicName || '神话装备'}】诞生，附带系列词条！`, 'success');
    } else if (result === 'no_materials') {
      const need = Object.entries(FORGE_COST).map(([id, q]) => `${ITEMS_CONFIG[id]?.name || id}×${q}`).join('、');
      showToast(`锻造失败：需要 ${need}。`, 'error');
    } else if (result === 'not_maxed') {
      showToast('仅 +30 装备可锻造为神话装备。', 'warning');
    }
  };

  // 背包中可穿戴的候选装备实例（同槽位，ADR-0014 修订：按实例逐条列出，含强化等级）
  const candidatesFor = (slot: EquipmentSlot) =>
    Object.entries(equipmentInventory)
      .filter(([itemId, instances]) => instances.length > 0 && EQUIPMENT_CONFIG[itemId]?.slot === slot)
      .flatMap(([itemId, instances]) => instances.map((instance, index) => ({ itemId, instance, index })))
      .sort(
        (a, b) =>
          EQUIPMENT_SETS[EQUIPMENT_CONFIG[a.itemId].set].name.localeCompare(
            EQUIPMENT_SETS[EQUIPMENT_CONFIG[b.itemId].set].name
          ) || b.instance.enhance - a.instance.enhance
      );

  // 套装特效进度展示
  const setProgress = getSetEnhanceProgress(equip);
  const hasAnyGear = EQUIPMENT_SLOTS.some(slot => equip[slot]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-amber-300/90 tracking-wide flex items-center gap-1">
          <Backpack className="w-3 h-3" /> 装备
        </span>
        <span className="text-[8px] text-zinc-600 font-bold">强化魔晶 ×{stoneCount}</span>
      </div>

      {/* 三槽装备 */}
      <div className="flex flex-col gap-1">
        {EQUIPMENT_SLOTS.map(slot => {
          const item = equip[slot];
          const cfg = item ? EQUIPMENT_CONFIG[item.itemId] : null;
          const stats = item ? getEquippedItemStats(item) : null;
          const cost = item && !item.mythic && item.enhance < ENHANCE_MAX ? enhanceCost(item.enhance) : 0;

          return (
            <div key={slot} className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5">
              <div className="flex items-center gap-2">
                {(() => { const SlotIcon = SLOT_ICON_MAP[slot]; return (
                <span className="text-[10px] w-8 shrink-0 text-zinc-500 font-bold flex items-center gap-0.5">
                  <SlotIcon className="w-3 h-3" />{EQUIPMENT_SLOT_LABELS[slot]}
                </span>
                ); })()}

                {item && cfg ? (
                  <>
                    <span className={`text-[10px] font-black truncate flex-1 ${item.mythic ? 'text-amber-300' : 'text-zinc-200'}`}>
                      {item.mythic ? cfg.mythicName : cfg.name}
                    </span>
                    <span className={`text-[9px] font-black shrink-0 ${item.mythic ? 'text-amber-400' : 'text-cyan-300'}`}>
                      {item.mythic ? '神话' : `+${item.enhance}`}
                    </span>
                    <button
                      onClick={() => handleUnequip(slot)}
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 cursor-pointer border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      title="卸下装备返回背包（强化等级保留）"
                    >
                      卸下
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] text-zinc-600 font-bold flex-1">空槽</span>
                    <button
                      onClick={() => setOpenSlot(openSlot === slot ? null : slot)}
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-950/60 cursor-pointer shrink-0"
                    >
                      装备
                    </button>
                  </>
                )}
              </div>

              {/* 属性与操作 */}
              {item && cfg && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {stats && (
                    <span className="text-[8px] text-zinc-500 font-bold">
                      {formatModifiers(stats) || '无属性'}
                    </span>
                  )}
                  <span className="flex-1" />
                  {!item.mythic && item.enhance < ENHANCE_MAX && (
                    <button
                      onClick={() => handleEnhance(slot)}
                      disabled={stoneCount < cost}
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                        stoneCount >= cost
                          ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-950/60'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed'
                      }`}
                      title={stoneCount >= cost ? `消耗强化魔晶 ×${cost}` : `强化魔晶不足（需要 ×${cost}）`}
                    >
                      强化 +{cost}
                    </button>
                  )}
                  {!item.mythic && item.enhance >= ENHANCE_MAX && (
                    <button
                      onClick={() => handleForge(slot)}
                      disabled={Object.entries(FORGE_COST).some(([id, q]) => (inventory[id] || 0) < q)}
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                        Object.entries(FORGE_COST).every(([id, q]) => (inventory[id] || 0) >= q)
                          ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed'
                      }`}
                      title="锻造为神话装备（更名/属性加强/附加系列词条）"
                    >
                      <Hammer className="w-2.5 h-2.5 inline mr-0.5" />
                      锻造神话
                    </button>
                  )}
                  {item.mythic && (
                    <span className="text-[8px] font-bold text-amber-500/80">系列词条已生效</span>
                  )}
                </div>
              )}

              {/* 候选装备选择器 */}
              {!item && openSlot === slot && (
                <div className="mt-1 flex flex-col gap-1 max-h-24 overflow-y-auto">
                  {candidatesFor(slot).length === 0 ? (
                    <span className="text-[8px] text-zinc-600 font-bold px-1">
                      背包中暂无该槽位装备 —— 工坊合成、梦境探索或区域 BOSS 掉落获取。
                    </span>
                  ) : (
                    candidatesFor(slot).map(({ itemId, instance, index }) => {
                      const c = EQUIPMENT_CONFIG[itemId];
                      return (
                        <button
                          key={`${itemId}-${index}`}
                          onClick={() => handleEquip(slot, itemId, index)}
                          className="text-left text-[9px] font-bold px-2 py-1 rounded border border-zinc-800 bg-zinc-900/60 hover:border-amber-500/40 text-zinc-300 cursor-pointer flex items-center gap-1.5"
                        >
                          <GameIcon type="item" id={itemId} className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{c.name}</span>
                          {instance.enhance > 0 && (
                            <span className="text-[8px] font-black text-amber-300 shrink-0">+{instance.enhance}</span>
                          )}
                          <span className="text-[8px] text-zinc-500">[{EQUIPMENT_SETS[c.set].name}]</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 套装特效进度 */}
      {hasAnyGear && Object.keys(setProgress).length > 0 && (
        <div className="flex flex-col gap-1">
          {Object.entries(setProgress).map(([setId, total]) => {
            const set = EQUIPMENT_SETS[setId];
            if (!set) return null;
            const active = set.tierEffects.filter(t => total >= t.threshold);
            return (
              <div key={setId} className="text-[8px] text-zinc-500 font-bold leading-relaxed">
                <span className="text-amber-400/90">[{set.name}] 强化 {Math.min(total, 30)}/30</span>
                <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900 mt-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
                    style={{ width: `${Math.min(100, (total / 30) * 100)}%` }}
                  />
                </div>
                <span className="text-zinc-600">
                  {active.length > 0
                    ? ` 特效：${active.map(t => formatModifiers(t.bonus)).join('、')}`
                    : ' 达 +10/+20/+30 触发套装特效'}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {!hasAnyGear && (
        <p className="text-[8px] text-zinc-600 font-bold leading-relaxed">
          获取途径：工坊合成废土系列 → 余烬图纸（旧城废墟 BOSS 掉落）→ 梦境探索掉落幽梦系列 → 最强星核系列仅辐射车间 BOSS 掉落。
        </p>
      )}
    </div>
  );
};

export default HeroEquipmentPanel;
