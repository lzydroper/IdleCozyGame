// PROTOTYPE（英雄详情放大优化原型变体，非生产代码）：
// 三列结构保持（用户已定），差异在放大规格阶梯——字号/图标/间距/密度。
// 变体 A 温和 / B 标准（推荐） / C 激进，?variant=A|B|C 切换。
// Mock 数据仅存内存，无持久化；渲染骨架与真实 HeroDetailModal 精确对齐
// （主体 flex-1 层 + 上半 grid shrink-0 + 下半 h-[125px] shrink-0，容器 h-[460px] max-h-[68vh]）。
import React from 'react';
import { createPortal } from 'react-dom';
import GameIcon from './GameIcon';
import {
  X, Shield, Sword, Sparkles, Heart, Zap, Award, ChevronRight,
  Flame, Wand2, Sliders, Star as StarIcon
} from 'lucide-react';

// === Mock 英雄数据（诺娃 Lv.30 满星觉醒 + 装备）===
const MOCK = {
  id: 'nova',
  name: '诺娃',
  awakenedName: '觉醒·诺娃',
  classLabel: '进攻者',
  factionLabel: '奥术',
  level: 30,
  star: 5,
  exp: 1250,
  expNeed: 3000,
  soulShards: 12,
  resonanceShards: 8,
  duty: '生产速度 +30% · 额外产出 +15%',
  equip: [
    { slot: '武器', icon: Sword, item: '星辉之刃', enhance: 30, mythic: true, color: 'text-amber-400' },
    { slot: '防具', icon: Shield, item: '秘银甲', enhance: 25, mythic: false, color: 'text-sky-400' },
    { slot: '饰品', icon: Sparkles, item: '共鸣徽记', enhance: 12, mythic: false, color: 'text-purple-400' },
  ],
  stats: [
    { label: '生命', icon: Heart, value: '1280', color: 'text-rose-300', iconColor: 'text-rose-400' },
    { label: '攻击', icon: Sword, value: '342', color: 'text-amber-300', iconColor: 'text-amber-400' },
    { label: '防御', icon: Shield, value: '156', color: 'text-sky-300', iconColor: 'text-sky-400' },
    { label: '魔力', icon: Wand2, value: '50', color: 'text-cyan-300', iconColor: 'text-cyan-400' },
    { label: '暴击', icon: Sparkles, value: '15%', color: 'text-purple-300', iconColor: 'text-purple-400' },
    { label: '暴伤', icon: Flame, value: '180%', color: 'text-amber-200', iconColor: 'text-amber-500' },
  ],
};

// === 放大规格（每变体一套统一 token）===
// 注意垂直预算：容器 460px 定高（max-h-68vh），三列内容区约 240px 高——
// 放大字号/图标有预算约束，装备框/技能框保持 w-15 同真实（放大框内图标），头像 A/B/C 递增。
export interface ZoomSpec {
  body: string;   // 正文/卡片文字
  value: string;  // 数值
  btn: string;    // 按钮文字
  tag: string;    // 标签
  mini: string;   // 辅助小字
  icon: string;   // 框内图标尺寸
  btnIcon: string;// 按钮内图标
  avatar: string; // 头像框
  cardPad: string;// 卡片内边距
  btnPad: string; // 按钮内边距
  btnGap: string; // 列内元素间距
}

const SPECS: Record<'A' | 'B' | 'C', ZoomSpec> = {
  A: {
    body: 'text-[8.5px]', value: 'text-[9.5px]', btn: 'text-[9px]', tag: 'text-[8px]', mini: 'text-[7.5px]',
    icon: 'w-6 h-6', btnIcon: 'w-3.5 h-3.5', avatar: 'w-18 h-18', cardPad: 'p-1', btnPad: 'py-1.5', btnGap: 'gap-0.5',
  },
  B: {
    body: 'text-[10px]', value: 'text-[10px]', btn: 'text-[10px]', tag: 'text-[9px]', mini: 'text-[8.5px]',
    icon: 'w-6.5 h-6.5', btnIcon: 'w-4 h-4', avatar: 'w-20 h-20', cardPad: 'p-1.5', btnPad: 'py-1', btnGap: 'gap-1',
  },
  C: {
    body: 'text-[11px]', value: 'text-[11px]', btn: 'text-[11px]', tag: 'text-[10px]', mini: 'text-[9px]',
    icon: 'w-7 h-7', btnIcon: 'w-4.5 h-4.5', avatar: 'w-20 h-20', cardPad: 'p-1', btnPad: 'py-1', btnGap: 'gap-1',
  },
};

