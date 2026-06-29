import React, { useState, useEffect } from 'react';
import { useGame } from './context/GameContext';
import GreenhouseTab from './components/GreenhouseTab';
import WildernessTab from './components/WildernessTab';
import DreamscapeTab from './components/DreamscapeTab';
import WorkshopTab from './components/WorkshopTab';
import LogTab from './components/LogTab';
import ShelterTab from './components/ShelterTab';
import CloudSyncWidget from './components/CloudSyncWidget';
import { useToast } from './components/ToastSystem';
import { ITEMS_CONFIG } from './data/items';
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
  Trash2,
  Lock,
  Cpu
} from 'lucide-react';
import shelterBg from './assets/shelter_bg.jpg';

const App: React.FC = () => {
  const {
    state,
    setState,
    addLog,
    resetGame,
    currentUser,
    accounts,
    switchAccount,
    createAccount,
    deleteAccount
  } = useGame();

  const { showToast, showConfirm } = useToast();

  const [activeTab, setActiveTab] = useState<'greenhouse' | 'wilderness' | 'dreamscape' | 'workshop' | 'log' | 'shelter'>('wilderness');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const player = state.player;
  const isExploring = state.exploration.inRealityExploration || state.exploration.inDreamExploration;
  const [hasRemindedCropsMature, setHasRemindedCropsMature] = useState(false);

  // 1. 探险时自动将 Tab 切换并锁定到相应探险页面
  useEffect(() => {
    if (state.exploration.inRealityExploration) {
      setActiveTab('wilderness');
    } else if (state.exploration.inDreamExploration) {
      setActiveTab('dreamscape');
    }
  }, [state.exploration.inRealityExploration, state.exploration.inDreamExploration]);

  // 2. 温室作物成熟提醒 Effect
  useEffect(() => {
    if (!isExploring) {
      setHasRemindedCropsMature(false);
      return;
    }

    const plantedSlots = state.greenhouse.slots.filter(s => s.cropId !== null);
    if (plantedSlots.length > 0 && plantedSlots.every(s => s.growthProgress >= 100)) {
      if (!hasRemindedCropsMature) {
        showToast("🌿 温室的所有作物已完全成熟，可以安全撤退收获了！", "success");
        setHasRemindedCropsMature(true);
      }
    } else {
      setHasRemindedCropsMature(false);
    }
  }, [state.greenhouse.slots, isExploring, hasRemindedCropsMature, showToast]);

  const handleCreateAccount = () => {
    if (!newUsername.trim()) {
      showToast("请输入生存者代号！", "warning");
      return;
    }
    const success = createAccount(newUsername);
    if (success) {
      showToast(`生存者 ${newUsername} 唤醒成功！已自动切换。`, "success");
      switchAccount(newUsername.trim());
      setNewUsername('');
      setIsTerminalOpen(false);
    } else {
      showToast("该代号已被占用，无法唤醒！", "error");
    }
  };

  const handleDeleteAccount = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (name === 'Guest') {
      showToast("无法删除 Guest 账户！", "warning");
      return;
    }
    showConfirm({
      title: "删除生存者存档",
      message: `确定要永久擦除生存者 ${name} 的冷冻舱数据吗？此操作不可逆！`,
      confirmText: "确认擦除",
      onConfirm: () => {
        deleteAccount(name);
        showToast(`已删除生存者 ${name} 的全部数据。`, "info");
      }
    });
  };

  const handleResetGame = () => {
    showConfirm({
      title: "重置避难所",
      message: "确定要重置当前避难所吗？所有温室植物、背包物资以及探索进度都将被清空！",
      confirmText: "确认重置",
      onConfirm: () => {
        resetGame();
        showToast("避难所已重置，重新开始生存。", "info");
      }
    });
  };

  const handleRetreat = () => {
    showConfirm({
      title: "安全撤退确认",
      message: "确认折返回避难所吗？这会结束本次探索，带回当前临时背包里的战利品。",
      onConfirm: () => {
        setState(prev => {
          const newInventory = { ...prev.inventory };
          Object.entries(prev.exploration.realityBag).forEach(([item, qty]) => {
            newInventory[item] = Math.max(0, (newInventory[item] || 0) + qty);
          });

          return {
            ...prev,
            inventory: newInventory,
            exploration: {
              ...prev.exploration,
              inRealityExploration: false,
              realitySteps: 0,
              realityBag: {},
              realityEventId: null
            }
          };
        });
        showToast("安全撤退，战利品存入储藏箱！", "success");
        addLog("安全折返回避难所，清点战利品入库。", "system");
      }
    });
  };

  const handleWakeUp = () => {
    setState(prev => {
      const newInventory = { ...prev.inventory };
      Object.entries(prev.exploration.dreamBag).forEach(([item, qty]) => {
        newInventory[item] = (newInventory[item] || 0) + qty;
      });

      return {
        ...prev,
        inventory: newInventory,
        exploration: {
          ...prev.exploration,
          inDreamExploration: false,
          dreamSteps: 0,
          dreamBag: {},
          dreamEventId: null
        }
      };
    });
    showToast("你成功收回意识从梦境醒来，已带回梦境碎片！", "success");
    addLog("从集体无意识梦境深处主动苏醒，返回现实。", "system");
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
      } catch (e) {
        return { days: 1, hp: 100 };
      }
    }
    return { days: 1, hp: 100 };
  };

  const handleTabClick = (tab: 'greenhouse' | 'wilderness' | 'dreamscape' | 'workshop' | 'log' | 'shelter') => {
    if (isExploring && activeTab !== tab) {
      showToast("正在废土地表或梦境探险中！请撤退或完成后再返回避难所。", "warning");
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 max-w-md mx-auto relative border-x border-zinc-900 shadow-2xl overflow-hidden">
      {/* 避难所全局背景图 */}
      <img
        src={shelterBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-[0.14] pointer-events-none select-none z-0"
        style={{ mixBlendMode: 'luminosity' }}
      />

      {/* 顶部状态栏 */}
      <header className="p-4 bg-zinc-900/60 border-b border-zinc-800/40 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              AetherGarden
            </span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-950/80 px-2 py-0.5 rounded-full border border-zinc-900">
              Beta v1.1.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            {state.exploration.inRealityExploration ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-zinc-950/80 border border-zinc-850 px-2 py-0.5 rounded-lg font-bold text-cyan-400 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                  {state.exploration.realityLocationId ? `救援 ${state.exploration.realitySteps}/5` : `步数 ${state.exploration.realitySteps}`}
                </span>
                <button
                  onClick={handleRetreat}
                  className="px-2 py-0.5 bg-rose-950 border border-rose-500/40 text-rose-350 text-[10px] font-black rounded-lg hover:bg-rose-900 transition-colors cursor-pointer"
                >
                  撤退
                </button>
              </div>
            ) : state.exploration.inDreamExploration ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-zinc-950/80 border border-zinc-850 px-2 py-0.5 rounded-lg font-bold text-purple-400 flex items-center gap-1">
                  <Moon className="w-3 h-3 text-purple-400 animate-pulse" />
                  深度 {state.exploration.dreamSteps} 层
                </span>
                <button
                  onClick={handleWakeUp}
                  className="px-2 py-0.5 bg-purple-950 border border-purple-500/40 text-purple-355 text-[10px] font-black rounded-lg hover:bg-purple-900 transition-colors cursor-pointer"
                >
                  苏醒
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-bold text-zinc-400">
                  第 <span className="text-purple-400 font-black">{player.days}</span> 天
                </span>
                <button
                  onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                  title="生存者终端"
                  className={`p-1 transition-colors cursor-pointer ${
                    isTerminalOpen ? 'text-purple-400' : 'text-zinc-500 hover:text-purple-400'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 生存者终端展开面板 */}
        {isTerminalOpen && (
          <div className="mb-3 p-3 bg-zinc-950 border border-zinc-850 rounded-2xl transition-all animate-fade-in">
            {/* 当前生存者与重置按钮 */}
            <div className="text-xs text-zinc-500 font-bold mb-3 flex items-center justify-between border-b border-zinc-900 pb-2.5">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                当前生存者：<span className="text-zinc-100 font-black">{currentUser}</span>
              </span>
              <button
                onClick={handleResetGame}
                className="text-[10px] text-zinc-500 hover:text-rose-450 flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> 重置游戏
              </button>
            </div>
            {isExploring && (
              <div className="mb-3 px-3 py-1.5 bg-amber-950/20 border border-amber-500/20 text-[10px] text-amber-400 rounded-xl font-bold flex items-center gap-1 select-none animate-pulse">
                ⚠️ 探险中无法切换或创建生存者
              </div>
            )}

            {/* 新建生存者输入区 */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                disabled={isExploring}
                placeholder={isExploring ? "探险中已锁定输入..." : "输入新生存者代号..."}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isExploring) handleCreateAccount();
                }}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs px-3 py-1.5 rounded-xl text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleCreateAccount}
                disabled={isExploring}
                className={`flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 text-white text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  isExploring ? 'opacity-40 cursor-not-allowed' : ''
                }`}
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
                        ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
                        : isExploring
                        ? 'bg-zinc-900/40 border-zinc-900 text-zinc-550 cursor-not-allowed'
                        : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-800/40 text-zinc-300 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (isExploring) {
                        showToast("探险中已锁定生存者切换！", "warning");
                        return;
                      }
                      if (!isCurrent) {
                        switchAccount(name);
                        showToast(`已成功切换生存者：${name}`, "info");
                        setIsTerminalOpen(false);
                      }
                    }}
                  >
                    <span className="text-xs font-bold">{name} {isCurrent && '●'}</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-zinc-500">存活 {preview.days} 天</span>
                      <span className="text-zinc-500">HP {preview.hp}</span>
                      {name !== 'Guest' && (
                        <button
                          disabled={isExploring}
                          onClick={(e) => !isExploring && handleDeleteAccount(name, e)}
                          className={`p-1 hover:text-red-400 text-zinc-600 rounded transition-colors cursor-pointer ${
                            isExploring ? 'opacity-30 cursor-not-allowed hover:text-zinc-600' : ''
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 云端同步面板 */}
            <CloudSyncWidget />
          </div>
        )}

        {/* 基础属性进度条 */}
        <div className="grid grid-cols-4 gap-3 bg-zinc-950/40 p-2.5 rounded-2xl border border-zinc-900">
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

          {/* 魔能 */}
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

          {/* 理智值 */}
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
          onClick={() => handleTabClick('workshop')}
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
      <main className="flex-1 p-4 overflow-y-auto z-10 bg-transparent">
        {activeTab === 'greenhouse' && <GreenhouseTab />}
        
        {activeTab === 'wilderness' && <WildernessTab />}

        {activeTab === 'dreamscape' && <DreamscapeTab />}

        {activeTab === 'workshop' && <WorkshopTab />}

        {activeTab === 'log' && <LogTab />}

        {activeTab === 'shelter' && <ShelterTab />}
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-zinc-900/90 border-t border-zinc-800 backdrop-blur-md grid grid-cols-6 py-2 z-40">
        {[
          { tab: 'log', label: '日志', icon: BookOpen, color: 'text-emerald-500' },
          { tab: 'workshop', label: '工坊', icon: Hammer, color: 'text-amber-500' },
          { tab: 'wilderness', label: '探索', icon: Compass, color: 'text-cyan-400' },
          { tab: 'greenhouse', label: '温室', icon: Sprout, color: 'text-emerald-400' },
          { tab: 'shelter', label: '控制台', icon: Cpu, color: 'text-cyan-300' },
          { tab: 'dreamscape', label: '梦境', icon: Moon, color: 'text-purple-400' }
        ].map(({ tab, label, icon: Icon, color }) => {
          const isActive = activeTab === tab;
          const isLocked = isExploring && activeTab !== tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab as any)}
              className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold transition-all relative cursor-pointer ${
                isActive ? color : 'text-zinc-500 hover:text-zinc-300'
              } ${isLocked ? 'opacity-30' : ''}`}
            >
              {isLocked && <Lock className="w-2.5 h-2.5 text-zinc-650 absolute top-1 right-3" />}
              <Icon className="w-5 h-5" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* 离线结算弹窗 */}
      {state.lastOfflineReport && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-850 rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col space-y-4 max-h-[85vh] overflow-y-auto">
            
            {/* 头部 */}
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 font-black rounded-full text-[10px] tracking-wider mb-2">
                💾 避难所离线运转报告
              </span>
              <h2 className="text-sm font-bold text-zinc-150">
                欢迎归来，生存者！
              </h2>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                离线持续时长: {(() => {
                  const s = state.lastOfflineReport.elapsedSeconds;
                  const hours = Math.floor(s / 3600);
                  const mins = Math.floor((s % 3600) / 60);
                  const secs = s % 60;
                  return `${hours > 0 ? `${hours}小时 ` : ''}${mins > 0 ? `${mins}分 ` : ''}${secs}秒`;
                })()}
              </div>
            </div>

            {/* 资源收益汇总 */}
            <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-900/60 space-y-2.5">
              <h3 className="text-[10px] text-zinc-500 font-bold border-b border-zinc-900 pb-1">
                📦 累计收集与产出
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {state.lastOfflineReport.recoveredEnergy > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <span className="text-xs">⚡</span>
                    <span>魔能: +{state.lastOfflineReport.recoveredEnergy}</span>
                  </div>
                )}
                {Object.keys(state.lastOfflineReport.recoveredItems).length === 0 && state.lastOfflineReport.recoveredEnergy === 0 ? (
                  <div className="col-span-2 text-center text-zinc-600 py-2 text-[10px]">
                    本次无资源挂机产出 (升级设施或指派幸存者以启动自动产出)
                  </div>
                ) : (
                  Object.entries(state.lastOfflineReport.recoveredItems).map(([id, qty]) => {
                    const meta = ITEMS_CONFIG[id];
                    return (
                      <div key={id} className="flex items-center gap-1.5 text-zinc-300 font-mono">
                        <span className="text-xs">{meta?.emoji || '📦'}</span>
                        <span>{meta?.name || id}: +{qty}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 结算日志明细 */}
            {state.lastOfflineReport.logs.length > 0 && (
              <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-900/60 flex flex-col space-y-1">
                <h4 className="text-[10px] text-zinc-500 font-bold border-b border-zinc-900 pb-1 mb-1">
                  📋 避难所自动运转明细
                </h4>
                <div className="space-y-1 text-[9px] text-zinc-400 font-mono max-h-[120px] overflow-y-auto pr-1">
                  {state.lastOfflineReport.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span className="text-zinc-600">▪</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 一键确认 */}
            <button
              onClick={() => {
                setState(prev => ({ ...prev, lastOfflineReport: null }));
              }}
              className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/20 text-white text-xs font-black rounded-xl shadow-lg shadow-cyan-950/20 transition-all cursor-pointer text-center"
            >
              收下物资，开始生存
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default App;
