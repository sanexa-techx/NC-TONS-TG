import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Enable JSON serialization of BigInt for Express responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const realPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

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
  ],
  claims: [] as Array<{ id: number; mission_id: number; user_id: bigint; claimed_at: Date }>,
  withdrawals: [] as any[],
  gameSessions: new Map<string, any>(),
  withdrawalIdSeq: 101,
  missionIdSeq: 4,
  promoCodes: [
    {
      id: 1,
      code: 'WELCOME500',
      nc_reward: 500,
      ton_reward: new Decimal('0.000050'),
      max_claims: 1000 as number | null,
      claimed_count: 0,
      is_active: true,
      created_at: new Date(),
    },
    {
      id: 2,
      code: 'NCTONS2026',
      nc_reward: 1000,
      ton_reward: new Decimal('0.000100'),
      max_claims: 500 as number | null,
      claimed_count: 0,
      is_active: true,
      created_at: new Date(),
    },
  ] as Array<{
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
  promoCodeIdSeq: 3,
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
};

// Seed default dev user
memoryStore.users.set('9990001', {
  id: 9990001n,
  first_name: 'CyberMiner',
  username: 'cyberminer',
  ton_balance: new Decimal('0.054200'),
  nc_balance: 1250n,
  power_percentage: 86,
  power_capacity_hours: 8,
  ton_hashrate_per_sec: new Decimal('0.00000100'),
  last_sync_at: new Date(Date.now() - 3600 * 1000), // 1 hour ago
  referred_by: null,
  referral_count: 0,
  unclaimed_referral_nc: 0n,
  unclaimed_referral_ton: new Decimal('0.000000'),
  total_referral_nc: 0n,
  total_referral_ton: new Decimal('0.000000'),
  created_at: new Date(),
});

memoryStore.users.set('123456789', {
  id: 123456789n,
  first_name: 'AdminMiner',
  username: 'admin',
  ton_balance: new Decimal('2.500000'),
  nc_balance: 5000n,
  power_percentage: 100,
  power_capacity_hours: 8,
  ton_hashrate_per_sec: new Decimal('0.00000250'),
  last_sync_at: new Date(),
  referred_by: null,
  referral_count: 0,
  unclaimed_referral_nc: 0n,
  unclaimed_referral_ton: new Decimal('0.000000'),
  total_referral_nc: 0n,
  total_referral_ton: new Decimal('0.000000'),
  created_at: new Date(),
});

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
        created_at: new Date(),
      };
      memoryStore.users.set(data.id.toString(), newUser);
      return { ...newUser };
    },
    async update({ where, data }: any) {
      const existing = memoryStore.users.get(where.id.toString());
      if (!existing) throw new Error('User not found');

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
