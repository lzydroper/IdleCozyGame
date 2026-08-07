import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { HEROES_CONFIG } from '../data/heroes';
import { SUMMON_CONFIG } from '../data/summonConfig';
import type { SummonOutcome } from '../state/summon';
import { useToast } from './ToastSystem';
import {
  Info,
  Sparkles,
  HelpCircle,
  ArrowLeft,
  RefreshCw,
  X,
  Shield,
  CheckCircle2,
  Target,
  Star,
  Gem
} from 'lucide-react';
import GameIcon from './GameIcon';
import gachaTavernBg from '../assets/gacha_tavern_bg.jpg';

interface SummonTabProps {
  isOpen: boolean;
  onClose: () => void;
}

const SummonTab: React.FC<SummonTabProps> = ({ isOpen, onClose }) => {
  const { state, summonHero, summonBatch } = useGame();
  const { showToast } = useToast();

  // Modal 状态
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [resultOutcomes, setResultOutcomes] = useState<SummonOutcome[] | null>(null);
  // 批量招募模式：10 连 / 100 连（由「切换」按钮控制）
  const [batchSize, setBatchSize] = useState<10 | 100>(10);

  if (!isOpen) return null;

  const pityCount = state.summon?.pityCount ?? 0;
  const maxPity = SUMMON_CONFIG.guaranteedAt; // 100
  const pityPercentage = Math.min(100, Math.max(0, (pityCount / maxPity) * 100));
  // 灵魂残响（ADR-0014 物品化）：货币存于背包
  const soulEchoes = state.inventory.soul_echo || 0;

  const handleSingleSummon = () => {
    if (soulEchoes < SUMMON_CONFIG.costPerSummon) {
      showToast('灵魂残响不足 (需要 100 灵魂残响)', 'warning');
      return;
    }
    const outcome = summonHero();
    setResultOutcomes([outcome]);
  };

  const handleBatchSummon = () => {
    const cost = SUMMON_CONFIG.costPerSummon * batchSize;
    if (soulEchoes < cost) {
      showToast(`灵魂残响不足 (需要 ${cost} 灵魂残响)`, 'warning');
      return;
    }
    const res = summonBatch(batchSize);
    setResultOutcomes(res.outcomes);
  };

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col justify-between select-none overflow-hidden font-sans border-x border-zinc-900 shadow-2xl animate-in fade-in duration-200">
      {/* 视觉背景：高质量生成的酒馆大门与暖阳全图背景 */}
      <img
        src={gachaTavernBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
      />

      {/* 暗向渐变遮罩 (保证文字图标高亮可读) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90 pointer-events-none z-0" />

      {/* 顶部 Header Resource Bar */}
      <header className="relative z-10 flex items-center justify-between p-3">
        {/* 左侧 (i) 信息按钮 & 灵魂残响 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRulesModal(true)}
            className="w-9 h-9 rounded-full bg-black/60 border border-amber-500/50 flex items-center justify-center text-amber-300 hover:bg-black/80 transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-md"
            title="招募概率与规则"
          >
            <Info className="w-5 h-5 text-amber-300" />
          </button>

          {/* 灵魂残响 资源栏 */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-purple-500/50 shadow-md backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-xs font-black text-purple-200">
              {soulEchoes}
            </span>
          </div>
        </div>

        {/* 右侧：玩家头像徽章 */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-zinc-900/90 overflow-hidden shadow-lg flex items-center justify-center backdrop-blur-md">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </header>

      {/* 顶部 Banner：占位已移除（无招募等级系统，避免硬编码假数据） */}

      {/* 中央 Floating Controls (保底进度 & 规则按钮) */}
      <main className="relative flex-1 flex flex-col justify-between py-6 px-4 z-10">
        {/* 浮动 UI 层 */}
        <div className="w-full flex items-center justify-between my-auto">
          {/* 右侧：保底进度与规则入口（唯一规则入口为顶部 Info 按钮，删除冗余 ? 按钮） */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1 bg-black/75 p-2.5 rounded-2xl border border-amber-500/50 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-amber-300 tracking-wider">
                  {pityCount}/{maxPity}
                </span>
                <span className="text-[9px] font-bold text-zinc-300">100抽必出</span>
              </div>
              <div className="w-28 h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-amber-500/50 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_10px_#f59e0b]"
                  style={{ width: `${pityPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部招募按钮区域 */}
        <div className="w-full flex flex-col items-center gap-3">
          {/* 双招募按钮 (招募1次 / 招募10次) */}
          <div className="w-full flex items-center justify-center gap-3">
            {/* 招募 1 次 */}
            <button
              onClick={handleSingleSummon}
              className="flex-1 py-3 px-3 rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-sky-200 flex flex-col items-center justify-center gap-0.5 shadow-xl shadow-sky-950/60 hover:brightness-110 active:scale-95 transition-all cursor-pointer group"
            >
              <span className="text-sm font-black text-white drop-shadow-md tracking-wider">
                招募 1 次
              </span>
              <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-sky-950/80 border border-sky-300/50">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span className="text-[10px] font-black text-sky-100">
                  {soulEchoes}/100
                </span>
              </div>
            </button>

            {/* 招募 10 次 / 100 次（由「切换」按钮控制批量模式） */}
            <button
              onClick={handleBatchSummon}
              className="flex-1 py-3 px-3 rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-sky-200 flex flex-col items-center justify-center gap-0.5 shadow-xl shadow-sky-950/60 hover:brightness-110 active:scale-95 transition-all cursor-pointer group"
            >
              <span className="text-sm font-black text-white drop-shadow-md tracking-wider">
                招募 {batchSize} 次
              </span>
              <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-sky-950/80 border border-sky-300/50">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span className="text-[10px] font-black text-sky-100">
                  {soulEchoes}/{batchSize * SUMMON_CONFIG.costPerSummon}
                </span>
              </div>
            </button>
          </div>

          {/* 底部副说明：批量模式切换（10 连 / 100 连） */}
          <div className="w-full flex items-center justify-end px-1">
            <button
              onClick={() => setBatchSize(prev => (prev === 10 ? 100 : 10))}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-black/60 border border-zinc-600 text-[10px] font-bold text-zinc-200 hover:border-amber-400 transition-all cursor-pointer active:scale-95 backdrop-blur-md"
              title="在 10 连抽与 100 连抽之间切换"
            >
              切换至 {batchSize === 10 ? '100' : '10'} 抽
              <RefreshCw className="w-3 h-3 text-amber-400" />
            </button>
          </div>
        </div>
      </main>

      {/* 底部 Navigation 栏 —— Back 按钮为唯一退出口 */}
      <footer className="relative z-10 flex items-center justify-between p-3 bg-zinc-950/95 border-t border-amber-950/60 backdrop-blur-md">
        {/* 左侧 Back 按钮 (唯一的退出口) */}
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-900 to-amber-950 border-2 border-amber-500/70 flex items-center justify-center text-amber-300 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-xl"
          title="返回英雄界面"
        >
          <ArrowLeft className="w-6 h-6 text-amber-300" />
        </button>

        {/* 右侧切页标签 */}
        <div className="flex items-center gap-2">
          {/* Tab 1: 英雄招募 */}
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-400 text-amber-100 font-black text-xs shadow-lg">
            <Shield className="w-4 h-4 text-amber-300" />
            <span>英雄招募</span>
          </div>

          {/* Tab 2: 秘宝古卜 */}
          <button
            onClick={() => showToast('秘宝古卜功能即将开放！', 'info')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 font-bold text-xs hover:text-zinc-200 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-zinc-500" />
            <span>秘宝古卜</span>
          </button>
        </div>
      </footer>

      {/* 规则与概率 Modal */}
      {showRulesModal && (
        <div className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-3xl p-5 max-w-xs w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <header className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <h3 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-400" /> 招募规则与保底机制
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </header>

            <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed max-h-72 overflow-y-auto pr-1">
              <section className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                <h4 className="font-bold text-amber-400 mb-1 text-[11px] flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> 100 抽未拥有英雄硬保底</h4>
                <p className="text-[10px] text-zinc-400">
                  连续 100 次未抽取到未拥有英雄时，第 100 抽必出任意一位未拥有的英雄！获得未拥有英雄后重置保底计数。
                </p>
              </section>

              <section className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                <h4 className="font-bold text-amber-400 mb-1 text-[11px] flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" /> 全满星极值奖励</h4>
                <p className="text-[10px] text-zinc-400">
                  若玩家已拥有全部英雄且所有英雄均已达 5 星满星，100 抽保底将自动发放 1 个终局觉醒材料【奥术星体】！
                </p>
              </section>

              <section className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                <h4 className="font-bold text-amber-400 mb-1 text-[11px] flex items-center gap-1">
                  <Gem className="w-3.5 h-3.5 text-amber-400" /> 消耗与转换规则</h4>
                <p className="text-[10px] text-zinc-400">
                  单抽消耗 100 灵魂残响，10 连抽消耗 1000 灵魂残响。已拥有英雄重复抽出将转化为该英雄专属灵魂碎片；未抽出英雄则获得共鸣碎片。
                </p>
              </section>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-black text-amber-950 text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              了解
            </button>
          </div>
        </div>
      )}

      {/* 召唤结果展示 Modal (Result Outcome) */}
      {resultOutcomes && resultOutcomes.length > 0 && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] max-h-[85vh] p-4 flex flex-col gap-3 shadow-2xl animate-in zoom-in-95 duration-200">
            <header className="text-center">
              <h3 className="text-sm font-black text-zinc-100 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                {resultOutcomes.length === 1 ? '招募获得' : `${resultOutcomes.length} 连招募获得`}
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">招募结果已自动存入避难所</p>
            </header>

            {/* 结果列表网格 */}
            <div className="w-full grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {resultOutcomes.map((outcome, idx) => {
                const config = outcome.heroId ? HEROES_CONFIG[outcome.heroId] : null;

                if (outcome.arcaneOrbAwarded) {
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center p-2.5 rounded-xl bg-zinc-950/80 border border-amber-400/80 text-center"
                    >
                      <GameIcon type="item" id="arcane_orb" className="w-8 h-8 mb-1" />
                      <span className="text-[11px] font-black text-amber-200">奥术星体 x1</span>
                      <span className="text-[8px] font-bold text-purple-300">100抽全满星保底</span>
                    </div>
                  );
                }

                if (!config) {
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center"
                    >
                      <GameIcon type="item" id="resonance_shard" className="w-8 h-8 mb-1" />
                      <span className="text-[11px] font-bold text-zinc-300">共鸣碎片 x{outcome.shardsGained}</span>
                      <span className="text-[8px] text-zinc-500">通用碎片</span>
                    </div>
                  );
                }

                // 重复英雄：碎片图标与背包一致（soul=专属碎片 shard_<hero>，resonance=通用共鸣碎片）
                const shardIconId =
                  outcome.shardType === 'soul' && outcome.heroId ? `shard_${outcome.heroId}` : 'resonance_shard';

                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center p-2.5 rounded-xl border relative overflow-hidden text-center ${
                      outcome.isNew
                        ? 'bg-zinc-950/80 border-amber-400'
                        : 'bg-zinc-950/80 border-zinc-800'
                    }`}
                  >
                    {outcome.isNew && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-amber-950 text-[7px] font-black uppercase shadow">
                        NEW!
                      </span>
                    )}

                    <GameIcon type="hero" id={config.id} className="w-10 h-10 mb-1 rounded-xl" />

                    <span className="text-[11px] font-black text-zinc-100 max-w-full truncate">
                      {config.name}
                    </span>

                    {outcome.isNew ? (
                      <span className="text-[8px] font-bold text-amber-400">解锁新英雄</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[8px] font-bold text-purple-300 mt-0.5">
                        <GameIcon type="item" id={shardIconId} className="w-3.5 h-3.5" />
                        {outcome.shardType === 'soul' ? '碎片' : '共鸣'} x{outcome.shardsGained}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setResultOutcomes(null)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-black text-amber-950 text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-950" />
              收下
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummonTab;
