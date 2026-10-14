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

export const INTERSTITIAL_COOLDOWN_MS = 90 * 1000; // 90 seconds (CPM protection)
export const REWARDED_COOLDOWN_MS = 30 * 1000;     // 30 seconds

// 1. Provider SDK call functions with safe fallbacks
declare global {
  interface Window {
    show_MONETAG_ZONE_ID?: (options?: any) => Promise<any>;
    show_11886350?: (options?: any) => Promise<any>;
    showGiga?: (zone?: string) => Promise<any>;
    Gigapub?: {
      showRewarded?: () => Promise<boolean>;
      showInterstitial?: () => Promise<boolean>;
    };
    Adsgram?: {
      init: (params: { blockId: string; debug?: boolean; userId?: string }) => {
        show: () => Promise<{ done: boolean }>;
      };
    };
  }
}

export const Providers = {
  // --- MONETAG ---
  async showMonetagRewarded(): Promise<boolean> {
    const fn = window.show_11886350 || window.show_MONETAG_ZONE_ID;
    if (typeof fn === "function") {
      await fn();
      return true;
    }
    // Sandbox / dev simulation fallback
    await new Promise((r) => setTimeout(r, 600));
    return true;
  },

  async showMonetagInterstitial(): Promise<boolean> {
    const fn = window.show_11886350 || window.show_MONETAG_ZONE_ID;
    if (typeof fn === "function") {
      await fn("pop");
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
    return true;
  },

  // --- GIGAPUB ---
  async showGigapubRewarded(): Promise<boolean> {
    if (typeof window.showGiga === "function") {
      await window.showGiga("main");
      return true;
    }
    if (window.Gigapub && typeof window.Gigapub.showRewarded === "function") {
      const res = await window.Gigapub.showRewarded();
      if (res) return true;
    }
    await new Promise((r) => setTimeout(r, 600));
    return true;
  },

  async showGigapubInterstitial(): Promise<boolean> {
    if (typeof window.showGiga === "function") {
      await window.showGiga("main");
      return true;
    }
    if (window.Gigapub && typeof window.Gigapub.showInterstitial === "function") {
      const res = await window.Gigapub.showInterstitial();
      if (res) return true;
    }
    await new Promise((r) => setTimeout(r, 500));
    return true;
  },

  // --- ADSGRAM ---
  async showAdsgramRewarded(): Promise<boolean> {
    if (window.Adsgram) {
      try {
        const AdController = window.Adsgram.init({ blockId: "12571" });
        await AdController.show();
        return true;
      } catch (err) {
        console.warn("[Adsgram] show error:", err);
      }
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
  // Pattern: Monetag -> Gigapub -> Monetag -> Adsgram
  const stepIndex = AD_STATE.rewardedStep % 4;
  const preferredOrder: ("monetag" | "gigapub" | "adsgram")[] =
    stepIndex === 0
      ? ["monetag", "gigapub", "adsgram"]
      : stepIndex === 1
      ? ["gigapub", "monetag", "adsgram"]
      : stepIndex === 2
      ? ["monetag", "adsgram", "gigapub"]
      : ["adsgram", "monetag", "gigapub"];

  for (const network of preferredOrder) {
    if (AD_STATE.counts[network] >= AD_STATE.dailyCaps[network]) continue;

    try {
      if (network === "monetag") await Providers.showMonetagRewarded();
      else if (network === "gigapub") await Providers.showGigapubRewarded();
      else if (network === "adsgram") await Providers.showAdsgramRewarded();

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
      console.warn(`[AdManager] ${network} failed, trying next priority provider...`);
    }
  }

  return {
    success: false,
    reason: "No ad fill available right now. Please try again shortly.",
  };
}

// 3. INTERSTITIAL AD: 1:1 Alternating (1 Monetag, 1 Gigapub) with 90s Cooldown
export async function triggerAlternatingInterstitial(ignoreCooldown = false): Promise<InterstitialResult> {
  const now = Date.now();
  if (!ignoreCooldown && now - AD_STATE.lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
    const remaining = Math.ceil((INTERSTITIAL_COOLDOWN_MS - (now - AD_STATE.lastInterstitialTime)) / 1000);
    return { shown: false, reason: `Interstitial cooldown active (${remaining}s remaining)` };
  }

  // Previous was gigapub -> now monetag; previous was monetag -> now gigapub
  const primary: "monetag" | "gigapub" =
    AD_STATE.lastInterstitialProvider === "monetag" ? "gigapub" : "monetag";
  const fallback: "monetag" | "gigapub" = primary === "monetag" ? "gigapub" : "monetag";

  const tryShow = async (provider: "monetag" | "gigapub") => {
    if (provider === "monetag") return await Providers.showMonetagInterstitial();
    if (provider === "gigapub") return await Providers.showGigapubInterstitial();
  };

  try {
    await tryShow(primary);
    AD_STATE.lastInterstitialProvider = primary;
    AD_STATE.lastInterstitialTime = Date.now();
    return { shown: true, provider: primary.toUpperCase() };
  } catch (err) {
    try {
      await tryShow(fallback);
      AD_STATE.lastInterstitialProvider = fallback;
      AD_STATE.lastInterstitialTime = Date.now();
      return { shown: true, provider: fallback.toUpperCase() };
    } catch (fallbackErr) {
      return { shown: false, reason: "Both Monetag and Gigapub interstitials had no fill" };
    }
  }
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
      AD_STATE.lastInterstitialProvider === "monetag" ? "GIGAPUB" : "MONETAG",
  };
}
