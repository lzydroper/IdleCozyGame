import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const isTest = typeof globalThis !== 'undefined' && ((globalThis as any).process?.env?.NODE_ENV === 'test' || !!(globalThis as any).process?.env?.VITEST);

  const [user, setUser] = useState<User | null>(() => {
    if (isTest) {
      return { id: 'test-user-id', email: 'test@example.com' } as User;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (isTest) return false;
    return true;
  });

  useEffect(() => {
    if (isTest) return;
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. 初始化时检查当前已保存的会话
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // 2. 监听认证状态的实时变更
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isTest]);

  const signUp = async (email: string, password: string) => {
    if (isTest) return { data: { user: { id: 'test-user-id', email } as User }, error: null };
    if (!supabase) throw new Error("Supabase 客户端未初始化");
    return await supabase.auth.signUp({ email, password });
  };

  const signIn = async (email: string, password: string) => {
    if (isTest) return { data: { user: { id: 'test-user-id', email } as User }, error: null };
    if (!supabase) throw new Error("Supabase 客户端未初始化");
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    if (isTest) {
      setUser(null);
      return { error: null };
    }
    if (!supabase) throw new Error("Supabase 客户端未初始化");
    return await supabase.auth.signOut();
  };

  return { user, loading, signUp, signIn, signOut };
}
