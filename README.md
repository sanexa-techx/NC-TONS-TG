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
