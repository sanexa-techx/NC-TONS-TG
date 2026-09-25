import { useCallback, useRef } from "react";
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

export function useAdManager(
  userId: number | string,
  onRewardClaimed?: (rewardData: any) => void
) {
  const lastInterstitialRef = useRef<number>(0);
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

  // 3. Interstitial Trigger (Throttled to max 1 ad every 45 seconds)
  const triggerInterstitial = useCallback(
    (reason: "nav" | "start" | "withdraw") => {
      const now = Date.now();
      if (now - lastInterstitialRef.current < 45000) return; // 45s cooldown

      lastInterstitialRef.current = now;

      // Alternate between Adsgram and Monetag
      const provider = Math.random() < 0.5 ? "adsgram" : "monetag";
      console.log(`[Ad Trigger] Interstitial displayed (${reason}) via ${provider}`);

      if (provider === "adsgram" && window.Adsgram) {
        const controller = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        controller.show().catch(() => {});
      } else {
        const globalSdkFn = typeof window !== "undefined" ? (window as any)[MONETAG_SDK_FN] : null;
        if (typeof globalSdkFn === "function") {
          globalSdkFn({
            type: "inApp",
            inAppSettings: {
              frequency: 2,
              capping: 0.25,
              interval: 45,
              timeout: 5,
            },
          }).catch(() => {});
        } else if (monetagHandler) {
          monetagHandler({
            type: "inApp",
            inAppSettings: {
              frequency: 2,
              capping: 0.25,
              interval: 45,
              timeout: 5,
            },
          }).catch(() => {});
        } else if (window.showMonetagInterstitial) {
          window.showMonetagInterstitial().catch(() => {});
        }
      }
    },
    [ADSGRAM_BLOCK_ID, MONETAG_SDK_FN, monetagHandler]
  );

  return {
    showAdsgramRewarded,
    showMonetagRewarded,
    triggerInterstitial,
  };
}

export default useAdManager;
