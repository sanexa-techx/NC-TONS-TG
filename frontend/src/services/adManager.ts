// src/services/adManager.ts

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
  lastInterstitialProvider: "monetag" | "gigapub";
  lastInterstitialTime: number;
  lastRewardedTime: number;
  lastRewardedByProvider: {
    monetag: number;
    gigapub: number;
    adsgram: number;
  };
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
  lastInterstitialProvider: "gigapub", // Starts with 'monetag' on first interstitial
  lastInterstitialTime: 0,
  lastRewardedTime: 0,
  lastRewardedByProvider: {
    monetag: 0,
    gigapub: 0,
    adsgram: 0,
  },
  rewardedStep: 0, // Micro-rotation and Priority tracker
  counts: {
    monetag: 18, // Live sample progress
    gigapub: 14,
    adsgram: 6,
  },
  dailyCaps: {
    monetag: 80,  // Priority 1
    gigapub: 70,  // Priority 2
    adsgram: 50,  // Priority 3 (Total = 200 Daily System)
  },
};

export const INTERSTITIAL_COOLDOWN_MS = 60 * 1000; // 60 seconds (1:1 alternating ad cooldown)
export const REWARDED_COOLDOWN_MS = 30 * 1000;     // 30 seconds

import { adService } from "./adService.js";

// Game Mode State Tracking (suppresses 60s interstitial ads during active gameplay)
export const setGameActiveState = (active: boolean) => {
  adService.setIsPlayingGame(active);
  console.log(`[AdManager] Game mode: ${active ? "ACTIVE (60s ads paused)" : "INACTIVE (60s ads resumed)"}`);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nc_game_mode_changed", { detail: { active } }));
  }
};
export const isGameActive = () => adService.getIsPlayingGame();



export const Providers = {
  // --- MONETAG ---
  async showMonetagRewarded(): Promise<boolean> {
    return await adService.showMonetagAd("rewarded", "Monetag High-CPM Video");
  },

  async showMonetagInterstitial(): Promise<boolean> {
    return await adService.showMonetagAd("interstitial", "Monetag Interstitial");
  },

  // --- GIGAPUB (Strictly Isolated - NEVER calls Monetag) ---
  async showGigapubRewarded(): Promise<boolean> {
    return await adService.showGigapubAd("rewarded", "Gigapub Native Video");
  },

  async showGigapubInterstitial(): Promise<boolean> {
    return await adService.showGigapubAd("interstitial", "Gigapub Interstitial");
  },

  // --- ADSGRAM ---
  async showAdsgramRewarded(): Promise<boolean> {
    return await adService.showAdsgramAd("rewarded", "Adsgram Video Reward");
  },
};

// 2. REWARDED AD: Single-network turn execution (Monetag -> Gigapub -> Adsgram) with ZERO fallback overlap
export async function showSmartRewardedAd(ignoreCooldown = false): Promise<RewardedResult> {
  const now = Date.now();
  const timeLeft = Math.ceil((AD_STATE.lastRewardedTime + REWARDED_COOLDOWN_MS - now) / 1000);

  if (!ignoreCooldown && timeLeft > 0) {
    return {
      success: false,
      reason: `Please wait ${timeLeft}s cooldown to protect maximum CPM rates.`,
    };
  }

  if (!adService.canPlayAd()) {
    return {
      success: false,
      reason: "An ad is currently playing or on cooldown (5s mutex). Please wait.",
    };
  }

  // Single Network Turn: 0: Monetag -> 1: Gigapub -> 2: Adsgram
  const stepIndex = AD_STATE.rewardedStep % 3;
  const network: "monetag" | "gigapub" | "adsgram" =
    stepIndex === 0 ? "monetag" : stepIndex === 1 ? "gigapub" : "adsgram";

  if (AD_STATE.counts[network] >= AD_STATE.dailyCaps[network]) {
    return {
      success: false,
      reason: `${network.toUpperCase()} daily cap of ${AD_STATE.dailyCaps[network]} ads reached!`,
    };
  }

  try {
    let success = false;
    if (network === "monetag") success = await Providers.showMonetagRewarded();
    else if (network === "gigapub") success = await Providers.showGigapubRewarded();
    else if (network === "adsgram") success = await Providers.showAdsgramRewarded();

    if (!success) {
      return {
        success: false,
        reason: `${network.toUpperCase()} ad was dismissed or cancelled.`,
      };
    }

    // Update state upon success
    AD_STATE.counts[network] += 1;
    AD_STATE.rewardedStep += 1;
    AD_STATE.lastRewardedTime = Date.now();
    AD_STATE.lastRewardedByProvider[network] = Date.now();

    const totalWatched =
      AD_STATE.counts.monetag + AD_STATE.counts.gigapub + AD_STATE.counts.adsgram;

    return {
      success: true,
      provider: network.toUpperCase(),
      totalWatched,
      reward: calculateTierReward(totalWatched),
    };
  } catch (err: any) {
    return {
      success: false,
      reason: err?.message || `${network.toUpperCase()} ad error.`,
    };
  }
}

