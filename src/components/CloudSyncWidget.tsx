import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { Cloud, UploadCloud, DownloadCloud, Key } from 'lucide-react';

const CloudSyncWidget: React.FC = () => {
  const { state, setState, currentUser, switchAccount, accounts } = useGame();
  const { showToast, showConfirm } = useToast();
  const [syncKey, setSyncKey] = useState(() => {
    return localStorage.getItem(`aether_garden_sync_key_${currentUser}`) || '';
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setSyncKey(localStorage.getItem(`aether_garden_sync_key_${currentUser}`) || '');
  }, [currentUser]);

  if (!supabase) {
    return (
      <div className="mt-2 p-2 bg-zinc-900/40 border border-zinc-850 rounded-xl text-center">
        <p className="text-[9px] text-zinc-600 font-bold">云端节点未响应。请在部署环境的 .env 中配置 Supabase 密钥以启用跨端同步。</p>
      </div>
    );
  }

  const handleUpload = async () => {
    if (!syncKey.trim()) {
      showToast("请输入云端通行令牌 (用于保护您的存档)", "warning");
      return;
    }
    if (currentUser === 'Guest') {
      showToast("访客账户无法上传至云端，请唤醒正式生存者后再试。", "error");
      return;
    }
    
    setIsSyncing(true);
    try {
      const serializedData = localStorage.getItem(`aether_garden_save_${currentUser}`);
      if (!serializedData) throw new Error("无本地存档数据");

      const { error } = await supabase.from('saves').upsert({
        username: currentUser,
        sync_key: syncKey.trim(),
        data: serializedData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'username' });

      if (error) {
        if (error.code === '23505' || error.message.includes('sync_key')) {
          showToast("云端同步令牌错误！此账号已被其他令牌保护。", "error");
        } else {
          showToast(`上传失败: ${error.message}`, "error");
        }
      } else {
        localStorage.setItem(`aether_garden_sync_key_${currentUser}`, syncKey.trim());
        showToast("数据已加密上传至云端冷冻舱！", "success");
      }
    } catch (err: any) {
      showToast(`同步异常: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    if (!syncKey.trim()) {
      showToast("请输入该账号绑定的云端通行令牌", "warning");
      return;
    }
    
    showConfirm({
      title: "从云端覆写数据",
      message: `确定要从云端拉取并覆盖【${currentUser}】的本地生存数据吗？此操作将丢失本地未上传的进度！`,
      confirmText: "确认拉取",
      onConfirm: async () => {
        setIsSyncing(true);
        try {
          const { data, error } = await supabase
            .from('saves')
            .select('data, sync_key')
            .eq('username', currentUser)
            .single();

          if (error) {
            showToast("云端无此账号档案或网络异常。", "error");
            return;
          }

          if (data.sync_key !== syncKey.trim()) {
            showToast("通行令牌验证失败，拒绝下行数据！", "error");
            return;
          }

          if (data.data) {
            localStorage.setItem(`aether_garden_save_${currentUser}`, data.data);
            if (!accounts.includes(currentUser)) {
               const newAccounts = Array.from(new Set([...accounts, currentUser]));
               localStorage.setItem('aether_garden_accounts_list', JSON.stringify(newAccounts));
            }
            // 瞬间应用到内存，让 UI 瞬间变化，消除用户的疑惑
            try {
              const parsedState = JSON.parse(data.data);
              setState(parsedState);
            } catch(e) {}

            localStorage.setItem(`aether_garden_sync_key_${currentUser}`, syncKey.trim());
            showToast("云端数据下载成功！同步已完成。", "success");
          }
        } catch (err: any) {
          showToast(`下载异常: ${err.message}`, "error");
        } finally {
          setIsSyncing(false);
        }
      }
    });
  };

  return (
    <div className="mt-3 p-3 bg-zinc-950/80 border border-purple-500/20 rounded-xl">
      <div className="flex items-center gap-1.5 mb-2.5 text-xs font-black text-purple-400">
        <Cloud className="w-3.5 h-3.5" />
        以太云端节点同步
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            type="password"
            placeholder="设置/输入该账号的云端通行令牌 (密码)"
            value={syncKey}
            onChange={(e) => setSyncKey(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 text-[10px] px-2 py-1.5 rounded-lg text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={handleUpload}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 active:scale-95 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            <UploadCloud className="w-3 h-3" /> 上传存档
          </button>
          <button
            onClick={handleDownload}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 active:scale-95 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            <DownloadCloud className="w-3 h-3" /> 拉取并覆盖
          </button>
        </div>
        <p className="text-[8px] text-zinc-600 mt-1">
          * 同步时将校验通行令牌。不同设备必须输入相同的生存者代号与令牌。
        </p>
      </div>
    </div>
  );
};

export default CloudSyncWidget;
