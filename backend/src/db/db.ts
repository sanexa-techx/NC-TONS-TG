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
      'game_play',
      {
        action_type: 'game_play',
        display_name: 'Drop Catcher Mini-Game',
        nc_reward: 150,
        ton_reward: new Decimal('0.000050'),
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
  withdrawalIdSeq: 101,
  missionIdSeq: 4,
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
  referrer_id: null,
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
  referrer_id: null,
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
        ton_balance: data.ton_balance instanceof Decimal ? data.ton_balance : new Decimal(data.ton_balance || 0),
        nc_balance: BigInt(data.nc_balance || 0),
        ton_hashrate_per_sec: data.ton_hashrate_per_sec instanceof Decimal ? data.ton_hashrate_per_sec : new Decimal(data.ton_hashrate_per_sec || '0.00000100'),
        last_sync_at: data.last_sync_at || new Date(),
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
        existing.ton_balance = data.ton_balance;
      }

      if (data.nc_balance?.increment) {
        existing.nc_balance = existing.nc_balance + BigInt(data.nc_balance.increment);
      } else if (data.nc_balance?.decrement) {
        existing.nc_balance = existing.nc_balance - BigInt(data.nc_balance.decrement);
      } else if (data.nc_balance !== undefined) {
        existing.nc_balance = BigInt(data.nc_balance);
      }

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
}) as PrismaClient;

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