// === 弹窗渲染（骨架与真实 HeroDetailModal 一致：主体 flex-1 层 + 上半 grid + 下半定高）===
const HeroDetailZoomModal: React.FC<{ spec: ZoomSpec; onClose: () => void }> = ({ spec, onClose }) => {
  const s = spec;
  const modalContent = (
    <div onClick={onClose} className="fixed inset-0 z-[10000] bg-black/75 flex items-center justify-center p-3 select-none">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-3.5 flex flex-col justify-between shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0 relative">
          <div className="flex-1 flex items-center justify-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-zinc-100">英雄详情</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg absolute right-0 top-0">
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 主体（与真实一致：flex-1 包住上下两半） */}
        <div className="flex-1 flex flex-col justify-between pt-1 pb-0.5 min-h-0">
          {/* 上半部分三列（grid shrink-0，同真实） */}
          <div className="grid grid-cols-3 gap-2 items-stretch bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80 shrink-0">
            {/* 左列：三槽装备 + 一键装备 */}
            <div className="flex flex-col items-center justify-between">
              <div className="flex flex-col gap-0.5 items-center w-full">
                {MOCK.equip.map(e => (
                  <div key={e.slot} className="flex flex-col items-center gap-0.5">
                    <div className={`w-15 h-15 aspect-square rounded-xl border flex flex-col items-center justify-center relative overflow-hidden ${
                      e.mythic ? 'bg-zinc-950/90 border-purple-500/50' : 'bg-zinc-950/90 border-amber-500/40'
                    }`}>
                      <e.icon className={`${s.icon} ${e.color}`} />
                      <span className="absolute top-0.5 right-0.5 text-[7.5px] font-black text-amber-300 bg-black/80 px-1 rounded border border-amber-500/30">+{e.enhance}</span>
                      {e.mythic && <span className="absolute bottom-0.5 left-0.5 text-[6.5px] font-black text-purple-300 bg-purple-950/80 px-0.5 rounded">神话</span>}
                    </div>
                    <span className="text-[8.5px] font-bold text-zinc-300 max-w-[58px] truncate text-center leading-tight">{e.item}</span>
                  </div>
                ))}
              </div>
              <button className={`w-full ${s.btnPad} rounded-lg ${s.btn} font-black text-zinc-200 bg-zinc-800 border border-zinc-700 mt-1`}>
                一键装备
              </button>
            </div>

            {/* 中列：头像 + 养成（经验/后勤 my-auto 弹性，同真实） */}
            <div className="flex flex-col items-center justify-between text-center gap-1 min-h-0">
              <div className="flex flex-col items-center gap-0.5 w-full">
                <div className={`${s.avatar} aspect-square rounded-2xl bg-zinc-950 border-2 border-amber-500/40 flex items-center justify-center relative overflow-hidden shadow-lg shadow-amber-950/20`}>
                  <GameIcon type="hero" id={MOCK.id} className="w-full h-full" />
                  <div className="absolute top-0.5 left-0.5 bg-amber-500 text-zinc-950 text-[7px] font-black px-1 rounded shadow">觉醒</div>
                </div>
                <span className={`${s.body} font-black text-zinc-100 truncate max-w-[96px] leading-tight`}>{MOCK.awakenedName}</span>
                <span className="text-[9px] text-amber-400 font-bold leading-tight">
                  Lv.{MOCK.level} {Array.from({ length: MOCK.star }, (_, i) => (
                    <StarIcon key={i} className="w-3 h-3 inline-block fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`${s.tag} font-bold px-1 py-0.5 rounded border border-rose-500/40 bg-rose-950/40 text-rose-300`}>{MOCK.classLabel}</span>
                  <span className={`${s.tag} font-bold px-1 py-0.5 rounded border border-purple-500/40 bg-purple-950/40 text-purple-300`}>{MOCK.factionLabel}</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-1 px-0.5 my-auto">
                <div className="w-full bg-zinc-900/90 rounded-lg p-1 border border-zinc-800/80 flex flex-col gap-0.5 text-left shadow-inner">
                  <div className={`flex items-center justify-between ${s.mini} font-bold text-zinc-400 px-0.5`}>
                    <span className="text-amber-400/90">经验值</span>
                    <span className="text-amber-300 font-mono">{MOCK.exp} / {MOCK.expNeed}</span>
                  </div>
                </div>
                <div className="w-full bg-zinc-900/90 rounded-lg p-1 border border-zinc-800/80 text-left flex flex-col gap-0.5 shadow-sm">
                  <div className={`${s.mini} font-black text-amber-400/90 flex items-center gap-1`}>
                    <Award className="w-2.5 h-2.5 text-amber-400" /> 后勤驻守特长
                    <ChevronRight className="w-2.5 h-2.5 text-zinc-500 ml-auto" />
                  </div>
                  <div className={`${s.mini} font-semibold text-zinc-300 leading-tight line-clamp-1`}>{MOCK.duty}</div>
                </div>
              </div>

              <div className="w-full flex flex-col gap-1">
                <button className={`w-full ${s.btnPad} rounded-lg ${s.btn} font-bold text-amber-300/80 bg-amber-950/30 border border-amber-500/30`}>
                  批量升级
                </button>
                <button className={`w-full ${s.btnPad} rounded-lg ${s.btn} font-black text-amber-300 bg-amber-950/50 border border-amber-500/40`}>
                  升级
                </button>
              </div>
            </div>

            {/* 右列：技能占位 + 觉醒 + 碎片 */}
            <div className="flex flex-col items-center justify-between">
              <div className="flex flex-col gap-0.5 items-center w-full">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <div className="w-15 h-15 aspect-square rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-center relative overflow-hidden">
                      <Flame className={`${s.icon} text-purple-400/70`} />
                    </div>
                    <span className="text-[8.5px] font-bold text-zinc-400 max-w-[58px] truncate text-center leading-tight">技能 {i}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col w-full">
                <button disabled className={`w-full ${s.btnPad} rounded-lg ${s.btn} font-black bg-zinc-950 border border-zinc-800 text-zinc-500 mt-1`}>
                  已觉醒
                </button>
                <div className="w-full text-center text-[7.5px] text-zinc-500">
                  碎片 {MOCK.soulShards} · {MOCK.resonanceShards}
                </div>
              </div>
            </div>
          </div>

          {/* 下半部分：天赋入口 + 6 属性（h-[112px] shrink-0；属性项 py-0.5 + gap-2 保证边框不拥挤） */}
          <div className="grid grid-cols-3 gap-2 h-[112px] shrink-0">
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer h-full">
              <div className="w-8.5 h-8.5 rounded-full bg-amber-950/40 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sliders className="w-4 h-4" />
              </div>
              <span className={`${s.body} font-black text-zinc-200 text-center`}>天赋树入口</span>
            </div>
            <div className="col-span-2 bg-zinc-950/70 border border-zinc-800 rounded-xl p-2 flex flex-col justify-between h-full min-h-0">
              <div className={`flex items-center justify-between ${s.body} font-black text-amber-300 border-b border-zinc-800/80 pb-1 px-1 shrink-0`}>
                <span className="flex items-center gap-1"><Zap className={`${s.btnIcon} text-amber-400`} /> 基础属性</span>
                <span className={`${s.tag} font-bold text-amber-400`}>详细属性 ›</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 flex-1 items-center min-h-0">
                {MOCK.stats.map(st => (
                  <div key={st.label} className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-zinc-900/80 border border-zinc-800/70 min-h-0 leading-tight">
                    <span className={`${s.mini} text-zinc-400 font-bold flex items-center gap-1`}>
                      <st.icon className={`${s.btnIcon} ${st.iconColor}`} /> {st.label}
                    </span>
                    <span className={`${s.value} font-black ${st.color}`}>{st.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(modalContent, document.body);
};

export const VariantA: React.FC<{ onClose: () => void }> = ({ onClose }) => <HeroDetailZoomModal spec={SPECS.A} onClose={onClose} />;
export const VariantB: React.FC<{ onClose: () => void }> = ({ onClose }) => <HeroDetailZoomModal spec={SPECS.B} onClose={onClose} />;
export const VariantC: React.FC<{ onClose: () => void }> = ({ onClose }) => <HeroDetailZoomModal spec={SPECS.C} onClose={onClose} />;
