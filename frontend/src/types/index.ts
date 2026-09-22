export interface UserProfile {
  id: string;
  firstName: string;
  username?: string | null;
  isAdmin: boolean;
}

export interface MiningState {
  userId: string;
  tonBalance: string;
  ncBalance: string;
  powerPercentage: number;
  powerCapacityHours: number;
  tonHashratePerSec: string;
  accruedTon: string;
  elapsedSeconds: number;
  activeSeconds: number;
  lastSyncAt: string;
  isMiningActive: boolean;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  category: string;
  taskType: 'telegram_join' | 'visit_url' | 'bot_launch';
  actionUrl: string;
  telegramChatId?: string | null;
  ncReward: number;
  tonReward: string;
  targetUsers?: number | null;
  completedCount: number;
  isCompleted: boolean;
  isSoldOut: boolean;
}

export interface WithdrawalRecord {
  id: number;
  tonAddress: string;
  tonAmount: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface RewardConfig {
  actionType: string;
  displayName: string;
  ncReward: number;
  tonReward: string;
  updatedAt?: string;
}

export type ActiveGameType = 'game_memory' | 'game_2048' | 'game_carrace';

export interface GameStartResponse {
  sessionId: string;
  durationSec?: number;
}

export interface GameFinishResponse {
  success: boolean;
  reward: {
    nc: number;
    ton: string;
  };
  newBalances: {
    nc: string;
    ton: string;
  };
  ncAwarded?: number;
  tonAwarded?: string;
  newNcBalance?: string;
  newTonBalance?: string;
}
