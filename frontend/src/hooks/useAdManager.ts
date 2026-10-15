import { useCallback } from "react";
import createAdHandler from "monetag-tg-sdk";

declare global {
  interface Window {
    Adsgram?: {
      init: (params: { blockId: string; debug?: boolean; userId?: string }) => {
        show: () => Promise<{ done: boolean }>;
      };
    };
    showMonetagInterstitial?: () => Promise<boolean>;
    show_11886350?: (options?: any) => Promise<any>;
    showGiga?: (zone?: string) => Promise<any>;
    Gigapub?: {
      showRewarded?: () => Promise<boolean>;
      showInterstitial?: () => Promise<boolean>;
    };
  }
}

const rawMonetagZone = (import.meta as any).env?.VITE_MONETAG_ZONE_ID || "11886350";
const MONETAG_ZONE_ID = rawMonetagZone ? parseInt(rawMonetagZone, 10) : 11886350;
const MONETAG_SDK_FN = `show_${MONETAG_ZONE_ID}`;

let monetagHandler: ((options?: any) => Promise<void>) | null = null;
if (typeof window !== "undefined" && MONETAG_ZONE_ID > 0) {
  try {
    monetagHandler = createAdHandler(MONETAG_ZONE_ID);
    console.log(`[Monetag] Initialized monetag-tg-sdk with Zone ID: ${MONETAG_ZONE_ID}`);
  } catch (err) {
    console.warn("[Monetag] Failed to initialize monetag-tg-sdk:", err);
  }
}

// Global state tracking to prevent any ad from interrupting active gameplay
let isGameActiveGlobal = false;
let globalLastInterstitialTime = 0;

export const setGameActiveState = (active: boolean) => {
  isGameActiveGlobal = active;
  console.log(`[AdManager] Active game state: ${active}`);
};

export const isGameActive = () => isGameActiveGlobal;

// Internal executor for Monetag on-demand interstitial display with safety timeout
async function executeMonetagInterstitial(
  userId: number | string
): Promise<boolean> {
  const timeoutMs = 6000;

  const showPromise = new Promise<boolean>(async (resolve) => {
    try {
      const globalMonetag = typeof window !== "undefined" ? (window as any)[MONETAG_SDK_FN] : null;
      const hasMonetag =
        Boolean(globalMonetag) ||
        Boolean(monetagHandler) ||
        (typeof window !== "undefined" && Boolean(window.showMonetagInterstitial));

      // In dev mode without loaded Monetag SDK, resolve cleanly
      if (!hasMonetag) {
        console.log("[AdManager Dev] Simulating Monetag interstitial ad");
        setTimeout(() => resolve(true), 350);
        return;
      }

      let displayed = false;

      // Execute Monetag interstitial
      try {
        if (typeof globalMonetag === "function") {
          await globalMonetag({ ymid: String(userId) });
          displayed = true;
        } else if (monetagHandler) {
          await monetagHandler({ ymid: String(userId) });
          displayed = true;
        } else if (window.showMonetagInterstitial) {
          displayed = await window.showMonetagInterstitial();
        }
      } catch (mErr) {
        console.warn("[AdManager] Monetag standard interstitial failed, trying pop format:", mErr);
        try {
          if (typeof globalMonetag === "function") {
            await globalMonetag("pop");
            displayed = true;
          } else if (monetagHandler) {
            await monetagHandler("pop");
            displayed = true;
          }
        } catch (popErr) {
          console.warn("[AdManager] Monetag pop error:", popErr);
        }
      }

      resolve(displayed);
    } catch (err) {
      console.warn("[AdManager] Monetag Interstitial error:", err);
      resolve(false);
    }
  });

  const timeoutPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      console.log(`[AdManager] Monetag interstitial timeout (${timeoutMs}ms) elapsed`);
      resolve(false);
    }, timeoutMs);
  });

  return await Promise.race([showPromise, timeoutPromise]);
}

// Internal executor for Gigapub on-demand interstitial display with safety timeout
async function executeGigapubInterstitial(): Promise<boolean> {
  const timeoutMs = 8000;

  return new Promise<boolean>(async (resolve) => {
    let finished = false;
    const finish = (result: boolean) => {
      if (!finished) {
        finished = true;
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      console.warn("[AdManager] Gigapub interstitial timeout (8s) elapsed");
      finish(false);
    }, timeoutMs);

    try {
      const getShowGiga = () => (window as any).showGiga;
      if (typeof getShowGiga() === "function") {
        console.log("[AdManager] Executing Gigapub showGiga('main')...");
        try {
          await getShowGiga()("main");
          clearTimeout(timer);
          finish(true);
          return;
        } catch (e) {
          console.warn("[AdManager] showGiga call error:", e);
          clearTimeout(timer);
          finish(false);
          return;
        }
      }

      // If script is asynchronously initializing, retry briefly
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 250));
        if (typeof getShowGiga() === "function") {
          console.log("[AdManager] Executing Gigapub showGiga('main') after wait...");
          try {
            await getShowGiga()("main");
            clearTimeout(timer);
            finish(true);
            return;
          } catch (e) {
            clearTimeout(timer);
            finish(false);
            return;
          }
        }
      }

      if ((window as any).Gigapub && typeof (window as any).Gigapub.showInterstitial === "function") {
        const res = await (window as any).Gigapub.showInterstitial();
        clearTimeout(timer);
        finish(Boolean(res));
        return;
      }

      clearTimeout(timer);
      console.warn("[AdManager] Gigapub SDK not ready or showGiga missing");
      finish(false);
    } catch (err) {
      clearTimeout(timer);
      console.warn("[AdManager] Gigapub Interstitial error:", err);
      finish(false);
    }
  });
}

