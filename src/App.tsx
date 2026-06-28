import React, { useState } from 'react';
import { useGame } from './context/GameContext';
import GreenhouseTab from './components/GreenhouseTab';
import WildernessTab from './components/WildernessTab';
import { Sprout, Compass, Moon, Hammer, BookOpen, Heart, Battery, Flame, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const { state, resetGame } = useGame();
  const [activeTab, setActiveTab] = useState<'greenhouse' | 'wilderness' | 'dreamscape' | 'workshop' | 'log'>('greenhouse');

  const player = state.player;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 max-w-md mx-auto relative border-x border-zinc-900 shadow-2xl">
      {/* 顶部状态栏 */}
      <header className="p-4 bg-zinc-900/80 border-b border-zinc-800/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              AetherGarden
            </span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
              Alpha v1.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-zinc-400">
              第 <span className="text-purple-400 font-black">{player.days}</span> 天
            </span>
            <button
              onClick={() => {
                if (window.confirm("确定重置避难所重新开始吗？这会抹去所有存档。")) {
                  resetGame();
                }
              }}
              title="重置游戏"
              className="p-1 hover:text-rose-400 text-zinc-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 属性状态进度条 */}
        <div className="grid grid-cols-4 gap-2">
          {/* 生命值 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-rose-500">
              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> HP</span>
              <span>{player.hp}/{player.maxHp}</span>
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
              />
            </div>
          </div>

          {/* 饱食度 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-500">
              <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" /> 饱食</span>
              <span>{player.food}/{player.maxFood}</span>
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${(player.food / player.maxFood) * 100}%` }}
              />
            </div>
          </div>

          {/* 魔能/能量 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400">
              <span className="flex items-center gap-0.5"><Battery className="w-3 h-3" /> 魔能</span>
              <span>{player.energy}/{player.maxEnergy}</span>
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${(player.energy / player.maxEnergy) * 100}%` }}
              />
            </div>
          </div>

          {/* 精神力 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-purple-400">
              <span className="flex items-center gap-0.5"><Moon className="w-3 h-3" /> 理智</span>
              <span>{player.sanity}/{player.maxSanity}</span>
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
              <div
                className="bg-purple-400 h-full transition-all duration-300"
                style={{ width: `${(player.sanity / player.maxSanity) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* 主工作区 */}
      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'greenhouse' && <GreenhouseTab />}
        
        {activeTab === 'wilderness' && <WildernessTab />}

        {activeTab === 'dreamscape' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            <Moon className="w-12 h-12 text-purple-500 mb-4 opacity-40 animate-pulse" />
            <h2 className="text-lg font-bold text-zinc-300">深层梦境共鸣</h2>
            <p className="text-xs text-zinc-500 mt-2 max-w-[240px]">
              即将解锁。消耗理智链接幸存者意识，使用梦胶囊规避扭曲虚空，探寻远古的魔导芯片。
            </p>
          </div>
        )}

        {activeTab === 'workshop' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            <Hammer className="w-12 h-12 text-amber-600 mb-4 opacity-40 animate-pulse" />
            <h2 className="text-lg font-bold text-zinc-300">魔导合成工坊</h2>
            <p className="text-xs text-zinc-500 mt-2 max-w-[240px]">
              即将解锁。利用收获的荧光草与金属块，合成生命药水，配置梦胶囊或升级自动种植技术。
            </p>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            <BookOpen className="w-12 h-12 text-emerald-500 mb-4 opacity-40" />
            <h2 className="text-lg font-bold text-zinc-300">避难所日志</h2>
            <p className="text-xs text-zinc-500 mt-2 max-w-[240px]">
              记录您的生存足迹、解锁的植物与异怪图鉴。
            </p>
          </div>
        )}
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-zinc-900/90 border-t border-zinc-800 backdrop-blur-md grid grid-cols-5 py-2 z-40">
        <button
          onClick={() => setActiveTab('greenhouse')}
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold transition-all ${
            activeTab === 'greenhouse' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Sprout className="w-5 h-5" />
          温室
        </button>

        <button
          onClick={() => setActiveTab('wilderness')}
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold transition-all ${
            activeTab === 'wilderness' ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Compass className="w-5 h-5" />
          探索
        </button>

        <button
          onClick={() => setActiveTab('dreamscape')}
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold transition-all ${
            activeTab === 'dreamscape' ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Moon className="w-5 h-5" />
          梦境
        </button>

        <button
          onClick={() => setActiveTab('workshop')}
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold transition-all ${
            activeTab === 'workshop' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Hammer className="w-5 h-5" />
          工坊
        </button>

        <button
          onClick={() => setActiveTab('log')}
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold transition-all ${
            activeTab === 'log' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          日志
        </button>
      </nav>
    </div>
  );
};

export default App;

