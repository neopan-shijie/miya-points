export type Role = 'owner' | 'admin' | 'operator' | 'viewer';
export type PlanTier = 'basic' | 'standard' | 'pro';
export type TxType = 'add' | 'redeem' | 'bonus' | 'adjust';

export interface Room {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan_tier: PlanTier;
  subscription_ends_at: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  avatar_emoji: string;
  total_points: number;
  created_at: string;
}

export interface Prize {
  id: string;
  room_id: string;
  name: string;
  points: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  room_id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
}

export interface Transaction {
  id: string;
  room_id: string;
  player_id: string;
  prize_id: string | null;
  operator_id: string;
  session_id: string | null;
  type: TxType;
  quantity: number;
  points_change: number;
  unit_points: number;
  note: string | null;
  created_at: string;
  // Joined relations (from Supabase nested select)
  player?: { name: string } | null;
  prize?: { name: string } | null;
}

export interface Profile {
  id: string;
  room_id: string;
  display_name: string;
  role: Role;
  created_at: string;
}

export interface PlayerWithPoints extends Player {
  rank?: number;
}

export interface BatchItem {
  playerId: string;
  playerName: string;
  prizeId: string;
  prizeName: string;
  quantity: number;
  type: TxType;
  pointsChange: number;
  unitPoints: number;
}
