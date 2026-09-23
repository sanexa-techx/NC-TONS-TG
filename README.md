# NC TONs — Telegram Mini App ⛏️💎

**NC TONs** is a full-stack Telegram Mini App inspired by RushMining. It features a dual-currency idle mining mechanism, interactive Canvas mini-game with server-enforced anti-cheat, dynamic live reward adjustments, an admin-moderated peer-to-peer task promotion marketplace, and a private Telegram channel-based withdrawal approval workflow.

---

## 🌟 Key Features

1. **Dual Currency Economy**:
   - **TON Coin**: Real withdrawable cryptocurrency passively mined by the rig.
   - **NC Coin**: In-game utility fuel used to recharge the mining rig's power supply and upgrade equipment.
2. **Power Supply Grid (Battery Mechanics)**:
   - Max battery life: 8 hours (100%).
   - Power drains linearly to 0%. While power > 0%, the rig mines TON at `ton_hashrate_per_sec`. At 0%, mining halts completely.
   - Recharging to 100% requires spending 500 NC Coins (or watching an Adsgram rewarded video).
   - Time-delta computation: Calculate accrued TON and depleted battery on-demand during `/api/mining/sync` (never per-second server intervals).
3. **Drop Catcher Mini-Game (30s Canvas)**:
   - Falling Gold Coins (+10 NC), Cyan Gems (+25 NC + micro-TON), and Red Hazards (-15 NC).
   - Server-enforced anti-cheat: `/api/game/start` issues a cryptographic `sessionId`; `/api/game/finish` validates round duration ($\ge 28\text{s}$) and score ceiling.
   - Haptic feedback integration with Telegram WebApp.
4. **Dynamic Dual Rewards & Admin Control**:
   - Rewards for games, ads, and tasks are read dynamically from the `reward_configs` database table so the admin can adjust NC and TON values live without code changes.
5. **Peer-to-Peer & Admin Dynamic Missions**:
   - Community users can launch sponsored tasks by paying via Telegram Stars (`XTR`) or TON Connect.
   - Admin can add unlimited priority missions from an in-app modal.
   - Supports `telegram_join` (auto-verified via bot API `getChatMember`), `visit_url`, and `bot_launch`.
   - Atomic database completion increments to prevent over-budget task claims.
6. **Admin-Verified Channel Withdrawal**:
   - User requests TON payout -> backend freezes funds and sets status `PENDING`.
   - Telegraf bot posts an interactive message card to a private Admin Telegram Channel with `[Approve ✅]` and `[Reject ❌]` inline buttons.
   - Admin callback updates the database, edits the channel message to disable buttons, and sends a direct Telegram message to the user. Rejection automatically refunds the TON balance.
7. **Web3 Wallet**:
   - Built-in `@tonconnect/ui-react` wallet connection for instant address auto-fill and payment.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, `@twa-dev/sdk`, `@tonconnect/ui-react`, Lucide React icons, Canvas 2D API, `canvas-confetti`.
- **Backend**: Node.js with Express (TypeScript), `telegraf` Telegram Bot Engine, Prisma ORM / PostgreSQL pool, `zod`, `crypto`.
- **Database**: PostgreSQL (Prisma schema + standalone `schema.sql` migration script).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ and **npm** v9+
- **PostgreSQL** instance (local, Docker, Supabase, or Neon)
- **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)

### 2. Environment Setup

Copy `.env.example` in `backend/`:
```bash
cd backend
cp .env.example .env
```

Configure your `.env` variables:
```ini
PORT=5000
NODE_ENV=development
ALLOW_DEV_AUTH=true

# PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nctons?schema=public"

# Telegram Bot Credentials
BOT_TOKEN="1234567890:ABCdefGhIJKlmNoPQRstuVWXyz"
ADMIN_TELEGRAM_IDS="123456789,987654321"
ADMIN_CHANNEL_ID="-1001234567890"
WEBAPP_URL="http://localhost:5173"
```

