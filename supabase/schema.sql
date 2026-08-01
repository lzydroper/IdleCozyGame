-- ====================================================================
-- AetherGarden — Supabase PostgreSQL Schema (Melvor Rework)
-- Local SQL Archiving File
-- ====================================================================

-- 1. 玩家主表 / 状态表 (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(64) NOT NULL UNIQUE,
  food INT NOT NULL DEFAULT 1000,
  max_food INT NOT NULL DEFAULT 2000,
  energy INT NOT NULL DEFAULT 500,
  max_energy INT NOT NULL DEFAULT 1000,
  sanity INT NOT NULL DEFAULT 100,
  max_sanity INT NOT NULL DEFAULT 100,
  days INT NOT NULL DEFAULT 1,
  stamina INT NOT NULL DEFAULT 100,
  max_stamina INT NOT NULL DEFAULT 100,
  soul_echoes INT NOT NULL DEFAULT 0,
  resonance_shards INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 英雄实力表 (Heroes)
CREATE TABLE IF NOT EXISTS public.heroes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hero_config_id VARCHAR(64) NOT NULL,
  level INT NOT NULL DEFAULT 1,
  exp INT NOT NULL DEFAULT 0,
  hp INT NOT NULL DEFAULT 100,
  max_hp INT NOT NULL DEFAULT 100,
  star INT NOT NULL DEFAULT 1,
  wounded BOOLEAN NOT NULL DEFAULT FALSE,
  awakened BOOLEAN NOT NULL DEFAULT FALSE,
  talent_points INT NOT NULL DEFAULT 0,
  logistics_facility_id VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, hero_config_id)
);

-- 3. 英雄三槽装备表 (Hero Equipments)
CREATE TABLE IF NOT EXISTS public.hero_equipments (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hero_config_id VARCHAR(64) NOT NULL,
  slot_type VARCHAR(16) NOT NULL CHECK (slot_type IN ('weapon', 'armor', 'trinket')),
  item_id VARCHAR(64) NOT NULL,
  enhance INT NOT NULL DEFAULT 0 CHECK (enhance BETWEEN 0 AND 30),
  mythic BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, hero_config_id, slot_type)
);

-- 4. 玩家背包数据表 (Player Inventory)
CREATE TABLE IF NOT EXISTS public.player_inventory (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id VARCHAR(64) NOT NULL,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, item_id)
);

-- 5. 英雄召唤保底与记录表 (Summon State & Logs)
CREATE TABLE IF NOT EXISTS public.summon_progress (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pity_count INT NOT NULL DEFAULT 0,
  total_pulls INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引加优
CREATE INDEX IF NOT EXISTS idx_heroes_user_id ON public.heroes(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.player_inventory(user_id);
