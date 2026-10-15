// src/services/adManager.js
// High-CPM Multi-Network Ad Monetization Engine (Monetag, Gigapub, Adsgram)

export const AD_STATE = {
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
    monetag: 18,
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

// Game Mode State Tracking (suppresses 60s interstitial ads during active gameplay)
let isGameActiveGlobal = false;
export const setGameActiveState = (active) => {
  isGameActiveGlobal = active;
  console.log(`[AdManager] Game mode: ${active ? "ACTIVE (30s ads paused)" : "INACTIVE (30s ads resumed)"}`);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nc_game_mode_changed", { detail: { active } }));
  }
};
export const isGameActive = () => isGameActiveGlobal;

// 1. Provider SDK call functions
export const Providers = {
  // --- MONETAG ---
  async showMonetagRewarded() {
    const fn = window.show_11886350 || window.show_MONETAG_ZONE_ID;
    if (typeof fn === "function") {
      await fn();
      return true;
    }
    // Sandbox / fallback delay
    await new Promise((r) => setTimeout(r, 600));
    return true;
  },

  async showMonetagInterstitial() {
    const fn = window.show_11886350 || window.show_MONETAG_ZONE_ID;
    if (typeof fn === "function") {
      try {
        await fn("pop");
        return true;
      } catch (e) {
        await fn();
        return true;
      }
    }
    if (typeof window.showMonetagInterstitial === "function") {
      return await window.showMonetagInterstitial();
    }
    await new Promise((r) => setTimeout(r, 500));
    return true;
  },

  // --- GIGAPUB ---
  async showGigapubRewarded() {
    if (typeof window.showGiga === "function") {
      await window.showGiga("main");
      return true;
    }
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (typeof window.showGiga === "function") {
        await window.showGiga("main");
        return true;
      }
    }
    if (window.Gigapub && typeof window.Gigapub.showRewarded === "function") {
      const res = await window.Gigapub.showRewarded();
      if (res) return true;
    }
    throw new Error("GigaPub ad player unavailable. Please disable ad-blockers and try again.");
  },

  async showGigapubInterstitial() {
    if (typeof window.showGiga === "function") {
      await window.showGiga("main");
      return true;
    }
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (typeof window.showGiga === "function") {
        await window.showGiga("main");
        return true;
      }
    }
    if (window.Gigapub && typeof window.Gigapub.showInterstitial === "function") {
      const res = await window.Gigapub.showInterstitial();
      if (res) return true;
    }
    throw new Error("GigaPub interstitial unavailable.");
  },

  // --- ADSGRAM ---
  async showAdsgramRewarded() {
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
export async function showSmartRewardedAd(ignoreCooldown = false) {
  const now = Date.now();
  const timeLeft = Math.ceil((AD_STATE.lastRewardedTime + REWARDED_COOLDOWN_MS - now) / 1000);

  if (!ignoreCooldown && timeLeft > 0) {
    return {
      success: false,
      reason: `Please wait ${timeLeft}s cooldown to protect maximum CPM rates.`,
    };
  }

  // Priority List: 1. Monetag -> 2. Gigapub -> 3. Adsgram
  // Micro-rotation: Monetag -> Gigapub -> Monetag -> Adsgram
  const stepIndex = AD_STATE.rewardedStep % 4;
  const preferredOrder =
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

      AD_STATE.counts[network] += 1;
      AD_STATE.rewardedStep += 1;
      AD_STATE.lastRewardedTime = Date.now();
      AD_STATE.lastRewardedByProvider[network] = Date.now();

      const totalWatched =
        AD_STATE.counts.monetag + AD_STATE.counts.gigapub + AD_STATE.counts.adsgram;

      // Broadcast cooldown event
      try {
        window.dispatchEvent(
          new CustomEvent("ad_cooldown_started", { detail: { remaining: 30, provider: network } })
        );
      } catch (_) {}

      return {
        success: true,
        provider: network.toUpperCase(),
        totalWatched,
        reward: calculateTierReward(totalWatched),
      };
    } catch (err) {
      console.warn(`[AdManager] ${network} failed, trying next priority provider...`, err);
    }
  }

  return {
    success: false,
    reason: "No ad fill available right now. Please try again shortly.",
  };
}

// 2b. SPECIFIC PROVIDER REWARDED AD: Dedicated Button Trigger with 30s Cooldown
export async function showSpecificRewardedAd(provider, ignoreCooldown = false) {
  const now = Date.now();
  const lastTime = AD_STATE.lastRewardedByProvider[provider] || 0;
  const timeLeft = Math.max(0, Math.ceil((lastTime + REWARDED_COOLDOWN_MS - now) / 1000));

  if (!ignoreCooldown && timeLeft > 0) {
    return {
      success: false,
      reason: `${provider.toUpperCase()} is cooling down (${timeLeft}s remaining).`,
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

    try {
      window.dispatchEvent(
        new CustomEvent("ad_cooldown_started", { detail: { remaining: 30, provider } })
      );
    } catch (_) {}

    return {
      success: true,
      provider: provider.toUpperCase(),
      totalWatched,
      reward: calculateTierReward(totalWatched),
    };
  } catch (err) {
    return {
      success: false,
      reason: err?.message || `${provider.toUpperCase()} ad could not be loaded. Please try again.`,
    };
  }
}

// 3. INTERSTITIAL AD: 1:1 Alternating (1 Monetag, 1 Gigapub one after another) with 30s Cooldown
export async function triggerAlternatingInterstitial(ignoreCooldown = false) {
  // CRITICAL: Block 30s interstitial ads if user is actively in Game Mode!
  if (isGameActiveGlobal && !ignoreCooldown) {
    return { shown: false, reason: "Game mode active (interstitials paused during gameplay)" };
  }

  const now = Date.now();
  if (!ignoreCooldown && now - AD_STATE.lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
    const remaining = Math.ceil(
      (INTERSTITIAL_COOLDOWN_MS - (now - AD_STATE.lastInterstitialTime)) / 1000
    );
    return { shown: false, reason: `Interstitial cooldown active (${remaining}s remaining)` };
  }

  // Read persisted last provider so alternation is strictly 1:1 across tabs, reloads, and sessions
  const savedLast =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("nc_last_tab_ad_provider")
      : null;
  const last =
    savedLast === "monetag" || savedLast === "gigapub"
      ? savedLast
      : AD_STATE.lastInterstitialProvider;

  // Next provider alternates: Monetag -> Gigapub -> Monetag -> Gigapub
  const primary = last === "monetag" ? "gigapub" : "monetag";
  const fallback = primary === "monetag" ? "gigapub" : "monetag";

  const tryShow = async (provider) => {
    if (provider === "monetag") return await Providers.showMonetagInterstitial();
    if (provider === "gigapub") return await Providers.showGigapubInterstitial();
  };

  try {
    await tryShow(primary);
    AD_STATE.lastInterstitialProvider = primary;
    AD_STATE.lastInterstitialTime = Date.now();
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nc_last_tab_ad_provider", primary);
    }
    return { shown: true, provider: primary.toUpperCase() };
  } catch (err) {
    try {
      await tryShow(fallback);
      AD_STATE.lastInterstitialProvider = fallback;
      AD_STATE.lastInterstitialTime = Date.now();
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("nc_last_tab_ad_provider", fallback);
      }
      return { shown: true, provider: fallback.toUpperCase() };
    } catch (fallbackErr) {
      return { shown: false, reason: "Both Monetag and Gigapub interstitials had no fill" };
    }
  }
}

// 4. 3-Tier Dynamic Reward Calculator
export function calculateTierReward(totalAdsWatched) {
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
