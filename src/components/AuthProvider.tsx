'use client';

import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profiles);
      }
      setLoading(false);
    };
    getSession();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3FF]">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">🎀</div>
          <div className="text-[#7C4DFF] font-bold">加载中...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    router.push('/');
    return null;
  }

  // Provide profile via context — inject into children
  return <ProfileProvider profile={profile}>{children}</ProfileProvider>;
}

import { createContext, useContext } from 'react';

const ProfileCtx = createContext<Profile | null>(null);
export const useProfile = () => useContext(ProfileCtx)!;

function ProfileProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <ProfileCtx.Provider value={profile}>{children}</ProfileCtx.Provider>;
}
