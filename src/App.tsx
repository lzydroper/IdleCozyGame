import React, { useState } from 'react';
import { useGame } from './context/GameContext';
import GreenhouseTab from './components/GreenhouseTab';
import WildernessTab from './components/WildernessTab';
import DreamscapeTab from './components/DreamscapeTab';
import WorkshopTab from './components/WorkshopTab';
import {
  Sprout,
  Compass,
  Moon,
  Hammer,
  BookOpen,
  Heart,
  Battery,
  Flame,
  RefreshCw,
  ShieldAlert,
  Terminal,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';

const App: React.FC = () => {
  const {
    state,
    resetGame,
    currentUser,
    accounts,
    switchAccount,
    createAccount,
    deleteAccount
  } = useGame();
  
  const [activeTab, setActiveTab] = useState<'greenhouse' | 'wilderness' | 'dreamscape' | 'workshop' | 'log'>('greenhouse');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const player = state.player;

  const handleCreateAccount = () => {
    const trimmed = newUsername.trim();
    if (!trimmed) return;
    const success = createAccount(trimmed);
    if (success) {
      switchAccount(trimmed);
      setNewUsername('');
    } else {
      alert('创建失败：该生存者名称已存在或不合法');
    }
  };

  const getSurvivorPreview = (name: string) => {
    const saved = localStorage.getItem(`aether_garden_save_${name}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          days: parsed.player?.days || 1,
          hp: parsed.player?.hp || 100
        };
      } catch (e) {}
    }
    return { days: 1, hp: 100 };
  };

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
                if (window.confirm("确定重置避难所重新开始吗？这会抹去当前账号的存档。")) {
                  resetGame();
                }
              }}
              title="重置当前游戏"
              className="p-1 hover:text-rose-400 text-zinc-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 生存者终端胶囊按钮 */}
        <div className="mb-3">
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl hover:border-purple-500/50 hover:bg-zinc-900/40 active:scale-[0.99] transition-all text-xs text-zinc-400 font-bold"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              当前生存者：<span className="text-zinc-100 font-black">{currentUser}</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800/80">终端</span>
              {isTerminalOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>
        </div>

        {/* 生存者终端展开面板 */}
        {isTerminalOpen && (
          <div className="mb-3 p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl transition-all">
            {/* 新建生存者输入区 */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="输入新生存者代号..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateAccount();
                }}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs px-3 py-1.5 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={handleCreateAccount}
                className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 text-white text-[10px] font-black px-3 py-1.5 rounded-xl transition-all"
              >
                <UserPlus className="w-3 h-3" />
                唤醒
              </button>
            </div>

            {/* 生存者存档列表 */}
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-black mb-1 px-1">
                生存者冷冻舱列表 ({accounts.length})
              </div>
              {accounts.map((name) => {
                const preview = getSurvivorPreview(name);
                const isCurrent = name === currentUser;
                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-purple-950/20 border-purple-500/30 text-purple-300'
                        : 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/80 hover:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div
                      onClick={() => {
                        if (!isCurrent) {
                          switchAccount(name);
                        }
                      }}
                      className="flex-1 flex items-center justify-between cursor-pointer mr-2"
                    >
                      <div className="flex items-center gap-1.5">
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />}
                        <span className="text-xs font-black truncate max-w-[100px]">{name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        第 <span className="text-purple-400 font-bold">{preview.days}</span> 天 · HP {preview.hp}
                      </span>
                    </div>
                    {name !== 'Guest' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`确定要彻底删除生存者 [${name}] 的所有存档数据吗？此操作无法撤销。`)) {
                            deleteAccount(name);
                          }
                        }}
                        className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                        title="删除存档"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

      {state.activeAlert.type === 'dream_leak' && activeTab !== 'workshop' && (
        <div
          onClick={() => setActiveTab('workshop')}
          className="mx-4 mt-3 p-3 bg-red-950/80 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs text-red-300 font-bold cursor-pointer animate-pulse"
        >
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" />
            避难所遭梦魇污染！温室生长已冻结。
          </span>
          <span className="text-[10px] text-red-400 bg-red-950 px-2 py-0.5 rounded-lg border border-red-500/20">
            前往抵御
          </span>
        </div>
      )}

      {/* 主工作区 */}
      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'greenhouse' && <GreenhouseTab />}
        
        {activeTab === 'wilderness' && <WildernessTab />}

        {activeTab === 'dreamscape' && <DreamscapeTab />}

        {activeTab === 'workshop' && <WorkshopTab />}

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