// 2b. SPECIFIC PROVIDER REWARDED AD: Dedicated Button Trigger with 30s Cooldown
export async function showSpecificRewardedAd(
  provider: "monetag" | "gigapub" | "adsgram",
  ignoreCooldown = false
): Promise<RewardedResult> {
  const now = Date.now();
  const lastTime = AD_STATE.lastRewardedByProvider[provider] || 0;
  const timeLeft = Math.max(0, Math.ceil((lastTime + REWARDED_COOLDOWN_MS - now) / 1000));

  if (!ignoreCooldown && timeLeft > 0) {
    return {
      success: false,
      reason: `${provider.toUpperCase()} is cooling down (${timeLeft}s remaining).`,
    };
  }

  if (!adService.canPlayAd()) {
    return {
      success: false,
      reason: "An ad is currently playing or on cooldown (5s mutex). Please wait.",
    };
  }

  if (AD_STATE.counts[provider] >= AD_STATE.dailyCaps[provider]) {
    return {
      success: false,
      reason: `${provider.toUpperCase()} daily cap of ${AD_STATE.dailyCaps[provider]} ads reached!`,
    };
  }

  try {
    if (provider === "monetag") await Providers.showMonetagRewarded();
    else if (provider === "gigapub") await Providers.showGigapubRewarded();
    else if (provider === "adsgram") await Providers.showAdsgramRewarded();

    AD_STATE.counts[provider] += 1;
    AD_STATE.lastRewardedByProvider[provider] = Date.now();
    AD_STATE.lastRewardedTime = Date.now();
    AD_STATE.rewardedStep += 1;

    const totalWatched =
      AD_STATE.counts.monetag + AD_STATE.counts.gigapub + AD_STATE.counts.adsgram;

    return {
      success: true,
      provider: provider.toUpperCase(),
      totalWatched,
      reward: calculateTierReward(totalWatched),
    };
  } catch (err: any) {
    return {
      success: false,
      reason: err?.message || `${provider.toUpperCase()} ad could not be loaded. Please try again.`,
    };
  }
}

// 3. INTERSTITIAL AD: 1:1 Alternating with strict mutex protection
export async function triggerAlternatingInterstitial(_ignoreCooldown = false): Promise<InterstitialResult> {
  const shown = await adService.triggerAlternatingInterstitial("adManager");
  const currentProvider = adService.getSnapshot().lastInterstitialProvider.toUpperCase();
  return {
    shown,
    provider: currentProvider,
    reason: shown ? undefined : "Interstitial suppressed by cooldown or mutex lock",
  };
}

// 4. 3-Tier Dynamic Reward Calculator (protects TON against remnant CPM)
export function calculateTierReward(totalAdsWatched: number): AdReward {
  if (totalAdsWatched <= 20) {
    // Tier 1 (Ads 1-20): High CPM -> High Reward
    return { tier: "TIER 1 (HIGH)", nc: 300, ton: 0.0005, fuelBoost: false };
  } else if (totalAdsWatched <= 50) {
    // Tier 2 (Ads 21-50): Mid CPM -> Mid Reward
    return { tier: "TIER 2 (MID)", nc: 200, ton: 0.0002, fuelBoost: false };
  } else {
    // Tier 3 (Ads 51-200): Low Remnant CPM -> Only NC & Mining Fuel (0 TON loss!)
    return { tier: "TIER 3 (FUEL)", nc: 150, ton: 0, fuelBoost: true };
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
  const providerCooldowns = {
    monetag: Math.max(
      0,
      Math.ceil((AD_STATE.lastRewardedByProvider.monetag + REWARDED_COOLDOWN_MS - now) / 1000)
    ),
    gigapub: Math.max(
      0,
      Math.ceil((AD_STATE.lastRewardedByProvider.gigapub + REWARDED_COOLDOWN_MS - now) / 1000)
    ),
    adsgram: Math.max(
      0,
      Math.ceil((AD_STATE.lastRewardedByProvider.adsgram + REWARDED_COOLDOWN_MS - now) / 1000)
    ),
  };
  const interstitialCooldownLeft = Math.max(
    0,
    Math.ceil((AD_STATE.lastInterstitialTime + INTERSTITIAL_COOLDOWN_MS - now) / 1000)
  );

  const savedLast =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("nc_last_tab_ad_provider")
      : null;
  const currentLast =
    savedLast === "monetag" || savedLast === "gigapub"
      ? savedLast
      : AD_STATE.lastInterstitialProvider;

  return {
    counts: { ...AD_STATE.counts },
    dailyCaps: { ...AD_STATE.dailyCaps },
    totalWatched,
    totalCap: 200,
    currentTier,
    rewardedCooldownLeft,
    providerCooldowns,
    interstitialCooldownLeft,
    nextInterstitialProvider: currentLast === "monetag" ? "GIGAPUB" : "MONETAG",
  };
}