> **Setting up the Admin Channel**:
> 1. Create a private Telegram channel (e.g. "NC TONs Payout Approvals").
> 2. Add your bot as an **Administrator** with permission to post and edit messages.
> 3. Get the channel ID (starts with `-100...`) and paste it as `ADMIN_CHANNEL_ID`.
> 4. Add your personal Telegram User ID to `ADMIN_TELEGRAM_IDS`.

### 3. Database Migration & Seed

You can apply the schema using Prisma:
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
```

*Or execute `backend/src/db/schema.sql` directly into your PostgreSQL database using `psql` or Supabase SQL Editor.*

### 4. Running Locally

Install dependencies and start both backend and frontend:

```bash
# In the root directory:
npm run install:all
npm run dev
```

Or individually:
```bash
# Terminal 1 (Backend):
cd backend
npm run dev

# Terminal 2 (Frontend):
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` and automatically proxy `/api` calls to the backend on `http://localhost:5000`.

---

## 🧪 Developer Browser Mode

When developing outside the Telegram mobile client:
- The app automatically presents a **Dev Bar** at the top.
- You can toggle between **Miner (Regular User)** and **Admin** roles with one click.
- Test the full loop: passive mining, battery depletion, recharge with NC/ad, playing the Drop Catcher game, claiming missions, requesting TON withdrawals, and adjusting live reward multipliers.

---

## 📁 Repository Structure

```
NC TONS TG/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Initial rewards & sample missions
│   ├── src/
│   │   ├── config/env.ts          # Zod-validated environment config
│   │   ├── db/
│   │   │   ├── db.ts              # Prisma client with BigInt serialization
│   │   │   └── schema.sql         # Standalone PostgreSQL migration script
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts   # Telegram initData HMAC-SHA256 validator
│   │   │   └── adminMiddleware.ts  # ADMIN_TELEGRAM_IDS authorization
│   │   ├── bot/
│   │   │   ├── telegrafInstance.ts # Telegraf bot init
│   │   │   ├── notifications.ts   # Channel approval cards & user DMs
│   │   │   └── handlers/
│   │   │       ├── startHandler.ts # /start with referral deep-linking
│   │   │       └── adminActionHandler.ts # wd_approve/wd_reject inline buttons
│   │   ├── services/
│   │   │   ├── miningService.ts   # On-demand time-delta math
│   │   │   ├── gameService.ts     # Anti-cheat session & score validation
│   │   │   └── missionService.ts  # Channel membership check & atomic claims
│   │   ├── controllers/           # REST endpoints
│   │   └── index.ts               # Express & bot startup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/            # UI components (Battery Gauge, Canvas, Cards)
│   │   ├── pages/                 # Dashboard, Game, Missions, Wallet, Admin
│   │   ├── hooks/                 # useMining (live interpolation), useTelegram
│   │   ├── services/api.ts        # API client
│   │   ├── types/index.ts         # TypeScript models
│   │   ├── App.tsx                # App root with TonConnect & navigation
│   │   └── main.tsx
│   ├── public/tonconnect-manifest.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── package.json
└── README.md
```

---

## 11. DAILY STREAK & CHECK-IN SYSTEM
- **Database Architecture**:
  - `users`: add `daily_streak` (INT default 0), `last_daily_claim_date` (DATE default NULL), `total_daily_claims` (INT default 0).
  - `daily_streak_rewards`: `day_number` (1 to 7 PK), `nc_reward` (INT), `ton_reward` (NUMERIC 14,6), `battery_bonus_pct` (INT default 0).
