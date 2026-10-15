// src/services/smartAdManager.ts

export interface AdReward {
  tier: string;
  nc: number;
  ton: number;
  fuelBoost: boolean;
}

export interface RewardedResult {
  success: boolean;
  provider?: string;
  totalWatched?: number;
  reward?: AdReward;
  reason?: string;
}

export interface InterstitialResult {
  shown: boolean;
  provider?: string;
  reason?: string;
}

export interface AdState {
  lastInterstitialProvider: 'monetag' | 'gigapub';
  lastInterstitialTime: number;
  lastRewardedTime: number;
  rewardedStep: number;
  counts: {
    monetag: number;
    gigapub: number;
    adsgram: number;
  };
  dailyCaps: {
    monetag: number;
    gigapub: number;
    adsgram: number;
  };
}

// Global Ad State tracking network turns, cooldowns, and daily caps
export const AD_STATE: AdState = {
  lastInterstitialProvider: 'gigapub', // So the very first interstitial is Monetag
  lastInterstitialTime: 0,
  lastRewardedTime: 0,
  rewardedStep: 0, // Micro-rotation and Priority tracker
  counts: {
    monetag: 18, // Simulated starting progress for live demonstration
    gigapub: 14,
    adsgram: 6,
  },
  dailyCaps: {
    monetag: 80, // Priority 1
    gigapub: 70, // Priority 2
    adsgram: 50, // Priority 3 (Total = 200 Daily System)
  },
};

export const INTERSTITIAL_COOLDOWN_MS = 60 * 1000; // 60 seconds (1:1 alternating ad cooldown)
export const REWARDED_COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown

// Game Mode State Tracking (suppresses 60s interstitial ads during active gameplay)
let isGameActiveGlobal = false;
export const setGameActiveState = (active: boolean) => {
  isGameActiveGlobal = active;
  console.log(`[SmartAdManager] Game mode: ${active ? "ACTIVE (30s ads paused)" : "INACTIVE (30s ads resumed)"}`);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nc_game_mode_changed", { detail: { active } }));
  }
};
export const isGameActive = () => isGameActiveGlobal;

// 1. Individual Provider SDK Call Interface
declare global {
  interface Window {
    show_MONETAG_ZONE_ID?: (options?: any) => Promise<any>;
    showGiga?: (zone?: string) => Promise<any>;
    Gigapub?: {
      showRewarded?: () => Promise<boolean>;
      showInterstitial?: () => Promise<boolean>;
    };
  }
}

