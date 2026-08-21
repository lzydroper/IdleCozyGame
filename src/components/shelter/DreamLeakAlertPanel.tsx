import React from 'react';
import { useGame } from '../../context/GameContext';
import { useToast } from '../ToastSystem';
import { NIGHTMARE_CONFIG } from '../../data/nightmareConfig';
import { getDreamLockdownMinutes } from '../../state/nightmare';
import { ShieldAlert, Siren, Skull, Shield, HeartCrack, HeartPulse } from 'lucide-react';

// 梦魇入侵警报控制台（ticket 05：从工坊迁出 → 避难所运营页顶部）：
// 入侵者 HP 条 + 出战小队状态 + 炮塔/直接出战；无入侵时不渲染
const DreamLeakAlertPanel: React.FC = () => {
  const { state, defendDreamLeak } = useGame();
  const { showToast } = useToast();
  const activeAlert = state.activeAlert;

  if (activeAlert.type !== 'dream_leak') return null;

  // 抵御梦魇入侵（ticket 14）：出战当前小队防御，炮塔可选开战前辅助输出一轮
  const handleDefendNightmare = (method: 'turret' | 'direct') => {
    const outcome = defendDreamLeak(method);
    if (outcome.failure) {
      const failureMsg: Record<string, string> = {
        no_alert: '当前没有梦魇入侵。',
        no_party: '请先在英雄面板上阵小队，才能出战防御！',
        wounded: '小队全员重伤，请先用纳米修复剂治愈英雄！',
        no_turret: '没有可部署的防御炮塔！'
      };
      showToast(failureMsg[outcome.failure], "error");
      return;
    }

    if (outcome.victory) {
      showToast("防御成功！梦魇被击退，获得虚空核心！", "success");
    } else if (outcome.partyWiped) {
      showToast(`防御失败！小队全员重伤，梦境被封锁 ${getDreamLockdownMinutes()} 分钟。`, "error");
    } else {
      showToast("梦魇退回阴影深处，可稍后再次迎战。", "info");
    }
  };

  const inventory = state.inventory;

  return (
    <div className="p-5 rounded-3xl bg-red-950/30 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse flex flex-col gap-4">
      <div className="text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-black text-red-400 flex items-center justify-center gap-1.5"><Siren className="w-5 h-5 text-red-500" /> 警告：心灵梦魇入侵！</h3>
        <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">
          虚空缝隙已被撕裂！梦魇怪物顺着精神印记降临避难所，温室农田已被污染，植物已**停止生长**！请出战当前小队歼灭怪兽；防御失败将导致全员重伤并封锁梦境入口。
        </p>
      </div>

      {/* 怪物血量条 */}
      <div className="p-3 bg-zinc-950 rounded-2xl border border-red-500/20 text-xs">
        <div className="flex justify-between font-bold text-red-400 mb-1">
          <span>侵入体：{NIGHTMARE_CONFIG.leakName} <Skull className="w-3.5 h-3.5 inline-block -mt-0.5" /></span>
          <span>HP: {activeAlert.hp}</span>
        </div>
        <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
          <div
            className="bg-red-600 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, (activeAlert.hp / NIGHTMARE_CONFIG.dreamLeakDamage) * 100)}%` }}
          />
        </div>
      </div>

      {/* 出战小队 */}
      <div className="p-3 bg-zinc-950 rounded-2xl border border-red-500/20 text-xs">
        <div className="flex justify-between font-bold text-zinc-300 mb-1">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> 当前出战小队</span>
          <span className="text-zinc-500">{state.party.length}/3</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {state.party.length === 0 && <span className="text-zinc-600">尚未上阵英雄，无法防御！</span>}
          {state.party.map(id => {
            const hero = state.heroes[id];
            if (!hero) return null;
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                  hero.wounded
                    ? 'bg-red-950/40 border-red-700/40 text-red-400'
                    : 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
                }`}
              >
                {hero.wounded ? <><HeartCrack className="w-3 h-3" /> 重伤</> : <><HeartPulse className="w-3 h-3" /> 可战</>} {id}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => handleDefendNightmare('turret')}
          disabled={(inventory.defensive_turret || 0) < 1}
          className="py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 text-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
        >
          部署炮塔 + 出战 (先输出一轮, 扣1塔)
        </button>
        <button
          onClick={() => handleDefendNightmare('direct')}
          className="py-2.5 bg-zinc-900 border border-red-500/30 text-red-400 font-extrabold text-xs rounded-xl transition-all active:scale-95 text-center cursor-pointer"
        >
          直接出战防御
        </button>
      </div>
      <p className="text-[9px] text-zinc-500 text-center -mt-1">
        炮塔开战前造成 {NIGHTMARE_CONFIG.turretDamage} 点伤害；防御胜利掉落虚空核心 ×1，失败则全员重伤 + 梦境封锁 {getDreamLockdownMinutes()} 分钟
      </p>
    </div>
  );
};

export default DreamLeakAlertPanel;