// 1:1 Alternating Interstitial Engine (Monetag <-> Gigapub one after another)
async function executeAlternatingInterstitial(
  userId: number | string,
  reason: string = "nav"
): Promise<boolean> {
  // Read persisted last provider so alternation is strictly 1:1 across tab clicks and reloads
  const savedLast =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("nc_last_tab_ad_provider")
      : null;
  const lastProvider: "monetag" | "gigapub" =
    savedLast === "monetag" || savedLast === "gigapub" ? savedLast : "gigapub";

  // Determine next provider in 1:1 sequence (Monetag -> Gigapub -> Monetag -> Gigapub)
  const nextProvider: "monetag" | "gigapub" =
    lastProvider === "monetag" ? "gigapub" : "monetag";
  const fallbackProvider: "monetag" | "gigapub" =
    nextProvider === "monetag" ? "gigapub" : "monetag";

  console.log(
    `[AdManager] 1:1 Alternating Tab Ad (${reason}): Showing ${nextProvider.toUpperCase()} (last was ${lastProvider.toUpperCase()})`
  );

  const runProvider = async (p: "monetag" | "gigapub"): Promise<boolean> => {
    if (p === "monetag") {
      return await executeMonetagInterstitial(userId);
    } else {
      return await executeGigapubInterstitial();
    }
  };

  let displayed = false;
  try {
    displayed = await runProvider(nextProvider);
  } catch (err) {
    console.warn(`[AdManager] Primary provider ${nextProvider} error:`, err);
    displayed = false;
  }

  if (displayed) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nc_last_tab_ad_provider", nextProvider);
    }
    return true;
  }

  // Graceful fallback to the opposite network if the primary had zero-fill
  console.log(`[AdManager] Primary ${nextProvider} had no fill, falling back to ${fallbackProvider}...`);
  try {
    const fallbackDisplayed = await runProvider(fallbackProvider);
    if (fallbackDisplayed) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("nc_last_tab_ad_provider", fallbackProvider);
      }
      return true;
    }
  } catch (fallbackErr) {
    console.warn("[AdManager] Both Monetag and Gigapub interstitials failed:", fallbackErr);
  }

  return false;
}

