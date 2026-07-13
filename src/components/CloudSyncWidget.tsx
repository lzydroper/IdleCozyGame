import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { useAuth } from '../hooks/useAuth';
import { Cloud, UploadCloud, DownloadCloud, Lock, User, LogOut, RefreshCw } from 'lucide-react';

const CloudSyncWidget: React.FC = () => {
  const { setState, currentUser, syncCloudCharacters } = useGame();
  const { showToast, showConfirm } = useToast();
  const { user, loading, signUp, signIn, signOut } = useAuth();

  // 登录表单状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isAuthOperating, setIsAuthOperating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 监听登录态，一旦登录立即自动触发增量同步 (仅同步云端有而本地没有的角色，不覆写本地已有角色)
  useEffect(() => {
    if (user) {
      syncCloudCharacters(user.id);
    }
  }, [user, syncCloudCharacters]);

  const client = supabase;
  if (!client) {
    return (
      <div className="mt-2 p-2 bg-zinc-900/40 border border-zinc-850 rounded-xl text-center">
        <p className="text-[9px] text-zinc-600 font-bold">云端节点未响应。请在部署环境的 .env 中配置 Supabase 密钥以启用跨端同步。</p>
      </div>
    );
  }

  // 获取角色名预览
  const getCharacterName = (id: string | null) => {
    if (!id) return '';
    const saved = localStorage.getItem(`aether_garden_save_${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.username || '未命名生存者';
      } catch {
        return '未命名生存者';
      }
    }
    return '未命名生存者';
  };

  // 处理登录/注册
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast("邮箱和密码不能为空", "warning");
      return;
    }
    
    setIsAuthOperating(true);
    try {
      if (isSignUpMode) {
        const { error } = await signUp(email, password);
        if (error) {
          showToast(`注册失败: ${error.message}`, "error");
        } else {
          showToast("注册成功！若已开启免验证则已自动登录。", "success");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          showToast(`登录失败: ${error.message}`, "error");
        } else {
          showToast("云端身份校验通过，已成功连入以太云层！", "success");
        }
      }
    } catch (err: any) {
      showToast(`认证异常: ${err.message}`, "error");
    } finally {
      setIsAuthOperating(false);
    }
  };

  // 手动触发角色同步
  const handleManualSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await syncCloudCharacters(user.id);
      showToast("增量同步云端冷冻舱角色完成！", "success");
    } catch (err: any) {
      showToast(`同步异常: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // 处理存档上传
  const handleUpload = async () => {
    if (!user) {
      showToast("请先在下方登录您的云端身份", "warning");
      return;
    }
    if (!currentUser) {
      showToast("当前未激活任何生存者，无法上传。", "error");
      return;
    }
    
    setIsSyncing(true);
    try {
      const serializedData = localStorage.getItem(`aether_garden_save_${currentUser}`);
      if (!serializedData) throw new Error("无本地存档数据");

      const charName = getCharacterName(currentUser);
      const parsedData = JSON.parse(serializedData);

      const { error } = await client.from('saves').upsert({
        id: currentUser,
        user_id: user.id,
        username: charName,
        days: parsedData.player?.days || 1,
        hp: parsedData.player?.hp || 100,
        data: parsedData,
        updated_at: new Date().toISOString()
      });

      if (error) {
        showToast(`上传失败: ${error.message}`, "error");
      } else {
        showToast(`【${charName}】的数据已加密上传至云端冷冻舱！`, "success");
      }
    } catch (err: any) {
      showToast(`同步异常: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // 处理存档下载（手动覆盖本地）
  const handleDownload = async () => {
    if (!user) {
      showToast("请先在下方登录您的云端身份", "warning");
      return;
    }
    if (!currentUser) {
      showToast("请选择需要被覆盖的生存者角色", "warning");
      return;
    }
    
    const charName = getCharacterName(currentUser);
    showConfirm({
      title: "从云端覆写数据",
      message: `确定要从云端拉取并覆盖【${charName}】的本地生存数据吗？此操作将丢失本地未上传的进度！`,
      confirmText: "确认拉取",
      onConfirm: async () => {
        setIsSyncing(true);
        try {
          const { data, error } = await client
            .from('saves')
            .select('data')
            .eq('id', currentUser)
            .single();

          if (error || !data) {
            showToast("云端无此角色的归档数据。", "error");
            return;
          }

          if (data.data) {
            const saveObj = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            // 补全 username 属性
            if (!saveObj.username) {
              saveObj.username = charName;
            }
            const dataStr = JSON.stringify(saveObj);
            localStorage.setItem(`aether_garden_save_${currentUser}`, dataStr);
            setState(saveObj);
            showToast("云端数据下载成功！当前同步已完成。", "success");
          }
        } catch (err: any) {
          showToast(`下载异常: ${err.message}`, "error");
        } finally {
          setIsSyncing(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="mt-3 p-3 bg-zinc-950/80 border border-purple-500/20 rounded-xl flex items-center justify-center">
        <span className="text-[10px] text-zinc-500 font-bold animate-pulse">正在核对以太信号...</span>
      </div>
    );
  }

  const charName = getCharacterName(currentUser);

  return (
    <div className="mt-3 p-3 bg-zinc-950/80 border border-purple-500/20 rounded-xl">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-black text-purple-400">
          <Cloud className="w-3.5 h-3.5" />
          以太云端身份同步
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="仅同步本地不存在的云端角色"
              className="flex items-center gap-1 text-[8px] text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} /> 同步角色
            </button>
            <button 
              onClick={signOut}
              className="flex items-center gap-1 text-[8px] text-zinc-400 hover:text-red-400 font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-2.5 h-2.5" /> 登出
            </button>
          </div>
        )}
      </div>
      
      {user ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 p-1.5 bg-purple-950/20 border border-purple-900/30 rounded-lg text-[9px]">
            <User className="w-3 h-3 text-purple-400 shrink-0" />
            <div className="flex-1 overflow-hidden">
              <span className="text-zinc-500 block leading-tight text-[8px]">以太节点账号:</span>
              <span className="text-zinc-300 font-mono font-bold block truncate leading-tight">{user.email}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={handleUpload}
              disabled={isSyncing || !currentUser}
              className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 active:scale-95 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="w-3 h-3" /> 上传存档
            </button>
            <button
              onClick={handleDownload}
              disabled={isSyncing || !currentUser}
              className="flex items-center justify-center gap-1.5 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 active:scale-95 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <DownloadCloud className="w-3 h-3" /> 拉取并覆盖
            </button>
          </div>
          {currentUser && (
            <p className="text-[8px] text-zinc-500 text-center mt-1">
              当前操作目标角色: <strong className="text-purple-300 font-bold">{charName}</strong>
            </p>
          )}
          <p className="text-[8px] text-zinc-650 mt-1 leading-normal">
            * 上传/拉取仅针对当前激活角色。点击右上角“同步角色”可增量下载您在其他设备上创建的角色。
          </p>
        </div>
      ) : (
        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="email"
              placeholder="注册/登录 邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 text-[10px] px-2 py-1.5 rounded-lg text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 text-[10px] px-2 py-1.5 rounded-lg text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          
          <button
            type="submit"
            disabled={isAuthOperating}
            className="w-full mt-1 flex items-center justify-center bg-purple-700 hover:bg-purple-650 text-white font-bold active:scale-95 text-[10px] px-2 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSignUpMode ? '立即激活新生存者账号' : '登录以太云端节点'}
          </button>
          
          <div className="text-center mt-1">
            <button
              type="button"
              onClick={() => setIsSignUpMode(!isSignUpMode)}
              className="text-[8px] text-purple-400 hover:underline cursor-pointer"
            >
              {isSignUpMode ? '已有账号？去登录' : '没有账号？创建新账户'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CloudSyncWidget;