- **Backend Endpoints (`/api/daily`)**:
  - `GET /api/daily/status`: Evaluates `last_daily_claim_date` against `CURRENT_DATE` at UTC. Returns `canClaim` (boolean), `currentStreak`, and `nextStreak` (resets to 1 if user missed at least 1 calendar day).
  - `POST /api/daily/claim`: Atomic transaction verifying that the user has not claimed on `CURRENT_DATE`. Increments streak, sets `last_daily_claim_date = CURRENT_DATE`, credits dual balances (`nc_balance` and `ton_balance`), and adds any milestone battery boost (`power_percentage = LEAST(100, power_percentage + bonus)`).
- **Frontend Components**:
  - `DailyStreakModal.tsx`: Visual 7-day roadmap with checkmarks, lock states, `<NcIcon/>`, `<TonIcon/>`, and Day 7 Jackpot highlighting.
  - Automatically pops up on initial app load when `canClaim === true`.
  - `DailyCheckInBanner.tsx`: Mining view quick-access launcher badge with live status.

---

## 12. SCREENSHOT VERIFICATION FOR SOCIAL TASKS (YouTube, Instagram, Facebook, X)
- **Database Architecture**:
  - `dynamic_missions`: add `requires_proof` (BOOLEAN default FALSE), `proof_instructions` (TEXT).
  - `task_proof_submissions`: `id` (SERIAL PK), `user_id` (BIGINT), `mission_id` (INT FK), `channel_message_id` (BIGINT), `status` (VARCHAR 'PENDING_REVIEW', 'APPROVED', 'REJECTED'), `created_at`, `updated_at`, `UNIQUE(user_id, mission_id)`.
- **Backend & Direct-to-Telegram Image Streaming**:
  - `POST /api/proof/submit`: Uses `multer` memory storage (max 5MB, JPEG/PNG/WEBP). Validates task eligibility, records pending submission, and streams image buffer directly to `ADMIN_CHANNEL_ID` via `bot.telegram.sendPhoto` with caption metadata and inline buttons `[Approve Task ✅]` and `[Reject Proof ❌]` (no external image hosting service required).
  - Bot action callbacks (`task_appr:<id>` and `task_rej:<id>`):
    - When approved: Atomically records claim in `user_mission_claims`, credits `nc_balance` and `ton_balance`, updates the channel post to show reviewed state, and sends direct Telegram notification to the user.
    - When rejected: Updates channel post, marks status `REJECTED`, and notifies user to retry with a valid screenshot.
- **Frontend Components**:
  - `ScreenshotProofModal.tsx`: Dual-step modal providing direct action link (Instagram, YouTube, X, Facebook), file picker with live image thumbnail preview, and upload progress handler.
  - Integrate modal trigger into `MissionCard.tsx` whenever `requires_proof === true` or `task_type === 'screenshot_social'`.

---

## 13. DUAL AD NETWORKS (Adsgram & Monetag) & WITHDRAWAL GATEKEEPER
- **Database Architecture**:
  - `user_daily_ads`: `user_id` (BIGINT), `ad_date` (DATE default CURRENT_DATE), `adsgram_count` (INT default 0), `monetag_count` (INT default 0), `last_ad_at` (TIMESTAMP), `PRIMARY KEY(user_id, ad_date)`.
  - `reward_configs`: seed `ad_adsgram` (200 NC, 0.000300 TON) and `ad_monetag` (200 NC, 0.000200 TON).
- **Ad Provider Limits & Rewards**:
  - **Adsgram**: Max 25 ads/day. Each view awards +200 NC and +0.000300 TON.
  - **Monetag**: Max 15 ads/day. Each view awards +200 NC and +0.000200 TON.
- **Mandatory Daily Withdrawal Gatekeeper**:
  - In `POST /api/withdraw/request`, verify that the user's `user_daily_ads` record for `CURRENT_DATE` has:
    - `adsgram_count >= 8`
    - `monetag_count >= 4`
  - If conditions are not met, reject the withdrawal request with a 403 error detailing remaining views required.
