import {
  MiningState,
  Mission,
  RewardConfig,
  UserProfile,
  WithdrawalRecord,
  GameFinishResponse,
  PromoCode,
  PromoRedeemResponse,
  OnlineStats,
  FriendStatsResponse,
  FriendClaimResponse,
  DailyStreakStatusResponse,
  DailyStreakClaimResponse,
  DailyAdStatusResponse,
} from '../types/index.js';

/**
 * Automatically detects the authentic Telegram User identity from:
 * 1. window.Telegram.WebApp.initDataUnsafe.user (Official Telegram Mini App context)
 * 2. URL search params (?userId=... / ?tg_id=... / ?id=...)
 * 3. Cached session from previous login in localStorage
 * 4. Safe fallback
 */
export function getDetectedUser(): { id: string; username: string; firstName: string } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // 1. Telegram WebApp SDK
  try {
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) {
      const id = String(tgUser.id);
      const username = tgUser.username || '';
      const firstName = tgUser.first_name || 'Miner';
      localStorage.setItem('nctons_user_id', id);
      if (username) localStorage.setItem('nctons_username', username);
      if (firstName) localStorage.setItem('nctons_first_name', firstName);
      return { id, username, firstName };
    }
  } catch (err) {
    console.warn('[Telegram SDK] User read note:', err);
  }

  // 2. URL query parameters (e.g. ?userId=123456789 or ?tg_id=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('userId') || params.get('tg_id') || params.get('id');
    if (urlId) {
      const cleanId = urlId.replace(/[^0-9]/g, '');
      if (cleanId && cleanId !== '9990001') {
        const username = params.get('username') || '';
        const firstName = params.get('firstName') || 'Miner';
        localStorage.setItem('nctons_user_id', cleanId);
        if (username) localStorage.setItem('nctons_username', username);
        if (firstName) localStorage.setItem('nctons_first_name', firstName);
        return { id: cleanId, username, firstName };
      }
    }
  } catch {}

  // 3. Cached session in localStorage (excluding legacy mock ID 9990001)
  const savedId = localStorage.getItem('nctons_user_id') || localStorage.getItem('nctons_telegram_user_id');
  if (savedId && savedId !== '9990001') {
    return {
      id: savedId,
      username: localStorage.getItem('nctons_username') || localStorage.getItem('nctons_telegram_username') || '',
      firstName: localStorage.getItem('nctons_first_name') || localStorage.getItem('nctons_telegram_first_name') || 'Miner',
    };
  }

  // Clear legacy mock ID from localStorage if found
  if (savedId === '9990001') {
    localStorage.removeItem('nctons_user_id');
    localStorage.removeItem('nctons_telegram_user_id');
    localStorage.removeItem('nctons_username');
    localStorage.removeItem('nctons_first_name');
  }

  return null;
}

/**
 * Ensures header values only contain Byte / ISO-8859-1 characters (code points 0-255).
 * Emojis and unicode characters are encoded so window.fetch never throws a TypeError.
 */
function sanitizeHeader(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str.replace(/[^\x00-\xFF]/gu, (char) => encodeURIComponent(char));
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const tgWebApp = (window as any).Telegram?.WebApp;
  const initData = tgWebApp?.initData;
  const user = getDetectedUser();

  if (initData) {
    headers['Authorization'] = sanitizeHeader(`tma ${initData}`);
  }

  // Automatically attach detected user identity headers for authentication & authorization
  if (user?.id) {
    headers['X-Telegram-User-Id'] = sanitizeHeader(user.id);
    if (user.username) headers['X-Telegram-Username'] = sanitizeHeader(user.username);
    if (user.firstName) headers['X-Telegram-First-Name'] = sanitizeHeader(user.firstName);
    headers['X-Dev-Telegram-Id'] = sanitizeHeader(user.id);
    headers['X-Dev-Username'] = sanitizeHeader(user.username || user.firstName);
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
    const tgWebApp = (window as any).Telegram?.WebApp;
    const initData = tgWebApp?.initData || '';
    const user = getDetectedUser();
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        initData,
        userId: user?.id,
        firstName: user?.firstName,
        username: user?.username,
      }),
    });
    return handleResponse(res);
  },

  // User Profile
  async getUserProfile(userId?: string): Promise<UserProfile> {
    const url = userId ? `/api/user/profile/${userId}` : '/api/user/profile';
    const res = await fetch(url, {
      headers: getAuthHeaders(),
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

  async startMission(
    missionId: number
  ): Promise<{ success: boolean; missionId: number; startedAt: string; requiredEngagementSeconds: number }> {
    const res = await fetch('/api/missions/start', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ missionId }),
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

  // Referral System & Friends Hub
  async getFriendStats(userId?: string | number): Promise<FriendStatsResponse> {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`/api/friends/stats${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async claimFriendRewards(userId?: string | number): Promise<FriendClaimResponse> {
    const res = await fetch('/api/friends/claim', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    return handleResponse(res);
  },


  // Daily Streak & Reward System
  async getDailyStatus(userId?: string | number): Promise<DailyStreakStatusResponse> {
    const id = userId || getDetectedUser()?.id;
    const queryParam = id ? `?userId=${id}` : '';
    const res = await fetch(`/api/daily/status${queryParam}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async claimDailyReward(userId?: string | number): Promise<DailyStreakClaimResponse> {
    const id = userId || getDetectedUser()?.id;
    const res = await fetch('/api/daily/claim', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId: id }),
    });
    return handleResponse(res);
  },

  // Dual Ad Networks (Adsgram & Monetag)
  async getAdStatus(userId?: string | number): Promise<DailyAdStatusResponse> {
    const id = userId || getDetectedUser()?.id;
    const queryParam = id ? `?userId=${id}` : '';
    const res = await fetch(`/api/ads/status${queryParam}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async claimAdReward(
    provider: 'adsgram' | 'monetag',
    userId?: string | number
  ): Promise<{ success: boolean; reward: { nc: number; ton: number }; newBalances: any }> {
    const id = userId || getDetectedUser()?.id;
    const res = await fetch('/api/ads/claim', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ provider, userId: id }),
    });
    return handleResponse(res);
  },
};


