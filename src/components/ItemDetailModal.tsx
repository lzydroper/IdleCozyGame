import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { ITEMS_CONFIG } from '../data/items';
import { UI_TOKENS } from '../data/uiConstants';
import { EQUIPMENT_CONFIG, EQUIPMENT_SETS, EQUIPMENT_SLOT_LABELS } from '../data/equipment';
import { HEROES_CONFIG } from '../data/heroes';
import { getEquippedItemStats } from '../state/equipment';
import { formatModifiers, type StatModifier } from '../state/statSystem';
import GameIcon from './GameIcon';
import HeroHealModal from './HeroHealModal';
import { X } from 'lucide-react';
import type { EquippedItem, EquipmentSlot, PlayerStats } from '../types/game';

interface ItemDetailModalProps {
  itemId: string;
  onClose: () => void;
}

// 属性名 → 最大属性字段 / 显示标签（ADR-0016）
const STAT_MAX_KEY: Record<string, keyof PlayerStats> = {
  food: 'maxFood',
  energy: 'maxEnergy',
  sanity: 'maxSanity',
};
const STAT_LABEL: Record<string, string> = {
  food: '饱食度',
  energy: '魔能',
  sanity: '理智',
};
// 装备获取途径标签（ticket 10 装备生态）
const EQUIP_SOURCE_LABEL: Record<string, string> = {
  workshop: '工坊合成',
  blueprint: '图纸解锁',
  dreamscape: '梦境探险掉落',
  boss: '区域 BOSS 掉落',
};

const fmtEquipStats = (mods: StatModifier[]): string => formatModifiers(mods);

