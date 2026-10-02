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

// Primary ad network: Monetag (Main Provider for all interstitials and rewarded tasks)
// Secondary ad network: Adsgram (Reserved strictly for rewarded Missions only)

// Internal executor for Monetag on-demand interstitial display with safety timeout
// STRICT REQUIREMENT: Only Monetag is shown for interstitials. Adsgram is strictly reserved for missions.
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

export function useAdManager(
  userId: number | string,
  onRewardClaimed?: (rewardData: any) => void
) {
  const ADSGRAM_BLOCK_ID =
    (import.meta as any).env?.VITE_ADSGRAM_BLOCK_ID || "49696";

  // Claim reward with backend
  const claimReward = async (provider: "adsgram" | "monetag") => {
    try {
      const res = await fetch("/api/ads/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.toString(), provider }),
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
        alert(data.error || "Could not claim ad reward");
        return null;
      }
    } catch (e) {
      console.error("Ad claim error:", e);
      return null;
    }
  };

  // 1. Play Rewarded Adsgram Video
  const showAdsgramRewarded = useCallback(async () => {
    if (window.Adsgram) {
      const controller = window.Adsgram.init({
        blockId: ADSGRAM_BLOCK_ID,
        userId: String(userId),
      });
      try {
        const result = await controller.show();
        if (result.done) {
          await claimReward("adsgram");
        }
      } catch (e) {
        console.warn("Adsgram skipped or error", e);
      }
    } else {
      // Dev mode fallback simulation
      console.log("[Dev Mode] Simulating Adsgram Rewarded Video playback...");
      await claimReward("adsgram");
    }
  }, [userId, ADSGRAM_BLOCK_ID]);

  // 2. Play Rewarded Monetag Ad
  const showMonetagRewarded = useCallback(async () => {
    try {
      const globalSdkFn = typeof window !== "undefined" ? (window as any)[MONETAG_SDK_FN] : null;

      if (typeof globalSdkFn === "function") {
        try {
          console.log(`[Monetag] Calling global ${MONETAG_SDK_FN} interstitial...`);
          await globalSdkFn({ ymid: String(userId) });
          await claimReward("monetag");
          return;
        } catch (interstitialErr) {
          console.warn(`[Monetag] ${MONETAG_SDK_FN} interstitial failed, trying pop:`, interstitialErr);
          await globalSdkFn("pop");
          await claimReward("monetag");
          return;
        }
      } else if (monetagHandler) {
        try {
          console.log("[Monetag] Calling monetag-tg-sdk handler...");
          await monetagHandler({ ymid: String(userId) });
          await claimReward("monetag");
          return;
        } catch (interstitialErr) {
          console.warn("[Monetag] Interstitial fallback to popup format:", interstitialErr);
          await monetagHandler("pop");
          await claimReward("monetag");
          return;
        }
      } else if (window.showMonetagInterstitial) {
        const watched = await window.showMonetagInterstitial();
        if (watched) await claimReward("monetag");
        return;
      } else {
        // Fallback simulation for dev mode or when script is still loading
        console.log("[Monetag] Simulating Rewarded Ad playback in dev mode...");
        await claimReward("monetag");
      }
    } catch (e: any) {
      console.warn("Monetag error or dismissed:", e?.message || e);
    }
  }, [userId, MONETAG_SDK_FN, monetagHandler]);

  // 3. Interstitial Trigger (Guarded against playing while game is active, no recurring timers)
  // STRICT REQUIREMENT: Interstitial ads ONLY show Monetag. Adsgram is reserved exclusively for Missions.
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
        console.log(`[AdManager] Interstitial throttled (${reason})`);
        return false;
      }

      globalLastInterstitialTime = now;

      console.log(`[Ad Trigger] Showing Monetag interstitial (${reason})`);

      return await executeMonetagInterstitial(userId);
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

    if (window.Adsgram) {
      const controller = window.Adsgram.init({
        blockId: ADSGRAM_BLOCK_ID,
        userId: String(userId),
      });
      try {
        const result = await controller.show();
        if (result.done) {
          return await claimLimitAd();
        }
      } catch (e) {
        console.warn("Adsgram limit ad fallback to Monetag:", e);
        await executeMonetagInterstitial(userId);
        return await claimLimitAd();
      }
    } else {
      await executeMonetagInterstitial(userId);
      return await claimLimitAd();
    }
  }, [userId, ADSGRAM_BLOCK_ID, onRewardClaimed]);

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
