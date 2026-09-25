import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import pg from 'pg';
import { ENV } from '../config/env.js';

// Enable JSON serialization of BigInt for Express responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const realPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

let realPool: pg.Pool | null = null;
try {
  realPool = new pg.Pool({
    connectionString: ENV.DATABASE_URL,
  });
  realPool.on('error', (err: any) => {
    console.warn('Postgres pool error:', err.message);
  });
} catch (e) {
  realPool = null;
}

let isPostgresConnected = false;

// In-memory mock database state for seamless local testing without Postgres
const memoryStore = {
  users: new Map<string, any>(),
  rewardConfigs: new Map<string, any>([
    [
      'game_memory',
      {
        action_type: 'game_memory',
        display_name: 'Memory Matrix Puzzle',
        nc_reward: 45,
        ton_reward: new Decimal('0.000015'),
        updated_at: new Date(),
      },
    ],
    [
      'game_2048',
      {
        action_type: 'game_2048',
        display_name: '2048 Tile Merge',
        nc_reward: 60,
        ton_reward: new Decimal('0.000020'),
        updated_at: new Date(),
      },
    ],
    [
      'game_carrace',
      {
        action_type: 'game_carrace',
        display_name: 'Cyber Car Race',
        nc_reward: 50,
        ton_reward: new Decimal('0.000025'),
        updated_at: new Date(),
      },
    ],
    [
      'watch_ad',
      {
        action_type: 'watch_ad',
        display_name: 'Adsgram Rewarded Video',
        nc_reward: 250,
        ton_reward: new Decimal('0.000100'),
        updated_at: new Date(),
      },
    ],
    [
      'task_default',
      {
        action_type: 'task_default',
        display_name: 'Standard Community Mission',
        nc_reward: 300,
        ton_reward: new Decimal('0.000200'),
        updated_at: new Date(),
      },
    ],
    [
      'ad_adsgram',
      {
        action_type: 'ad_adsgram',
        display_name: 'Adsgram Rewarded Video',
        nc_reward: 200,
        ton_reward: new Decimal('0.000300'),
        updated_at: new Date(),
      },
    ],
    [
      'ad_monetag',
      {
        action_type: 'ad_monetag',
        display_name: 'Monetag Rewarded Ad',
        nc_reward: 200,
        ton_reward: new Decimal('0.000200'),
        updated_at: new Date(),
      },
    ],
    [
      'referral_standard',
      {
        action_type: 'referral_standard',
        display_name: 'Standard Referral Bonus',
        nc_reward: 1000,
        ton_reward: new Decimal('0.000080'),
        updated_at: new Date(),
      },
    ],
    [
      'referral_premium',
      {
        action_type: 'referral_premium',
        display_name: 'TG Premium Referral Bonus',
        nc_reward: 2500,
        ton_reward: new Decimal('0.000200'),
        updated_at: new Date(),
      },
    ],
  ]),
  missions: [
    {
      id: 1,
      creator_user_id: 0n,
      title: 'Join Official NC TONs Channel',
      description: 'Subscribe to our official Telegram channel for daily mining codes and updates.',
      category: 'telegram',
      task_type: 'telegram_join',
      action_url: 'https://t.me/nctons_official',
      telegram_chat_id: '@nctons_official',
      nc_reward: 500,
      ton_reward: new Decimal('0.000500'),
      target_users: 10000,
      completed_count: 342,
      is_active: true,
      priority: 10,
      created_at: new Date(),
    },
    {
      id: 2,
      creator_user_id: 0n,
      title: 'Follow NC TONs on X (Twitter)',
      description: 'Follow our official announcement feed on X to never miss airdrop announcements.',
      category: 'social',
      task_type: 'visit_url',
      action_url: 'https://x.com/nctons',
      telegram_chat_id: null,
      nc_reward: 300,
      ton_reward: new Decimal('0.000200'),
      target_users: 5000,
      completed_count: 812,
      is_active: true,
      priority: 5,
      created_at: new Date(),
    },
    {
      id: 3,
      creator_user_id: 0n,
      title: 'Explore TON Ecosystem Bot',
      description: 'Launch the partner TON ecosystem bot and start your web3 adventure.',
      category: 'partner',
      task_type: 'bot_launch',
      action_url: 'https://t.me/ton_ecosystem_bot',
      telegram_chat_id: null,
      nc_reward: 400,
      ton_reward: new Decimal('0.000300'),
      target_users: 2000,
      completed_count: 149,
      is_active: true,
      priority: 2,
      created_at: new Date(),
    },
    {
      id: 4,
      creator_user_id: 0n,
      title: 'Subscribe to NC TONs YouTube',
      description: 'Subscribe to our official YouTube channel and upload screenshot proof of your subscription.',
      category: 'social',
      task_type: 'screenshot_social',
      action_url: 'https://youtube.com/@nctons',
      telegram_chat_id: null,
      nc_reward: 600,
      ton_reward: new Decimal('0.000400'),
      target_users: 5000,
      completed_count: 94,
      is_active: true,
      priority: 8,
      requires_proof: true,
      proof_instructions: 'Take a screenshot showing the Subscribed button on our YouTube channel and upload it below:',
      created_at: new Date(),
    },
  ],
  taskProofSubmissions: [] as Array<{
    id: number;
    user_id: bigint;
    mission_id: number;
    telegram_file_id: string | null;
    channel_message_id: bigint | null;
    status: string; // 'PENDING_REVIEW', 'APPROVED', 'REJECTED'
    reviewed_by: bigint | null;
    created_at: Date;
    updated_at: Date;
  }>,
  taskProofSubmissionIdSeq: 1,
  claims: [] as Array<{ id: number; mission_id: number; user_id: bigint; claimed_at: Date }>,
  withdrawals: [] as any[],
  gameSessions: new Map<string, any>(),
  withdrawalIdSeq: 101,
  missionIdSeq: 4,
  promoCodes: [] as Array<{
    id: number;
    code: string;
    nc_reward: number;
    ton_reward: Decimal;
    max_claims: number | null;
    claimed_count: number;
    is_active: boolean;
    created_at: Date;
  }>,
  promoClaims: [] as Array<{ id: number; promo_code_id: number; user_id: bigint; claimed_at: Date }>,
  promoCodeIdSeq: 1,
  promoClaimIdSeq: 1,
  referrals: [] as Array<{
    id: number;
    referrer_id: bigint;
    referee_id: bigint;
    is_premium: boolean;
    bonus_nc: number;
    bonus_ton: Decimal;
    created_at: Date;
  }>,
  referralIdSeq: 1,
  dailyStreakRewards: [
    { day_number: 1, nc_reward: 250, ton_reward: '0.000010', battery_bonus_pct: 0 },
    { day_number: 2, nc_reward: 500, ton_reward: '0.000020', battery_bonus_pct: 20 },
    { day_number: 3, nc_reward: 800, ton_reward: '0.000035', battery_bonus_pct: 0 },
    { day_number: 4, nc_reward: 1200, ton_reward: '0.000050', battery_bonus_pct: 0 },
    { day_number: 5, nc_reward: 1800, ton_reward: '0.000075', battery_bonus_pct: 50 },
    { day_number: 6, nc_reward: 2600, ton_reward: '0.000100', battery_bonus_pct: 0 },
    { day_number: 7, nc_reward: 4500, ton_reward: '0.000250', battery_bonus_pct: 100 },
  ] as Array<{
    day_number: number;
    nc_reward: number;
    ton_reward: string;
    battery_bonus_pct: number;
  }>,
  dailyAds: new Map<string, {
    user_id: bigint;
    ad_date: string;
    adsgram_count: number;
    monetag_count: number;
    last_ad_at: Date;
  }>(),
  botChats: new Map<string, {
    chat_id: bigint;
    chat_type: string;
    title: string | null;
    created_at: Date;
  }>(),
  referralMilestones: [
    { target_count: 1, display_name: '1 Friend Recruited', nc_reward: 5000, ton_reward: new Decimal('0.000500'), updated_at: new Date() },
    { target_count: 3, display_name: '3 Friends Recruited', nc_reward: 15000, ton_reward: new Decimal('0.001500'), updated_at: new Date() },
    { target_count: 7, display_name: '7 Friends Recruited', nc_reward: 40000, ton_reward: new Decimal('0.004000'), updated_at: new Date() },
    { target_count: 10, display_name: '10 Friends Recruited', nc_reward: 80000, ton_reward: new Decimal('0.008000'), updated_at: new Date() },
  ] as Array<{
    target_count: number;
    display_name: string;
    nc_reward: number;
    ton_reward: Decimal;
    updated_at: Date;
  }>,
  userMilestoneClaims: [] as Array<{ id: number; user_id: bigint; target_count: number; claimed_at: Date }>,
  userMilestoneClaimIdSeq: 1,
};



