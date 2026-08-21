-- ====================================================================
-- AetherGarden — Supabase PostgreSQL Schema (Cloud Sync Saves Table)
-- 本地数据库归档文件：记录以太云层冷冻舱 saves 表结构
-- ====================================================================

-- 1. 创建 saves 表以支持多角色存档
DROP TABLE IF EXISTS public.saves CASCADE;

CREATE TABLE public.saves (
  id UUID NOT NULL PRIMARY KEY,                        -- 本地生成的角色 UUID
  user_id UUID REFERENCES auth.users NOT NULL,         -- 绑定的以太云端账户 UID
  username TEXT NOT NULL,                              -- 角色名（可重复）
  days INTEGER NOT NULL DEFAULT 1,                     -- 生存天数 (用于列表预览)
  hp INTEGER NOT NULL DEFAULT 100,                     -- HP (用于列表预览)
  data JSONB NOT NULL,                                 -- 完整的 GameState 存档 JSON
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 开启行级安全防护 (RLS)
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

-- 3. 创建安全访问策略 (Policy)

-- 仅允许用户读取自己绑定的云端角色存档
CREATE POLICY "Users can view their own characters"
ON public.saves FOR SELECT
USING (auth.uid() = user_id);

-- 仅允许用户在自己账户下插入新角色存档
CREATE POLICY "Users can insert their own characters"
ON public.saves FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 仅允许用户更新自己绑定的角色存档
CREATE POLICY "Users can update their own characters"
ON public.saves FOR UPDATE
USING (auth.uid() = user_id);

-- 仅允许用户删除自己绑定的角色存档
CREATE POLICY "Users can delete their own characters"
ON public.saves FOR DELETE
USING (auth.uid() = user_id);
