# MIYA潮玩社 · 积分管家 v1.0 (Cloud)

## Tech Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Row Level Security)
- **Deploy**: Vercel (frontend) + Supabase Cloud (database)
- **Export**: SheetJS (xlsx) for Excel

## Project Structure
```
miya-points/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout + ToastProvider
│   │   ├── page.tsx                # Login/Register page
│   │   ├── globals.css             # Tailwind + animations + table styles
│   │   ├── auth/callback/route.ts  # OAuth callback handler
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Sidebar + Scoreboard + main content
│   │   │   ├── quick-entry/        # ⚡ Quick entry (highest priority)
│   │   │   ├── redeem/             # 🎁 Points redemption
│   │   │   ├── records/            # 📋 Transaction history
│   │   │   ├── manage/             # ⚙ Product & player management
│   │   │   └── export-page/        # 📎 Excel export
│   │   └── api/
│   │       ├── auth/register/      # POST - registration
│   │       ├── transactions/       # GET/POST/DELETE
│   │       ├── players/            # GET/POST/PUT/DELETE
│   │       ├── prizes/             # GET/POST/PUT/DELETE
│   │       └── scoreboard/         # GET - rankings
│   ├── components/
│   │   ├── Sidebar.tsx             # Sidebar navigation + user badge
│   │   ├── Scoreboard.tsx          # Real-time ranking + today stats
│   │   ├── PlayerChip.tsx          # Player selection card
│   │   ├── PrizeChip.tsx           # Prize selection card (color-coded tiers)
│   │   ├── Toast.tsx               # Toast notification system
│   │   └── AuthProvider.tsx        # Auth context provider
│   ├── lib/
│   │   ├── supabase.ts             # Browser Supabase client
│   │   ├── supabase-server.ts      # Server Supabase client
│   │   └── auth-helpers.ts         # Server auth utilities
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── supabase/
│   └── migrations/
│       └── 001_schema.sql          # Full database schema
└── .env.local.example              # Environment variables template
```

## Database Schema
- **rooms** — tenants/livestream rooms (per-owner isolation)
- **players** — players per room (total_points auto-updated by trigger)
- **prizes** — redeemable products per room (stock tracking)
- **sessions** — live session grouping (optional)
- **transactions** — all point movements (operator tracking, session grouping)
- **profiles** — extends Supabase auth.users (role + room binding)

### Key Design Decisions
- `total_points` on players is a **derived field** updated by PostgreSQL trigger on transactions INSERT/DELETE — no application-level calculation needed
- RLS policies enforce room-level data isolation
- Role-based access: `owner` > `admin` > `operator` > `viewer`
- Soft-delete for prizes (is_active = false) preserves historical transaction data

## Coding Conventions
- Use TypeScript strictly — all props, API responses, and state must be typed
- Client components only where needed (`'use client'` for interactive pages)
- Server components for data fetching where possible
- Tailwind utility classes — no CSS modules or styled components
- Use `useToast()` hook from ToastProvider for notifications (never `alert()`)
- API routes return `{ success: boolean, error?: string, data?: T }`
- All Supabase queries must filter by `room_id` from the authenticated user's profile

## Color Scheme
- Primary: coral #FF6B35, hotpink #FF4081, purple #7C4DFF
- Sidebar: #1E1B4B → #2D1B69 gradient
- Page bg: #F5F3FF (warm purple tint)
- Semantic: green for add (#10B981), red for deduct (#EF4444)
- Prize tiers: green (0-99) → blue (100-299) → orange (300-699) → purple (700+)

## Key Patterns

### Data Fetching (Client Component)
```tsx
const supabase = createClient();
const { data } = await supabase.from('table').select('*').eq('room_id', profile.room_id);
```

### Realtime Subscription
```tsx
const channel = supabase.channel('name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `room_id=eq.${roomId}` }, callback)
  .subscribe();
// Cleanup: return () => channel.unsubscribe();
```

### Toast Notifications
```tsx
const { toast } = useToast();
toast('操作成功');  // default: success (green)
toast('错误信息', 'danger');  // red
toast('提示', 'warning');  // yellow
```

## Setup Instructions
1. Create Supabase project at https://app.supabase.com
2. Copy `SQL Editor` → run `supabase/migrations/001_schema.sql`
3. Copy `.env.local.example` → `.env.local` + fill in Supabase URL + anon key
4. `npm install && npm run dev`
5. Open http://localhost:3000, register a new account

## Deploy
- Push to GitHub → import to Vercel → set env vars → deploy
- Supabase: go to Project Settings → API → copy keys