const Providers = {
  // --- MONETAG ---
  async showMonetagRewarded(): Promise<boolean> {
    if (typeof window.show_MONETAG_ZONE_ID === 'function') {
      await window.show_MONETAG_ZONE_ID();
      return true;
    }
    // Browser sandbox / dev fallback simulation
    await new Promise((r) => setTimeout(r, 600));
    return true;
  },

  async showMonetagInterstitial(): Promise<boolean> {
    if (typeof window.show_MONETAG_ZONE_ID === 'function') {
      await window.show_MONETAG_ZONE_ID('pop');
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
    return true;
  },

  // --- GIGAPUB ---
  async showGigapubRewarded(): Promise<boolean> {
    if (typeof window.showGiga === 'function') {
      await window.showGiga('main');
      return true;
    }
    if (window.Gigapub && typeof window.Gigapub.showRewarded === 'function') {
      const res = await window.Gigapub.showRewarded();
      if (res) return true;
    }
    await new Promise((r) => setTimeout(r, 600));
    return true;
  },

  async showGigapubInterstitial(): Promise<boolean> {
    if (typeof window.showGiga === 'function') {
      await window.showGiga('main');
      return true;
    }
    if (window.Gigapub && typeof window.Gigapub.showInterstitial === 'function') {
      const res = await window.Gigapub.showInterstitial();
      if (res) return true;
    }
    await new Promise((r) => setTimeout(r, 500));
    return true;
  },

  // --- ADSGRAM ---
  async showAdsgramRewarded(): Promise<boolean> {
    if (window.Adsgram) {
      const AdController = window.Adsgram.init({ blockId: 'YOUR_ADSGRAM_BLOCK_ID' });
      await AdController.show();
      return true;
    }
    await new Promise((r) => setTimeout(r, 600));
    return true;
  },
};

// 2. REWARDED AD: Priority (Monetag -> Gigapub -> Adsgram) + Smart CPM Protection
export async function showSmartRewardedAd(ignoreCooldown = false): Promise<RewardedResult> {
  const now = Date.now();
  const timeLeft = Math.ceil((AD_STATE.lastRewardedTime + REWARDED_COOLDOWN_MS - now) / 1000);

  if (!ignoreCooldown && timeLeft > 0) {
    return {
      success: false,
      reason: `Please wait ${timeLeft}s cooldown to protect maximum CPM rates.`,
    };
  }

  // Priority List: 1. Monetag -> 2. Gigapub -> 3. Adsgram
  // Micro-rotation pattern: Monetag -> Gigapub -> Monetag -> Adsgram
  const stepIndex = AD_STATE.rewardedStep % 4;
  const preferredOrder: ('monetag' | 'gigapub' | 'adsgram')[] =
    stepIndex === 0
      ? ['monetag', 'gigapub', 'adsgram']
      : stepIndex === 1
      ? ['gigapub', 'monetag', 'adsgram']
      : stepIndex === 2
      ? ['monetag', 'adsgram', 'gigapub']
      : ['adsgram', 'monetag', 'gigapub'];

  for (const network of preferredOrder) {
    if (AD_STATE.counts[network] >= AD_STATE.dailyCaps[network]) continue;

    try {
      if (network === 'monetag') await Providers.showMonetagRewarded();
      else if (network === 'gigapub') await Providers.showGigapubRewarded();
      else if (network === 'adsgram') await Providers.showAdsgramRewarded();

      // Update state upon success
      AD_STATE.counts[network] += 1;
      AD_STATE.rewardedStep += 1;
      AD_STATE.lastRewardedTime = Date.now();

      const totalWatched =
        AD_STATE.counts.monetag + AD_STATE.counts.gigapub + AD_STATE.counts.adsgram;

      return {
        success: true,
        provider: network.toUpperCase(),
        totalWatched,
        reward: calculateTierReward(totalWatched),
      };
    } catch (err) {
      console.warn(`[AdManager] ${network} failed, trying next priority provider in waterfall...`);
    }
  }

  return {
    success: false,
    reason: 'All providers are currently capped or experiencing zero fill. Please try again later.',
  };
}

// 3. INTERSTITIAL AD: 1:1 Alternating (1 Monetag, 1 Gigapub one after another) with 30s Cooldown
export async function triggerAlternatingInterstitial(ignoreCooldown = false): Promise<InterstitialResult> {
  // CRITICAL: Block 30s interstitial ads if user is actively in Game Mode!
  if (isGameActiveGlobal && !ignoreCooldown) {
    return { shown: false, reason: 'Game mode active (interstitials paused during gameplay)' };
  }

  const now = Date.now();
  if (!ignoreCooldown && now - AD_STATE.lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
    const remaining = Math.ceil((INTERSTITIAL_COOLDOWN_MS - (now - AD_STATE.lastInterstitialTime)) / 1000);
    return { shown: false, reason: `Interstitial cooldown active (${remaining}s remaining)` };
  }

  // Read persisted last provider so alternation is strictly 1:1 across tabs, reloads, and sessions
  const savedLast =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('nc_last_tab_ad_provider')
      : null;
  const last: 'monetag' | 'gigapub' =
    savedLast === 'monetag' || savedLast === 'gigapub'
      ? savedLast
      : AD_STATE.lastInterstitialProvider;

  // Next provider alternates: Monetag -> Gigapub -> Monetag -> Gigapub
  const primary: 'monetag' | 'gigapub' = last === 'monetag' ? 'gigapub' : 'monetag';
  const fallback: 'monetag' | 'gigapub' = primary === 'monetag' ? 'gigapub' : 'monetag';

  const tryShow = async (provider: 'monetag' | 'gigapub') => {
    if (provider === 'monetag') return await Providers.showMonetagInterstitial();
    if (provider === 'gigapub') return await Providers.showGigapubInterstitial();
  };

  try {
    await tryShow(primary);
    AD_STATE.lastInterstitialProvider = primary;
    AD_STATE.lastInterstitialTime = Date.now();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nc_last_tab_ad_provider', primary);
    }
    return { shown: true, provider: primary.toUpperCase() };
  } catch (err) {
    try {
      await tryShow(fallback);
      AD_STATE.lastInterstitialProvider = fallback;
      AD_STATE.lastInterstitialTime = Date.now();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nc_last_tab_ad_provider', fallback);
      }
      return { shown: true, provider: fallback.toUpperCase() };
    } catch (fallbackErr) {
      return { shown: false, reason: 'Both Monetag and Gigapub interstitials had no fill' };
    }
  }
}

// 4. 3-Tier Dynamic Reward Calculator (protects TON payout balance against low CPM)
export function calculateTierReward(totalAdsWatched: number): AdReward {
  if (totalAdsWatched <= 20) {
    // Tier 1 (Ads 1-20): High CPM -> High Reward
    return { tier: 'TIER 1 (HIGH)', nc: 300, ton: 0.0005, fuelBoost: false };
  } else if (totalAdsWatched <= 50) {
    // Tier 2 (Ads 21-50): Mid CPM -> Mid Reward
    return { tier: 'TIER 2 (MID)', nc: 200, ton: 0.0002, fuelBoost: false };
  } else {
    // Tier 3 (Ads 51-200): Low Remnant CPM -> Only NC & Mining Fuel (0 TON loss!)
    return { tier: 'TIER 3 (FUEL)', nc: 150, ton: 0, fuelBoost: true };
  }
}

export function getAdManagerStats() {
  const totalWatched =
    AD_STATE.counts.monetag + AD_STATE.counts.gigapub + AD_STATE.counts.adsgram;
  const currentTier = calculateTierReward(totalWatched + 1);
  const now = Date.now();
  const rewardedCooldownLeft = Math.max(
    0,
    Math.ceil((AD_STATE.lastRewardedTime + REWARDED_COOLDOWN_MS - now) / 1000)
  );
  const interstitialCooldownLeft = Math.max(
    0,
    Math.ceil((AD_STATE.lastInterstitialTime + INTERSTITIAL_COOLDOWN_MS - now) / 1000)
  );

  return {
    counts: { ...AD_STATE.counts },
    dailyCaps: { ...AD_STATE.dailyCaps },
    totalWatched,
    totalCap: 200,
    currentTier,
    rewardedCooldownLeft,
    interstitialCooldownLeft,
    nextInterstitialProvider:
      AD_STATE.lastInterstitialProvider === 'monetag' ? 'GIGAPUB' : 'MONETAG',
  };
}