// 物品详情弹窗（ADR-0016）：固定尺寸（复用 UI_TOKENS.modalContainerStandard），
// 顶部统一展示图标/名称/持有数量/介绍（装备类附属性信息），底部使用区按类型：
// 恢复类/充能类 = 数量滑条（0 起步）+ 效果预览 + 「使用」；治愈类 = 「治愈重伤英雄」。
const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ itemId, onClose }) => {
  const { state, supplyItem } = useGame();
  const { showToast } = useToast();
  const [useCount, setUseCount] = useState(0);
  const [healModalOpen, setHealModalOpen] = useState(false);

  const meta = ITEMS_CONFIG[itemId];
  const qty = state.inventory[itemId] || 0;
  const statsEffect = meta?.useEffect?.stats;
  const pollutionEffect = meta?.useEffect?.pollution;
  const capsuleEffect = meta?.useEffect?.capsuleCharge;
  const isRestorative = !!statsEffect && Object.keys(statsEffect).length > 0;
  const isCapsule = !!capsuleEffect && Object.keys(capsuleEffect).length > 0;
  // 治愈类道具（ADR-0016）：当前唯一为纳米修复剂，使用 → 重伤英雄多选界面
  const isHealItem = itemId === 'nanite_injector';
  const hasUseArea = isRestorative || isCapsule || isHealItem;
  const equipCfg = EQUIPMENT_CONFIG[itemId];
  const equipSet = equipCfg ? EQUIPMENT_SETS[equipCfg.set] : undefined;
  // 背包装备实例与已穿戴实例（ADR-0014 修订）：详情展示强化等级与强化后属性
  const heldInstances = equipCfg ? state.equipmentInventory?.[itemId] || [] : [];
  const wornInstances = equipCfg
    ? Object.entries(state.equipment || {}).flatMap(([heroId, heroEquip]) =>
        (['weapon', 'armor', 'trinket'] as EquipmentSlot[])
          .filter(slot => heroEquip?.[slot]?.itemId === itemId)
          .map(slot => ({ heroId, item: heroEquip[slot] as EquippedItem }))
      )
    : [];

  const name = meta?.name || itemId;
  const description = meta?.description || '';

  // 滑条上限：恢复类 = min(拥有数, 主效果容量)；充能类 = 拥有数（无属性封顶，ADR-0016）
  let maxUse = qty;
  const mainEntry = isRestorative && statsEffect ? Object.entries(statsEffect)[0] : undefined;
  if (mainEntry) {
    const [stat, val] = mainEntry;
    if (val > 0) {
      const current = state.player[stat as keyof PlayerStats] as number;
      const max = state.player[STAT_MAX_KEY[stat]] as number;
      const capacity = Math.max(0, Math.ceil((max - current) / val));
      maxUse = Math.min(maxUse, capacity);
    }
  }
  const safeCount = maxUse > 0 ? Math.min(useCount, maxUse) : 0;

  // 实际生效值（含封顶）：如 81/100 + 30 → +19（已满 100）；胶囊显示梦境充能次数
  const effectText = (n: number): string => {
    if (isCapsule) return `梦境充能 +${n} 次`;
    const parts: string[] = [];
    if (statsEffect) {
      for (const [stat, val] of Object.entries(statsEffect)) {
        const current = state.player[stat as keyof PlayerStats] as number;
        const max = state.player[STAT_MAX_KEY[stat]] as number;
        const rawTarget = current + val * n;
        const target = val > 0 ? Math.min(max, rawTarget) : Math.max(0, rawTarget);
        const delta = target - current;
        const capped = target !== rawTarget;
        parts.push(`${STAT_LABEL[stat] ?? stat} ${delta > 0 ? '+' : ''}${delta}${capped ? '（已满）' : ''}`);
      }
    }
    if (pollutionEffect !== undefined) {
      const current = state.exploration.dreamPollution;
      const rawTarget = current + pollutionEffect * n;
      const target = Math.max(0, rawTarget);
      const delta = target - current;
      const capped = target !== rawTarget;
      parts.push(`污染 ${delta}${capped ? '（已为 0）' : ''}`);
    }
    return parts.join('｜');
  };

  const handleUse = () => {
    if (maxUse <= 0 || safeCount <= 0) return;
    const ok = supplyItem(itemId, safeCount);
    if (ok) showToast(`使用 ${safeCount} 个${name}成功`, 'success');
    // 弹窗停留：数量/滑条由 state 驱动实时更新，计数重置为未选
    setUseCount(0);
  };

  return createPortal(
    <div
      data-testid="item-detail-backdrop"
      onClick={onClose}
      className={UI_TOKENS.modalBackdrop}
    >
      <div
        data-testid="item-detail-container"
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerStandard}
      >
        {/* Header：物品名 + 关闭 */}
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <h3 className="text-base font-black text-zinc-100 truncate">{name}</h3>
          <button
            onClick={onClose}
            aria-label="关闭详情"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 内容区（顶部统一排列，随内容滚动）：大图标 + 持有数量（仅计数物品）+ 描述 + 装备信息 */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-3 pt-5">
          <GameIcon type="item" id={itemId} className="w-20 h-20" />
          {/* 装备不可堆叠（ADR-0017 实例化）：不显示「持有 ×N」数量徽章，持有信息由装备区实例概要承担 */}
          {!equipCfg && (
            <span className="text-xs font-black text-emerald-400 bg-zinc-900/90 border border-zinc-850 px-2.5 py-1 rounded-md">
              持有 ×{qty}
            </span>
          )}
          <p className="text-xs text-zinc-300 leading-relaxed text-center px-3">
            {description || '暂无介绍'}
          </p>

          {/* 装备类：槽位/系列/基础属性/强化成长/套装特效/获取途径（ticket 10 装备生态） */}
          {equipCfg && (
            <div className="w-full mt-2 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5 text-left">
              <p className="text-[11px] font-black text-amber-300">
                {EQUIPMENT_SLOT_LABELS[equipCfg.slot]} · {equipSet?.name ?? equipCfg.set}
                {equipSet?.factionLabel ? ` ${equipSet.factionLabel}` : ''}
              </p>
              <p className="text-[11px] text-zinc-300">
                <span className="text-zinc-500">基础属性：</span>
                {fmtEquipStats(equipCfg.baseStats)}
              </p>
              <p className="text-[11px] text-zinc-300">
                <span className="text-zinc-500">每 +1 强化：</span>
                {fmtEquipStats(equipCfg.statPerEnhance)}
              </p>
              {equipSet?.tierEffects.map(t => (
                <p key={t.threshold} className="text-[10px] text-zinc-400">
                  套装 +{t.threshold}：{formatModifiers(t.bonus)}
                </p>
              ))}
              {equipSet?.mythicAffix.length ? (
                <p className="text-[10px] text-purple-300">神话词条：{formatModifiers(equipSet.mythicAffix)}</p>
              ) : null}
              <p className="text-[10px] text-zinc-500">
                获取：{EQUIP_SOURCE_LABEL[equipCfg.source] ?? equipCfg.source}
              </p>
              {/* 背包持有实例与已穿戴实例（ADR-0017 修订：装备不可堆叠，逐实例列出） */}
              {heldInstances.length > 0 && (
                <div className="pt-1 border-t border-zinc-800/80 space-y-1">
                  <p className="text-[10px] font-black text-emerald-400">背包持有实例：</p>
                  {heldInstances.map((inst, i) => (
                    <p key={i} className="text-[10px] text-zinc-400">
                      {inst.mythic ? '神话' : inst.enhance > 0 ? `+${inst.enhance}` : '未强化'} ·{' '}
                      {fmtEquipStats(getEquippedItemStats(inst, undefined))}
                    </p>
                  ))}
                </div>
              )}
              {wornInstances.length > 0 && (
                <div className="pt-1 border-t border-zinc-800/80 space-y-1">
                  <p className="text-[10px] font-black text-cyan-300">已穿戴实例（强化后属性）：</p>
                  {wornInstances.map(({ heroId, item }) => (
                    <p key={heroId} className="text-[10px] text-zinc-400">
                      {HEROES_CONFIG[heroId]?.name || heroId} · {item.mythic ? '神话' : item.enhance > 0 ? `+${item.enhance}` : '未强化'} ·{' '}
                      {fmtEquipStats(getEquippedItemStats(item, HEROES_CONFIG[heroId]?.faction))}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 使用区：恢复类/充能类 = 数量滑条（0 起步）+ 效果预览 + 「使用」；治愈类 = 「治愈重伤英雄」 */}
        {hasUseArea ? (
          <div className="shrink-0 border-t border-zinc-800 pt-3 mt-3 flex flex-col gap-2">
            {isHealItem ? (
              <button
                data-testid="use-item-button"
                onClick={() => setHealModalOpen(true)}
                disabled={qty <= 0}
                className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-sm rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
              >
                使用
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">使用数量</span>
                  <span className="text-xs font-black text-emerald-400">{safeCount} / {maxUse}</span>
                </div>
                <input
                  data-testid="use-count-slider"
                  type="range"
                  min={0}
                  max={Math.max(1, maxUse)}
                  value={safeCount}
                  disabled={maxUse <= 0}
                  onChange={(e) => setUseCount(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <p data-testid="use-effect-text" className="text-[11px] text-zinc-300 text-center">
                  {qty <= 0
                    ? '物品已用完'
                    : maxUse <= 0
                      ? '属性已满，无法使用'
                      : safeCount <= 0
                        ? '请选择使用数量'
                        : effectText(safeCount)}
                </p>
                <button
                  data-testid="use-item-button"
                  onClick={handleUse}
                  disabled={maxUse <= 0 || safeCount <= 0}
                  className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-sm rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
                >
                  使用
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="shrink-0" />
        )}
      </div>

      {/* 治愈类：重伤英雄多选界面（ticket 05） */}
      {healModalOpen && <HeroHealModal onClose={() => setHealModalOpen(false)} />}
    </div>,
    document.body
  );
};

export default ItemDetailModal;