export function useAdManager(
  userId: number | string,
  onRewardClaimed?: (rewardData: any) => void
) {
  // Claim reward with backend
  const claimReward = async (provider: "adsgram" | "monetag") => {
    try {
      const res = await fetch("/api/ads/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.toString(), provider }),
      });
      const data = await res.json();
      if (res.status === 429) {
        const remaining = data.remainingSeconds || 30;
        const expiresAt = Date.now() + remaining * 1000;
        localStorage.setItem("ad_cooldown_expires_at", String(expiresAt));
        window.dispatchEvent(new CustomEvent("ad_cooldown_started", { detail: { remaining } }));
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("warning");
        alert(data.message || `Please wait ${remaining}s before watching another ad.`);
        return null;
      }
      if (res.ok) {
        const cooldown = data.cooldown || 30;
        const expiresAt = Date.now() + cooldown * 1000;
        localStorage.setItem("ad_cooldown_expires_at", String(expiresAt));
        window.dispatchEvent(new CustomEvent("ad_cooldown_started", { detail: { remaining: cooldown } }));
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred("success");
        }
        if (onRewardClaimed) onRewardClaimed(data);
        return data;
      } else {
        alert(data.error || "Could not claim ad reward");
        return null;
      }
    } catch (e) {
      console.error("Ad claim error:", e);
      return null;
    }
  };

  // 1. Play Rewarded Monetag Ad (100 Daily Cap with Tiered Payouts)
  const showMonetagRewarded = useCallback(async () => {
    try {
      const globalSdkFn = typeof window !== "undefined" ? (window as any)[MONETAG_SDK_FN] : null;

      if (typeof globalSdkFn === "function") {
        try {
          console.log(`[Monetag] Calling global ${MONETAG_SDK_FN} interstitial...`);
          await globalSdkFn({ ymid: String(userId) });
          return await claimReward("monetag");
        } catch (interstitialErr) {
          console.warn(`[Monetag] ${MONETAG_SDK_FN} interstitial failed, trying pop:`, interstitialErr);
          await globalSdkFn("pop");
          return await claimReward("monetag");
        }
      } else if (monetagHandler) {
        try {
          console.log("[Monetag] Calling monetag-tg-sdk handler...");
          await monetagHandler({ ymid: String(userId) });
          return await claimReward("monetag");
        } catch (interstitialErr) {
          console.warn("[Monetag] Interstitial fallback to popup format:", interstitialErr);
          await monetagHandler("pop");
          return await claimReward("monetag");
        }
      } else if (window.showMonetagInterstitial) {
        const watched = await window.showMonetagInterstitial();
        if (watched) return await claimReward("monetag");
      } else {
        // Fallback simulation for dev mode or when script is still loading
        console.log("[Monetag Dev] Simulating Rewarded Ad playback in dev mode...");
        return await claimReward("monetag");
      }
    } catch (e: any) {
      console.warn("Monetag error or dismissed:", e?.message || e);
    }
    return null;
  }, [userId, MONETAG_SDK_FN, monetagHandler]);

  // 2. Play Rewarded Adsgram Video (100 Daily Cap with Tiered Payouts)
  const showAdsgramRewarded = useCallback(async () => {
    try {
      const adsgram = typeof window !== "undefined" ? (window as any).Adsgram : null;
      let watched = false;

      if (adsgram && typeof adsgram.init === "function") {
        const blockId = (import.meta as any).env?.VITE_ADSGRAM_BLOCK_ID || "1234";
        const ad = adsgram.init({ blockId, userId: String(userId) });
        const res = await ad.show();
        watched = Boolean(res?.done);
      } else {
        console.log("[Adsgram Dev] Simulating Adsgram Rewarded Video playback...");
        watched = true;
      }

      if (watched) {
        return await claimReward("adsgram");
      }
    } catch (err: any) {
      console.warn("Adsgram error or dismissed:", err?.message || err);
    }
    return null;
  }, [userId]);

  // 3. Interstitial Trigger (Guarded against playing while game is active)
  // 1:1 Alternating between Monetag and Gigapub on tab changes and interstitial events
  const triggerInterstitial = useCallback(
    async (
      reason: "nav" | "start" | "withdraw" | "game_start" | "game_end"
    ): Promise<boolean> => {
      // CRITICAL: Block any interstitial ad if a game is actively playing!
      if (isGameActiveGlobal && reason !== "game_start" && reason !== "game_end") {
        console.log(`[AdManager] Interstitial blocked: Gameplay active (${reason})`);
        return false;
      }

      const now = Date.now();
      const minCooldown =
        reason === "game_start" || reason === "game_end" ? 8000 : 30000;
      if (now - globalLastInterstitialTime < minCooldown) {
        const remaining = Math.ceil((minCooldown - (now - globalLastInterstitialTime)) / 1000);
        console.log(`[AdManager] Interstitial throttled (${reason}) - ${remaining}s cooldown remaining`);
        return false;
      }

      globalLastInterstitialTime = now;

      console.log(`[Ad Trigger] Showing 1:1 alternating interstitial for ${reason}...`);

      return await executeAlternatingInterstitial(userId, reason);
    },
    [userId]
  );

  // 4. Pre-Game Interstitial (Before gameplay begins)
  const showPreGameAd = useCallback(async (): Promise<boolean> => {
    console.log("[AdManager] Triggering pre-game ad...");
    setGameActiveState(false);
    return await triggerInterstitial("game_start");
  }, [triggerInterstitial]);

  // 5. Post-Game Interstitial (After gameplay ends)
  const showPostGameAd = useCallback(async (): Promise<boolean> => {
    console.log("[AdManager] Triggering post-game ad...");
    setGameActiveState(false);
    return await triggerInterstitial("game_end");
  }, [triggerInterstitial]);

  // 6. Withdrawal Limit Ad (Rewarded video/interstitial for 30 daily / 100 weekly limit pass)
  const showWithdrawalLimitAd = useCallback(async (): Promise<any> => {
    const claimLimitAd = async () => {
      try {
        const res = await fetch("/api/withdraw/watch-ad", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userId.toString() }),
        });
        const data = await res.json();
        if (res.ok) {
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred("success");
          }
          if (onRewardClaimed) onRewardClaimed(data);
          return data;
        } else {
          alert(data.error || "Could not record limit ad");
          return null;
        }
      } catch (e) {
        console.error("Limit ad claim error:", e);
        return null;
      }
    };

    // Sole/main provider: Monetag
    await executeMonetagInterstitial(userId);
    return await claimLimitAd();
  }, [userId, onRewardClaimed]);

  return {
    showAdsgramRewarded,
    showMonetagRewarded,
    showWithdrawalLimitAd,
    triggerInterstitial,
    showPreGameAd,
    showPostGameAd,
    setGameActiveState,
    isGameActive,
  };
}

export default useAdManager;
