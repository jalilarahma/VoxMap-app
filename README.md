# VoxMap — The Living Voice of the People

Real-time citizen sentiment mapping platform with emergency pin system.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase database
- Go to your Supabase project → SQL Editor
- Copy and paste the contents of `supabase-schema.sql`
- Click "Run"

### 3. Environment variables
Create `.env.local` with your Supabase credentials (already included):
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally
```bash
npm run dev
```
Open http://localhost:3000

### 5. Deploy
Push to GitHub → Vercel auto-deploys.

## Features
- Splash screen with animated logo
- Daily polls with 4-option voting
- Interactive world map (Leaflet.js + OpenStreetMap)
- 12 SOS emergency pin categories
- 4 urgency levels
- 6 languages (EN, AR, RU, ZH, HE, FA) with RTL support
- Dark theme throughout

## Tech Stack
- Next.js 14 + TypeScript
- Supabase (PostgreSQL + PostGIS)
- Leaflet.js + OpenStreetMap
- Tailwind CSS
- Vercel (hosting)
