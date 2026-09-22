import { MiningState, Mission, RewardConfig, UserProfile, WithdrawalRecord, GameFinishResponse, PromoCode, PromoRedeemResponse, OnlineStats } from '../types/index.js';

let devUserId = localStorage.getItem('nctons_dev_user_id') || '9990001';
let devUsername = localStorage.getItem('nctons_dev_username') || 'CyberMiner';

export function setDevUser(id: string, username: string) {
  devUserId = id;
  devUsername = username;
  localStorage.setItem('nctons_dev_user_id', id);
  localStorage.setItem('nctons_dev_username', username);
}

export function getDevUser() {
  return { id: devUserId, username: devUsername };
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const tgWebApp = (window as any).Telegram?.WebApp;
  const initData = tgWebApp?.initData;

  if (initData) {
    headers['Authorization'] = `tma ${initData}`;
  } else {
    // Dev mode fallback
    headers['X-Dev-Telegram-Id'] = devUserId;
    headers['X-Dev-Username'] = devUsername;
  }

  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  async verifyAuth(): Promise<{ user: UserProfile; mining: MiningState }> {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(res);
  },

  // Mining
  async syncMining(): Promise<MiningState> {
    const res = await fetch('/api/mining/sync', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async rechargePower(method: 'nc' | 'ad'): Promise<{ success: boolean; message: string; mining: MiningState }> {
    const res = await fetch('/api/mining/recharge', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ method }),
    });
    return handleResponse(res);
  },

  // Arcade Mini-Games
  async startGame(
    gameType: 'game_memory' | 'game_2048' | 'game_carrace'
  ): Promise<{ sessionId: string }> {
    const res = await fetch('/api/game/start', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ gameType }),
    });
    return handleResponse(res);
  },

  async finishGame(
    sessionId: string,
    score: number
  ): Promise<GameFinishResponse> {
    const res = await fetch('/api/game/finish', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sessionId, score }),
    });
    return handleResponse(res);
  },

  // Missions
  async getAvailableMissions(): Promise<{ missions: Mission[] }> {
    const res = await fetch('/api/missions/available', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async claimMission(
    missionId: number
  ): Promise<{ success: boolean; ncAwarded: number; tonAwarded: string; newNcBalance: string; newTonBalance: string }> {
    const res = await fetch('/api/missions/claim', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ missionId }),
    });
    return handleResponse(res);
  },

  async createMission(missionData: any): Promise<{ success: boolean; mission: any }> {
    const res = await fetch('/api/missions/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(missionData),
    });
    return handleResponse(res);
  },

  // Withdrawals
  async requestWithdrawal(
    tonAddress: string,
    tonAmount: string
  ): Promise<{ success: boolean; message: string; withdrawal: WithdrawalRecord; remainingBalance: string }> {
    const res = await fetch('/api/withdraw/request', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tonAddress, tonAmount }),
    });
    return handleResponse(res);
  },

  async getWithdrawalHistory(): Promise<{ history: WithdrawalRecord[] }> {
    const res = await fetch('/api/withdraw/history', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Admin
  async getRewardConfigs(): Promise<{ configs: RewardConfig[] }> {
    const res = await fetch('/api/admin/config', {
      headers: getAuthHeaders(),
    });
    const data = (await handleResponse(res)) as any;
    const configs = (data.configs || []).map((c: any) => ({
      actionType: c.actionType || c.action_type || '',
      displayName: c.displayName || c.display_name || c.actionType || c.action_type || '',
      ncReward: Number(c.ncReward !== undefined ? c.ncReward : (c.nc_reward !== undefined ? c.nc_reward : 0)),
      tonReward: (c.tonReward || c.ton_reward || '0.000000').toString(),
      updatedAt: c.updatedAt || c.updated_at,
    }));
    return { configs };
  },

  async updateRewardConfig(data: {
    actionType: string;
    ncReward: number;
    tonReward: number;
    displayName?: string;
  }): Promise<{ success: boolean; config: RewardConfig }> {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async createAdminMission(data: any): Promise<{ success: boolean; mission: any }> {
    const res = await fetch('/api/admin/missions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateAdminMission(id: number, data: any): Promise<{ success: boolean; mission: any }> {
    const res = await fetch(`/api/admin/missions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getAdminStats(): Promise<{ totalUsers: number; activeMissionsCount: number; pendingWithdrawalsCount: number }> {
    const res = await fetch('/api/admin/stats', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Promo Codes
  async redeemPromo(code: string, userId?: string | number): Promise<PromoRedeemResponse> {
    const res = await fetch('/api/promos/redeem', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, userId }),
    });
    return handleResponse(res);
  },

  // Admin Promo Management
  async getAdminPromos(): Promise<{ promos: PromoCode[] }> {
    const res = await fetch('/api/admin/promos', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createAdminPromo(data: {
    code: string;
    ncReward: number;
    tonReward: number;
    maxClaims: number | null;
  }): Promise<{ success: boolean; promo: PromoCode }> {
    const res = await fetch('/api/admin/promos', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async toggleAdminPromo(id: number): Promise<{ success: boolean; is_active: boolean }> {
    const res = await fetch(`/api/admin/promos/${id}/toggle`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async deleteAdminPromo(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/promos/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Online Players Telemetry
  async getOnlineStats(): Promise<OnlineStats> {
    const res = await fetch('/api/stats/online');
    return handleResponse(res);
  },

  async pingOnlineStatus(userId?: string): Promise<OnlineStats> {
    const res = await fetch('/api/stats/ping', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(res);
  },
};
