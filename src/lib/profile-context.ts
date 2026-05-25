import { createContext, useContext } from 'react';
import type { Profile } from '@/types';

const ProfileCtx = createContext<Profile | null>(null);

export const useProfile = () => {
  const p = useContext(ProfileCtx);
  if (!p) throw new Error('useProfile must be used within a profile provider');
  return p;
};

export { ProfileCtx };