// Mock Prisma client for zero-dependency standalone testing
const mockPrisma = {
  user: {
    async findUnique({ where }: any) {
      const user = memoryStore.users.get(where.id.toString());
      return user ? { ...user } : null;
    },
    async create({ data }: any) {
      const newUser = {
        ...data,
        id: BigInt(data.id),
        ton_balance: data.ton_balance instanceof Decimal ? data.ton_balance : new Decimal(data.ton_balance || 0),
        nc_balance: BigInt(data.nc_balance || 0),
        ton_hashrate_per_sec: data.ton_hashrate_per_sec instanceof Decimal ? data.ton_hashrate_per_sec : new Decimal(data.ton_hashrate_per_sec || '0.00000100'),
        last_sync_at: data.last_sync_at || new Date(),
        referred_by: data.referred_by !== undefined ? (data.referred_by ? BigInt(data.referred_by) : null) : null,
        referral_count: data.referral_count || 0,
        unclaimed_referral_nc: BigInt(data.unclaimed_referral_nc || 0),
        unclaimed_referral_ton: data.unclaimed_referral_ton instanceof Decimal ? data.unclaimed_referral_ton : new Decimal(data.unclaimed_referral_ton || '0.000000'),
        total_referral_nc: BigInt(data.total_referral_nc || 0),
        total_referral_ton: data.total_referral_ton instanceof Decimal ? data.total_referral_ton : new Decimal(data.total_referral_ton || '0.000000'),
        photo_url: data.photo_url || null,
        photo_synced_at: data.photo_synced_at || null,
        miner_level: data.miner_level || 1,
        daily_streak: data.daily_streak || 0,
        last_daily_claim_date: data.last_daily_claim_date || null,
        total_daily_claims: data.total_daily_claims || 0,
        created_at: new Date(),
      };
      memoryStore.users.set(data.id.toString(), newUser);
      return { ...newUser };
    },
    async update({ where, data }: any) {
      const existing = memoryStore.users.get(where.id.toString());
      if (!existing) throw new Error('User not found');

      if (data.daily_streak !== undefined) existing.daily_streak = data.daily_streak;
      if (data.last_daily_claim_date !== undefined) existing.last_daily_claim_date = data.last_daily_claim_date;
      if (data.total_daily_claims !== undefined) existing.total_daily_claims = data.total_daily_claims;

      if (data.ton_balance?.increment) {
        existing.ton_balance = existing.ton_balance.plus(data.ton_balance.increment);
      } else if (data.ton_balance?.decrement) {
        existing.ton_balance = existing.ton_balance.minus(data.ton_balance.decrement);
      } else if (data.ton_balance !== undefined) {
        existing.ton_balance = data.ton_balance instanceof Decimal ? data.ton_balance : new Decimal(data.ton_balance);
      }

      if (data.nc_balance?.increment) {
        existing.nc_balance = existing.nc_balance + BigInt(data.nc_balance.increment);
      } else if (data.nc_balance?.decrement) {
        existing.nc_balance = existing.nc_balance - BigInt(data.nc_balance.decrement);
      } else if (data.nc_balance !== undefined) {
        existing.nc_balance = BigInt(data.nc_balance);
      }

      // Referral stats updates
      if (data.referral_count?.increment) {
        existing.referral_count = (existing.referral_count || 0) + Number(data.referral_count.increment);
      } else if (data.referral_count !== undefined) {
        existing.referral_count = Number(data.referral_count);
      }

      if (data.unclaimed_referral_nc?.increment) {
        existing.unclaimed_referral_nc = (existing.unclaimed_referral_nc || 0n) + BigInt(data.unclaimed_referral_nc.increment);
      } else if (data.unclaimed_referral_nc !== undefined) {
        existing.unclaimed_referral_nc = BigInt(data.unclaimed_referral_nc);
      }

      if (data.unclaimed_referral_ton?.increment) {
        existing.unclaimed_referral_ton = (existing.unclaimed_referral_ton || new Decimal(0)).plus(data.unclaimed_referral_ton.increment);
      } else if (data.unclaimed_referral_ton !== undefined) {
        existing.unclaimed_referral_ton = data.unclaimed_referral_ton instanceof Decimal ? data.unclaimed_referral_ton : new Decimal(data.unclaimed_referral_ton);
      }

      if (data.total_referral_nc?.increment) {
        existing.total_referral_nc = (existing.total_referral_nc || 0n) + BigInt(data.total_referral_nc.increment);
      } else if (data.total_referral_nc !== undefined) {
        existing.total_referral_nc = BigInt(data.total_referral_nc);
      }

      if (data.total_referral_ton?.increment) {
        existing.total_referral_ton = (existing.total_referral_ton || new Decimal(0)).plus(data.total_referral_ton.increment);
      } else if (data.total_referral_ton !== undefined) {
        existing.total_referral_ton = data.total_referral_ton instanceof Decimal ? data.total_referral_ton : new Decimal(data.total_referral_ton);
      }

      if (data.referred_by !== undefined) existing.referred_by = data.referred_by ? BigInt(data.referred_by) : null;
      if (data.power_percentage !== undefined) existing.power_percentage = data.power_percentage;
      if (data.last_sync_at !== undefined) existing.last_sync_at = data.last_sync_at;
      if (data.photo_url !== undefined) existing.photo_url = data.photo_url;
      if (data.photo_synced_at !== undefined) existing.photo_synced_at = data.photo_synced_at;
      if (data.miner_level !== undefined) existing.miner_level = data.miner_level;

      memoryStore.users.set(where.id.toString(), existing);
      return { ...existing };
    },
    async count() {
      return memoryStore.users.size;
    },
  },

  rewardConfig: {
    async findUnique({ where }: any) {
      const cfg = memoryStore.rewardConfigs.get(where.action_type);
      return cfg ? { ...cfg } : null;
    },
    async findMany() {
      return Array.from(memoryStore.rewardConfigs.values());
    },
    async upsert({ where, update, create }: any) {
      const existing = memoryStore.rewardConfigs.get(where.action_type);
      const updated = existing
        ? { ...existing, ...update }
        : { ...create, action_type: where.action_type };
      memoryStore.rewardConfigs.set(where.action_type, updated);
      return { ...updated };
    },
  },

  dynamicMission: {
    async findMany({ where, orderBy }: any = {}) {
      let list = [...memoryStore.missions];
      if (where?.is_active !== undefined) {
        list = list.filter((m) => m.is_active === where.is_active);
      }
      return list;
    },
    async findUnique({ where }: any) {
      const found = memoryStore.missions.find((m) => m.id === where.id);
      return found ? { ...found } : null;
    },
    async findFirst({ where }: any) {
      const found = memoryStore.missions.find((m) => m.title === where.title);
      return found ? { ...found } : null;
    },
    async create({ data }: any) {
      const newMission = {
        ...data,
        id: memoryStore.missionIdSeq++,
        completed_count: 0,
        is_active: data.is_active ?? true,
        created_at: new Date(),
      };
      memoryStore.missions.push(newMission);
      return { ...newMission };
    },
    async update({ where, data }: any) {
      const idx = memoryStore.missions.findIndex((m) => m.id === where.id);
      if (idx === -1) throw new Error('Mission not found');

      if (data.completed_count?.increment) {
        memoryStore.missions[idx].completed_count += data.completed_count.increment;
      }
      if (data.is_active !== undefined) memoryStore.missions[idx].is_active = data.is_active;
      if (data.priority !== undefined) memoryStore.missions[idx].priority = data.priority;
      if (data.nc_reward !== undefined) memoryStore.missions[idx].nc_reward = data.nc_reward;
      if (data.ton_reward !== undefined) memoryStore.missions[idx].ton_reward = data.ton_reward;
      if (data.target_users !== undefined) memoryStore.missions[idx].target_users = data.target_users;

      return { ...memoryStore.missions[idx] };
    },
    async count({ where }: any = {}) {
      if (where?.is_active !== undefined) {
        return memoryStore.missions.filter((m) => m.is_active === where.is_active).length;
      }
      return memoryStore.missions.length;
    },
  },

  missionClaim: {
    async findMany({ where }: any = {}) {
      return memoryStore.claims.filter((c) => c.user_id === where.user_id);
    },
    async findUnique({ where }: any) {
      const { user_id, mission_id } = where.user_id_mission_id;
      const found = memoryStore.claims.find(
        (c) => c.user_id === user_id && c.mission_id === mission_id
      );
      return found ? { ...found } : null;
    },
    async create({ data }: any) {
      const newClaim = {
        id: memoryStore.claims.length + 1,
        mission_id: data.mission_id,
        user_id: data.user_id,
        claimed_at: new Date(),
      };
      memoryStore.claims.push(newClaim);
      return { ...newClaim };
    },
  },

  withdrawal: {
    async create({ data }: any) {
      const newWd = {
        ...data,
        id: memoryStore.withdrawalIdSeq++,
        created_at: new Date(),
      };
      memoryStore.withdrawals.unshift(newWd);
      return { ...newWd };
    },
    async update({ where, data }: any) {
      const found = memoryStore.withdrawals.find((w) => w.id === where.id);
      if (!found) throw new Error('Withdrawal not found');
      Object.assign(found, data);
      return { ...found };
    },
    async findUnique({ where, include }: any) {
      const found = memoryStore.withdrawals.find((w) => w.id === where.id);
      if (!found) return null;
      const result: any = { ...found };
      if (include?.user) {
        result.user = memoryStore.users.get(found.user_id.toString());
      }
      return result;
    },
    async findMany({ where, take }: any = {}) {
      let list = memoryStore.withdrawals.filter((w) => w.user_id === where.user_id);
      if (take) list = list.slice(0, take);
      return list;
    },
    async count({ where }: any = {}) {
      if (where?.status) {
        return memoryStore.withdrawals.filter((w) => w.status === where.status).length;
      }
      return memoryStore.withdrawals.length;
    },
  },

  gameSession: {
    async create({ data }: any) {
      const session = {
        ...data,
        status: data.status || 'ACTIVE',
        started_at: data.started_at || new Date(),
        finished_at: data.finished_at || null,
        score: data.score ?? null,
      };
      memoryStore.gameSessions.set(data.id, session);
      return { ...session };
    },
    async findUnique({ where }: any) {
      const session = memoryStore.gameSessions.get(where.id);
      return session ? { ...session } : null;
    },
    async update({ where, data }: any) {
      const existing = memoryStore.gameSessions.get(where.id);
      if (!existing) throw new Error('Game session not found');
      Object.assign(existing, data);
      memoryStore.gameSessions.set(where.id, existing);
      return { ...existing };
    },
    async delete({ where }: any) {
      const existing = memoryStore.gameSessions.get(where.id);
      memoryStore.gameSessions.delete(where.id);
      return existing;
    },
  },

  promoCode: {
    async findUnique({ where }: any) {
      if (where.id !== undefined) {
        const found = memoryStore.promoCodes.find((p) => p.id === Number(where.id));
        return found ? { ...found } : null;
      }
      if (where.code !== undefined) {
        const found = memoryStore.promoCodes.find((p) => p.code.toUpperCase() === String(where.code).toUpperCase());
        return found ? { ...found } : null;
      }
      return null;
    },
    async findFirst({ where }: any) {
      if (where?.code) {
        const found = memoryStore.promoCodes.find((p) => p.code.toUpperCase() === String(where.code).toUpperCase());
        return found ? { ...found } : null;
      }
      return memoryStore.promoCodes[0] ? { ...memoryStore.promoCodes[0] } : null;
    },
    async findMany({ orderBy }: any = {}) {
      const list = [...memoryStore.promoCodes];
      list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return list.map((p) => ({ ...p }));
    },
    async create({ data }: any) {
      const codeUpper = String(data.code).trim().toUpperCase();
      const existing = memoryStore.promoCodes.find((p) => p.code === codeUpper);
      if (existing) {
        const err: any = new Error('Promo code already exists');
        err.code = 'P2002';
        throw err;
      }
      const newPromo = {
        id: memoryStore.promoCodeIdSeq++,
        code: codeUpper,
        nc_reward: Number(data.nc_reward ?? 500),
        ton_reward: data.ton_reward instanceof Decimal ? data.ton_reward : new Decimal(data.ton_reward ?? '0.000050'),
        max_claims: data.max_claims !== undefined && data.max_claims !== null ? Number(data.max_claims) : null,
        claimed_count: 0,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
        created_at: new Date(),
      };
      memoryStore.promoCodes.unshift(newPromo);
      return { ...newPromo };
    },
    async update({ where, data }: any) {
      const found = memoryStore.promoCodes.find((p) => p.id === Number(where.id));
      if (!found) throw new Error('Promo code not found');
      if (data.claimed_count?.increment) {
        found.claimed_count += data.claimed_count.increment;
      } else if (data.claimed_count !== undefined) {
        found.claimed_count = Number(data.claimed_count);
      }
      if (data.is_active !== undefined) {
        found.is_active = Boolean(data.is_active);
      }
      if (data.nc_reward !== undefined) found.nc_reward = Number(data.nc_reward);
      if (data.ton_reward !== undefined) {
        found.ton_reward = data.ton_reward instanceof Decimal ? data.ton_reward : new Decimal(data.ton_reward);
      }
      if (data.max_claims !== undefined) found.max_claims = data.max_claims === null ? null : Number(data.max_claims);
      return { ...found };
    },
    async delete({ where }: any) {
      const idx = memoryStore.promoCodes.findIndex((p) => p.id === Number(where.id));
      if (idx === -1) throw new Error('Promo code not found');
      const removed = memoryStore.promoCodes.splice(idx, 1)[0];
      // Cascade delete claims
      memoryStore.promoClaims = memoryStore.promoClaims.filter((c) => c.promo_code_id !== removed.id);
      return { ...removed };
    },
  },

  userPromoClaim: {
    async findUnique({ where }: any) {
      if (where.unique_user_promo) {
        const { user_id, promo_code_id } = where.unique_user_promo;
        const found = memoryStore.promoClaims.find(
          (c) => BigInt(c.user_id) === BigInt(user_id) && c.promo_code_id === Number(promo_code_id)
        );
        return found ? { ...found } : null;
      }
      if (where.id) {
        const found = memoryStore.promoClaims.find((c) => c.id === Number(where.id));
        return found ? { ...found } : null;
      }
      return null;
    },
    async findFirst({ where }: any) {
      const found = memoryStore.promoClaims.find(
        (c) => BigInt(c.user_id) === BigInt(where.user_id) && c.promo_code_id === Number(where.promo_code_id)
      );
      return found ? { ...found } : null;
    },
    async findMany({ where }: any = {}) {
      let list = [...memoryStore.promoClaims];
      if (where?.user_id) {
        list = list.filter((c) => BigInt(c.user_id) === BigInt(where.user_id));
      }
      if (where?.promo_code_id) {
        list = list.filter((c) => c.promo_code_id === Number(where.promo_code_id));
      }
      return list.map((c) => ({ ...c }));
    },
    async create({ data }: any) {
      const userId = BigInt(data.user_id);
      const promoCodeId = Number(data.promo_code_id);
      const existing = memoryStore.promoClaims.find(
        (c) => BigInt(c.user_id) === userId && c.promo_code_id === promoCodeId
      );
      if (existing) {
        const err: any = new Error('Unique constraint failed on the constraint: unique_user_promo');
        err.code = 'P2002';
        throw err;
      }
      const newClaim = {
        id: memoryStore.promoClaimIdSeq++,
        user_id: userId,
        promo_code_id: promoCodeId,
        claimed_at: new Date(),
      };
      memoryStore.promoClaims.push(newClaim);
      return { ...newClaim };
    },
    async deleteMany({ where }: any) {
      if (where?.promo_code_id) {
        memoryStore.promoClaims = memoryStore.promoClaims.filter((c) => c.promo_code_id !== Number(where.promo_code_id));
      }
      return { count: 1 };
    },
  },

  referral: {
    async findMany({ where, orderBy, take, include }: any = {}) {
      let list = [...memoryStore.referrals];
      if (where?.referrer_id !== undefined) {
        list = list.filter((r) => r.referrer_id === BigInt(where.referrer_id));
      }
      if (where?.referee_id !== undefined) {
        list = list.filter((r) => r.referee_id === BigInt(where.referee_id));
      }
      if (orderBy?.created_at === 'desc') {
        list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      }
      if (take && take > 0) {
        list = list.slice(0, take);
      }
      return list.map((r) => {
        const item: any = { ...r };
        if (include?.referee) {
          const refereeUser = memoryStore.users.get(r.referee_id.toString());
          item.referee = refereeUser ? { ...refereeUser } : null;
        }
        if (include?.referrer) {
          const referrerUser = memoryStore.users.get(r.referrer_id.toString());
          item.referrer = referrerUser ? { ...referrerUser } : null;
        }
        return item;
      });
    },
    async findUnique({ where }: any) {
      if (where?.referee_id !== undefined) {
        const r = memoryStore.referrals.find((item) => item.referee_id === BigInt(where.referee_id));
        return r ? { ...r } : null;
      }
      if (where?.id !== undefined) {
        const r = memoryStore.referrals.find((item) => item.id === Number(where.id));
        return r ? { ...r } : null;
      }
      return null;
    },
    async create({ data }: any) {
      const existing = memoryStore.referrals.find((item) => item.referee_id === BigInt(data.referee_id));
      if (existing) {
        const err: any = new Error('Unique constraint failed on referee_id');
        err.code = 'P2002';
        throw err;
      }
      const newRef = {
        id: memoryStore.referralIdSeq++,
        referrer_id: BigInt(data.referrer_id),
        referee_id: BigInt(data.referee_id),
        is_premium: Boolean(data.is_premium),
        bonus_nc: Number(data.bonus_nc),
        bonus_ton: data.bonus_ton instanceof Decimal ? data.bonus_ton : new Decimal(data.bonus_ton),
        created_at: new Date(),
      };
      memoryStore.referrals.push(newRef);
      return { ...newRef };
    },
    async count({ where }: any = {}) {
      if (where?.referrer_id) {
        return memoryStore.referrals.filter((r) => r.referrer_id === BigInt(where.referrer_id)).length;
      }
      return memoryStore.referrals.length;
    },
  },

  dailyStreakReward: {
    async findMany({ orderBy }: any = {}) {
      const list = [...memoryStore.dailyStreakRewards];
      if (orderBy?.day_number === 'asc') {
        list.sort((a, b) => a.day_number - b.day_number);
      }
      return list;
    },
    async findUnique({ where }: any) {
      return memoryStore.dailyStreakRewards.find((r) => r.day_number === where.day_number) || null;
    },
    async upsert({ where, update, create }: any) {
      const idx = memoryStore.dailyStreakRewards.findIndex((r) => r.day_number === where.day_number);
      if (idx >= 0) {
        memoryStore.dailyStreakRewards[idx] = { ...memoryStore.dailyStreakRewards[idx], ...update };
        return memoryStore.dailyStreakRewards[idx];
      } else {
        const item = { ...create, day_number: where.day_number };
        memoryStore.dailyStreakRewards.push(item);
        return item;
      }
    },
  },

  taskProofSubmission: {
    async findMany({ where }: any = {}) {
      let list = [...memoryStore.taskProofSubmissions];
      if (where?.user_id !== undefined) list = list.filter((s) => s.user_id === BigInt(where.user_id));
      if (where?.mission_id !== undefined) list = list.filter((s) => s.mission_id === Number(where.mission_id));
      if (where?.status !== undefined) list = list.filter((s) => s.status === where.status);
      return list;
    },
    async findUnique({ where }: any) {
      if (where?.id) {
        return memoryStore.taskProofSubmissions.find((s) => s.id === Number(where.id)) || null;
      }
      if (where?.unique_pending_user_task || (where?.user_id && where?.mission_id)) {
        const uId = BigInt(where.unique_pending_user_task?.user_id || where.user_id);
        const mId = Number(where.unique_pending_user_task?.mission_id || where.mission_id);
        return memoryStore.taskProofSubmissions.find((s) => s.user_id === uId && s.mission_id === mId) || null;
      }
      return null;
    },
    async create({ data }: any) {
      const newSub = {
        id: memoryStore.taskProofSubmissionIdSeq++,
        user_id: BigInt(data.user_id),
        mission_id: Number(data.mission_id),
        telegram_file_id: data.telegram_file_id || null,
        channel_message_id: data.channel_message_id ? BigInt(data.channel_message_id) : null,
        status: data.status || 'PENDING_REVIEW',
        reviewed_by: data.reviewed_by ? BigInt(data.reviewed_by) : null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryStore.taskProofSubmissions.push(newSub);
      return { ...newSub };
    },
    async update({ where, data }: any) {
      const idx = memoryStore.taskProofSubmissions.findIndex((s) => s.id === Number(where.id));
      if (idx === -1) throw new Error('Task proof submission not found');
      const item = memoryStore.taskProofSubmissions[idx];
      if (data.status) item.status = data.status;
      if (data.reviewed_by) item.reviewed_by = BigInt(data.reviewed_by);
      if (data.channel_message_id) item.channel_message_id = BigInt(data.channel_message_id);
      item.updated_at = new Date();
      return { ...item };
    },
  },

  userDailyAd: {
    async findUnique({ where }: any) {
      const uId = where.user_id_ad_date?.user_id?.toString() || where.user_id?.toString();
      const todayStr = new Date().toISOString().slice(0, 10);
      const key = `${uId}:${todayStr}`;
      const found = memoryStore.dailyAds.get(key);
      return found ? { ...found } : null;
    },
    async findMany({ where }: any = {}) {
      return Array.from(memoryStore.dailyAds.values());
    },
  },

  referralMilestone: {
    async findMany({ orderBy }: any = {}) {
      const list = [...memoryStore.referralMilestones];
      if (orderBy?.target_count === 'asc') {
        list.sort((a, b) => a.target_count - b.target_count);
      }
      return list;
    },
    async findUnique({ where }: any) {
      return memoryStore.referralMilestones.find((m) => m.target_count === where.target_count) || null;
    },
    async upsert({ where, update, create }: any) {
      const idx = memoryStore.referralMilestones.findIndex((m) => m.target_count === where.target_count);
      if (idx >= 0) {
        memoryStore.referralMilestones[idx] = { ...memoryStore.referralMilestones[idx], ...update };
        return memoryStore.referralMilestones[idx];
      } else {
        const item = { ...create, target_count: where.target_count };
        memoryStore.referralMilestones.push(item);
        return item;
      }
    },
  },

  userMilestoneClaim: {
    async findMany({ where }: any = {}) {
      let list = [...memoryStore.userMilestoneClaims];
      if (where?.user_id !== undefined) {
        list = list.filter((c) => c.user_id === BigInt(where.user_id));
      }
      return list;
    },
    async findUnique({ where }: any) {
      if (where?.user_id_target_count) {
        const uId = BigInt(where.user_id_target_count.user_id);
        const tCount = Number(where.user_id_target_count.target_count);
        return memoryStore.userMilestoneClaims.find((c) => c.user_id === uId && c.target_count === tCount) || null;
      }
      return null;
    },
    async create({ data }: any) {
      const uId = BigInt(data.user_id);
      const tCount = Number(data.target_count);
      const existing = memoryStore.userMilestoneClaims.find((c) => c.user_id === uId && c.target_count === tCount);
      if (existing) {
        const err: any = new Error('Unique constraint failed on user_id_target_count');
        err.code = 'P2002';
        throw err;
      }
      const item = {
        id: memoryStore.userMilestoneClaimIdSeq++,
        user_id: uId,
        target_count: tCount,
        claimed_at: new Date(),
      };
      memoryStore.userMilestoneClaims.push(item);
      return item;
    },
  },

  async $transaction(arg: any) {
    if (typeof arg === 'function') {
      return arg(mockPrisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  },
};

export type AppPrismaClient = PrismaClient & {
  referral: any;
  user: any;
  dailyStreakReward: any;
  [key: string]: any;
};

export const prisma = new Proxy(realPrisma, {
  get(target: any, prop: string) {
    if (isPostgresConnected) {
      return target[prop];
    }
    if (prop in mockPrisma) {
      return (mockPrisma as any)[prop];
    }
    return target[prop];
  },
}) as AppPrismaClient;

function executeMockQuery(sql: string, params: any[] = []): { rows: any[]; rowCount: number } {
  const normalized = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT users (with optional FOR UPDATE)
  if (normalized.includes('FROM users WHERE id = $1')) {
    const rawId = params[0]?.toString() || '';
    const user = memoryStore.users.get(rawId);
    if (!user) {
      return { rows: [], rowCount: 0 };
    }
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    return {
      rows: [
        {
          daily_streak: user.daily_streak || 0,
          last_daily_claim_date: user.last_daily_claim_date || null,
          power_percentage: user.power_percentage ?? 100,
          today_utc: today,
          yesterday_utc: yesterday,
        },
      ],
      rowCount: 1,
    };
  }

  // 2. SELECT * FROM daily_streak_rewards ORDER BY day_number ASC
  if (normalized.includes('FROM daily_streak_rewards') && normalized.includes('ORDER BY')) {
    const rows = [...memoryStore.dailyStreakRewards].sort((a, b) => a.day_number - b.day_number);
    return { rows, rowCount: rows.length };
  }

  // 3. SELECT * FROM daily_streak_rewards WHERE day_number = $1
  if (normalized.includes('FROM daily_streak_rewards WHERE day_number = $1')) {
    const day = Number(params[0]);
    const reward = memoryStore.dailyStreakRewards.find((r) => r.day_number === day);
    return { rows: reward ? [reward] : [], rowCount: reward ? 1 : 0 };
  }

  // 4. UPDATE users SET nc_balance = ... RETURNING ...
  if (normalized.startsWith('UPDATE users') && normalized.includes('RETURNING')) {
    const ncBonus = BigInt(params[0] || 0);
    const tonBonus = params[1];
    const batteryBonus = Number(params[2] || 0);
    const newStreak = Number(params[3] || 1);
    const targetUserId = params[4]?.toString() || '';

    const user = memoryStore.users.get(targetUserId);
    if (!user) {
      return { rows: [], rowCount: 0 };
    }

    user.nc_balance = (user.nc_balance || 0n) + ncBonus;
    const addedTon = tonBonus instanceof Decimal ? tonBonus : new Decimal(tonBonus || 0);
    user.ton_balance = (user.ton_balance instanceof Decimal ? user.ton_balance : new Decimal(user.ton_balance || 0)).plus(addedTon);
    user.power_percentage = Math.min(100, (user.power_percentage ?? 100) + batteryBonus);
    user.daily_streak = newStreak;
    user.last_daily_claim_date = new Date();
    user.total_daily_claims = (user.total_daily_claims || 0) + 1;
    user.last_sync_at = new Date();

    return {
      rows: [
        {
          nc_balance: user.nc_balance.toString(),
          ton_balance: user.ton_balance.toString(),
          power_percentage: user.power_percentage,
          daily_streak: user.daily_streak,
        },
      ],
      rowCount: 1,
    };
  }

  // 5. Existing claim check for mission_claims or user_mission_claims
  if (normalized.includes('FROM user_mission_claims WHERE user_id = $1 AND mission_id = $2') ||
      normalized.includes('FROM mission_claims WHERE user_id = $1 AND mission_id = $2')) {
    const uId = BigInt(params[0]);
    const mId = Number(params[1]);
    const claim = memoryStore.claims.find((c) => c.user_id === uId && c.mission_id === mId);
    return { rows: claim ? [{ id: claim.id }] : [], rowCount: claim ? 1 : 0 };
  }

  // 6. Check existing task_proof_submissions
  if (normalized.includes('FROM task_proof_submissions WHERE user_id = $1 AND mission_id = $2')) {
    const uId = BigInt(params[0]);
    const mId = Number(params[1]);
    const sub = memoryStore.taskProofSubmissions.find((s) => s.user_id === uId && s.mission_id === mId);
    return { rows: sub ? [{ id: sub.id, status: sub.status }] : [], rowCount: sub ? 1 : 0 };
  }

  // 7. Fetch mission by id
  if (normalized.includes('FROM dynamic_missions WHERE id = $1')) {
    const mId = Number(params[0]);
    const m = memoryStore.missions.find((x) => x.id === mId);
    return { rows: m ? [{ ...m }] : [], rowCount: m ? 1 : 0 };
  }

  // 8. Insert or update task_proof_submissions
  if (normalized.startsWith('INSERT INTO task_proof_submissions')) {
    const uId = BigInt(params[0]);
    const mId = Number(params[1]);
    let sub = memoryStore.taskProofSubmissions.find((s) => s.user_id === uId && s.mission_id === mId);
    if (sub) {
      sub.status = 'PENDING_REVIEW';
      sub.updated_at = new Date();
    } else {
      sub = {
        id: memoryStore.taskProofSubmissionIdSeq++,
        user_id: uId,
        mission_id: mId,
        telegram_file_id: null,
        channel_message_id: null,
        status: 'PENDING_REVIEW',
        reviewed_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      memoryStore.taskProofSubmissions.push(sub);
    }
    return { rows: [{ id: sub.id }], rowCount: 1 };
  }

  // 9. Update channel_message_id on task_proof_submissions
  if (normalized.includes('UPDATE task_proof_submissions SET channel_message_id = $1 WHERE id = $2')) {
    const msgId = BigInt(params[0]);
    const subId = Number(params[1]);
    const sub = memoryStore.taskProofSubmissions.find((s) => s.id === subId);
    if (sub) sub.channel_message_id = msgId;
    return { rows: [], rowCount: 1 };
  }

  // 10. Fetch submission with joined mission for bot handlers
  if (normalized.includes('FROM task_proof_submissions s') && normalized.includes('JOIN dynamic_missions m')) {
    const subId = Number(params[0]);
    const sub = memoryStore.taskProofSubmissions.find((s) => s.id === subId);
    const m = sub ? memoryStore.missions.find((x) => x.id === sub.mission_id) : null;
    if (sub && m) {
      return {
        rows: [
          {
            ...sub,
            title: m.title,
            nc_reward: m.nc_reward,
            ton_reward: m.ton_reward,
          },
        ],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  }

  // 11. Update task_proof_submissions status (APPROVED / REJECTED)
  if (normalized.startsWith('UPDATE task_proof_submissions SET status =')) {
    // Pattern: status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2
    const statusMatch = normalized.match(/status\s*=\s*'([^']+)'/i);
    const newStatus = statusMatch ? statusMatch[1] : 'APPROVED';
    const reviewerId = params[0] ? BigInt(params[0]) : null;
    const subId = Number(params[1]);
    const sub = memoryStore.taskProofSubmissions.find((s) => s.id === subId);
    if (sub) {
      sub.status = newStatus;
      sub.reviewed_by = reviewerId;
      sub.updated_at = new Date();
    }
    return { rows: [], rowCount: 1 };
  }

  // 12. Record user_mission_claims or mission_claims
  if (normalized.startsWith('INSERT INTO user_mission_claims') || normalized.startsWith('INSERT INTO mission_claims')) {
    const uId = BigInt(params[0]);
    const mId = Number(params[1]);
    const existing = memoryStore.claims.find((c) => c.user_id === uId && c.mission_id === mId);
    if (!existing) {
      memoryStore.claims.push({
        id: memoryStore.claims.length + 1,
        user_id: uId,
        mission_id: mId,
        claimed_at: new Date(),
      });
    }
    return { rows: [], rowCount: 1 };
  }

  // 13. Update users nc_balance & ton_balance (for task approval)
  if (normalized.startsWith('UPDATE users SET nc_balance = nc_balance + $1, ton_balance = ton_balance + $2 WHERE id = $3')) {
    const ncBonus = BigInt(params[0] || 0);
    const tonBonus = params[1];
    const targetUserId = params[2]?.toString() || '';
    const user = memoryStore.users.get(targetUserId);
    if (user) {
      user.nc_balance = (user.nc_balance || 0n) + ncBonus;
      const addedTon = tonBonus instanceof Decimal ? tonBonus : new Decimal(tonBonus || 0);
      user.ton_balance = (user.ton_balance instanceof Decimal ? user.ton_balance : new Decimal(user.ton_balance || 0)).plus(addedTon);
    }
    return { rows: user ? [{ nc_balance: user.nc_balance.toString(), ton_balance: user.ton_balance.toFixed(6) }] : [], rowCount: 1 };
  }

  // 13b. Update users ton_balance only
  if (normalized.startsWith('UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2')) {
    const tonBonus = params[0];
    const targetUserId = params[1]?.toString() || '';
    const user = memoryStore.users.get(targetUserId);
    if (user) {
      const addedTon = tonBonus instanceof Decimal ? tonBonus : new Decimal(tonBonus || 0);
      user.ton_balance = (user.ton_balance instanceof Decimal ? user.ton_balance : new Decimal(user.ton_balance || 0)).plus(addedTon);
    }
    return { rows: user ? [{ ton_balance: user.ton_balance.toFixed(6) }] : [], rowCount: 1 };
  }

  // 14. SELECT adsgram_count, monetag_count FROM user_daily_ads
  if (normalized.includes('FROM user_daily_ads WHERE user_id = $1 AND ad_date = CURRENT_DATE')) {
    const rawId = params[0]?.toString() || '';
    const todayStr = new Date().toISOString().slice(0, 10);
    const key = `${rawId}:${todayStr}`;
    const record = memoryStore.dailyAds.get(key);
    if (!record) {
      return { rows: [], rowCount: 0 };
    }
    return {
      rows: [
        {
          adsgram_count: record.adsgram_count,
          monetag_count: record.monetag_count,
          last_ad_at: record.last_ad_at,
        },
      ],
      rowCount: 1,
    };
  }

  // 15. INSERT INTO user_daily_ads ... ON CONFLICT (user_id, ad_date) DO NOTHING
  if (normalized.startsWith('INSERT INTO user_daily_ads')) {
    const rawId = params[0]?.toString() || '';
    const todayStr = new Date().toISOString().slice(0, 10);
    const key = `${rawId}:${todayStr}`;
    if (!memoryStore.dailyAds.has(key)) {
      memoryStore.dailyAds.set(key, {
        user_id: BigInt(rawId),
        ad_date: todayStr,
        adsgram_count: 0,
        monetag_count: 0,
        last_ad_at: new Date(Date.now() - 30000), // Default older than 20s cooldown
      });
    }
    return { rows: [], rowCount: 1 };
  }

  // 16. UPDATE user_daily_ads SET adsgram_count / monetag_count
  if (normalized.startsWith('UPDATE user_daily_ads SET')) {
    let rawId = '';
    if (normalized.includes('adsgram_count = $1, monetag_count = $2')) {
      rawId = params[2]?.toString() || '';
    } else {
      rawId = params[0]?.toString() || '';
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const key = `${rawId}:${todayStr}`;
    let record = memoryStore.dailyAds.get(key);
    if (!record) {
      record = {
        user_id: BigInt(rawId),
        ad_date: todayStr,
        adsgram_count: 0,
        monetag_count: 0,
        last_ad_at: new Date(),
      };
      memoryStore.dailyAds.set(key, record);
    }
    if (normalized.includes('adsgram_count = $1, monetag_count = $2')) {
      record.adsgram_count = Number(params[0] ?? 8);
      record.monetag_count = Number(params[1] ?? 4);
    }
    if (normalized.includes('adsgram_count = adsgram_count + 1')) {
      record.adsgram_count += 1;
    }
    if (normalized.includes('monetag_count = monetag_count + 1')) {
      record.monetag_count += 1;
    }
    record.last_ad_at = new Date();
    return { rows: [], rowCount: 1 };
  }

  // 17. bot_chats queries
  if (normalized.startsWith('INSERT INTO bot_chats')) {
    const chatId = BigInt(params[0]);
    const chatType = params[1] || 'group';
    const title = params[2] || 'Untitled';
    memoryStore.botChats.set(chatId.toString(), {
      chat_id: chatId,
      chat_type: chatType,
      title: title,
      created_at: new Date(),
    });
    return { rows: [], rowCount: 1 };
  }

  if (normalized.startsWith('SELECT chat_id FROM bot_chats') || normalized.startsWith('SELECT * FROM bot_chats')) {
    const list = Array.from(memoryStore.botChats.values()).map((c) => ({
      chat_id: c.chat_id.toString(),
      chat_type: c.chat_type,
      title: c.title,
      created_at: c.created_at,
    }));
    return { rows: list, rowCount: list.length };
  }

  // 18. Transaction control (BEGIN, COMMIT, ROLLBACK)
  if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized.toUpperCase())) {
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

const mockPoolClient = {
  query: async (sql: string, params?: any[]) => executeMockQuery(sql, params),
  release: () => {},
};

export const pool = {
  query: async (sql: string, params?: any[]) => {
    if (isPostgresConnected && realPool) {
      return realPool.query(sql, params);
    }
    return executeMockQuery(sql, params);
  },
  connect: async () => {
    if (isPostgresConnected && realPool) {
      return realPool.connect();
    }
    return mockPoolClient;
  },
};

export function getIsPostgresConnected() {
  return isPostgresConnected;
}

export async function connectDB() {
  try {
    await realPrisma.$connect();
    isPostgresConnected = true;
    console.log('✅ Connected to PostgreSQL database');
    return true;
  } catch (error) {
    isPostgresConnected = false;
    console.warn('⚠️ PostgreSQL is not reachable at DATABASE_URL.');
    console.log('⚡ Activated In-Memory Mock Store with pre-seeded users and missions for standalone testing.');
    return false;
  }
}