- **Interstitial Trigger Locations**:
  - Trigger an interstitial ad on:
    1. Navigation tab changes (`handleTabChange`).
    2. Start actions ("Start Mining" and game launches in Arcade).
    3. Tapping the "Withdraw" button in Wallet view.
  - Cooldown: Enforce a client-side minimum 45-second interval between interstitial ads to protect user experience.
- **Frontend Components**:
  - Embed official Adsgram and Monetag in-app SDKs in `index.html`.
  - Implement `useAdManager.ts` coordinating both rewarded and interstitial ad calls.
  - `AdMissionsSection.tsx`: Task cards on the Missions page displaying live view counts (e.g. `12/25` Adsgram, `5/15` Monetag) and an active "Withdrawal Status" unlock badge.

---

## 14. NEON POSTGRESQL & NOTION WORKSPACE INTEGRATION
- **Neon Cloud PostgreSQL**:
  - Hosted on AWS (`aws-us-east-1`) via Neon Serverless Postgres.
  - Provisioned Project: `nctons-db` (`sweet-resonance-09215870`).
  - Active Pooled URI configured in `backend/.env` under `DATABASE_URL`.
  - All 13 tables, relations, and seed catalogs provisioned:
    `users`, `withdrawals`, `dynamic_missions`, `mission_claims`, `user_mission_claims`, `task_proof_submissions`, `promo_codes`, `user_promo_claims`, `referrals`, `daily_streak_rewards`, `user_daily_streaks`, `user_daily_ads`, `reward_configs`.
- **Notion Workspace Integration Service**:
  - Installed `@notionhq/client` for secure Notion API access.
  - `backend/src/services/notionService.ts`:
    - `getNotionStatus()`: Queries Notion API to verify token authentication, bot identity, and database permissions.
    - `syncWithdrawalToNotion()`: Automatically logs new payout requests to the configured Notion Withdrawals database.
    - `syncTaskSubmissionToNotion()`: Synchronizes user screenshot proofs to the configured Notion Tasks database for admin review.
  - `backend/src/routes/notion.ts`:
    - `GET /api/notion/status`: Diagnostic health check for the Notion workspace integration.
    - `POST /api/notion/test-sync`: Dispatches test records to Notion to verify database schemas and integration tokens.
    - `POST /api/notion/configure`: Allows setting or updating `NOTION_API_KEY`, `NOTION_WITHDRAWALS_DATABASE_ID`, and `NOTION_TASKS_DATABASE_ID`.

---

## 15. RENDER BACKEND DEPLOYMENT

The backend is configured for automated zero-downtime deployment on [Render](https://render.com) using the included `render.yaml` Blueprint or native Node / Docker web service.

### Option A: 1-Click Blueprint Deployment (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
2. Select your connected repository: `sanexa-techx/NC-TONS-TG`.
3. Render will automatically read `render.yaml` from the root directory.
4. Fill in your secret environment variables:
   - `DATABASE_URL`: Your Neon PostgreSQL pooled connection string
   - `DIRECT_URL`: Your Neon PostgreSQL direct connection string
   - `BOT_TOKEN`: Your Telegram Bot Token from `@BotFather`
   - `ADMIN_CHANNEL_ID`: Your private Telegram channel ID (e.g. `-1001234567890`)
   - `ADMIN_TELEGRAM_IDS`: Your Telegram User ID (e.g. `123456789`)
   - `WEBAPP_URL`: `https://nctons-tg.netlify.app`
5. Click **Apply**. Render will automatically build, generate Prisma client, and launch the service.

### Option B: Manual Web Service on Render
If configuring manually as a **Web Service**:
- **Name**: `nc-tons-backend`
- **Region**: `Oregon (US West)` or `Ohio (US East)`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

### Netlify Frontend Proxy Integration
The Netlify frontend at [nctons-tg.netlify.app](https://nctons-tg.netlify.app) includes a proxy rule in `netlify.toml` forwarding `/api/*` requests directly to `https://nc-tons-backend.onrender.com/api/:splat`.
