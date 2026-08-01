-- ====================================================================
-- AetherGarden — Supabase PostgreSQL Schema (Cloud Sync Saves Table)
-- 本地数据库归档文件：记录以太云层冷冻舱 saves 表结构
-- ====================================================================

-- 云端冷冻舱存档主表 (saves)
-- 采用 JSONB 快照存储，与前端 GameState 完备同构。
-- 包含玩家面板、英雄列表(heroes)、装备(equipment)、召唤进度(summon)、背包(inventory)等。
CREATE TABLE IF NOT EXISTS public.saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),               -- 角色/存档 UUID (对应本地 currentUser)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Supabase Auth 用户 ID
  username TEXT NOT NULL DEFAULT '未命名生存者',                 -- 角色展示名称
  days INT4 NOT NULL DEFAULT 1,                                -- 生存天数
  hp INT4 DEFAULT 100,                                         -- 兼容历史 HP 字段
  data JSONB NOT NULL DEFAULT '{}'::jsonb,                     -- 核心状态数据 JSONB (包含 heroes, equipment, inventory, summon, party, combat 等)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()                -- 最后更新/同步时间戳
);

-- RLS (Row Level Security) 行级安全策略
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

-- 允许用户读写属于自己的存档数据
CREATE POLICY "Users can insert/update their own saves"
  ON public.saves
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 索引配置
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON public.saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_updated_at ON public.saves(updated_at);
