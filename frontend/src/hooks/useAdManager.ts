import { useCallback, useRef } from "react";

declare global {
  interface Window {
    Adsgram?: {
      init: (params: { blockId: string; debug?: boolean }) => {
        show: () => Promise<{ done: boolean }>;
      };
    };
    showMonetagInterstitial?: () => Promise<boolean>;
  }
}

export function useAdManager(
  userId: number | string,
  onRewardClaimed?: (rewardData: any) => void
) {
  const lastInterstitialRef = useRef<number>(0);
  const ADSGRAM_BLOCK_ID =
    (import.meta as any).env?.VITE_ADSGRAM_BLOCK_ID || "YOUR_ADSGRAM_BLOCK_ID";

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
      const controller = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
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
      if (window.showMonetagInterstitial) {
        const watched = await window.showMonetagInterstitial();
        if (watched) await claimReward("monetag");
      } else {
        // Fallback for Monetag in-app link tag
        console.log("[Dev Mode] Simulating Monetag Rewarded Ad playback...");
        await claimReward("monetag");
      }
    } catch (e) {
      console.warn("Monetag error", e);
    }
  }, [userId]);

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
      } else if (window.showMonetagInterstitial) {
        window.showMonetagInterstitial().catch(() => {});
      }
    },
    [ADSGRAM_BLOCK_ID]
  );

  return {
    showAdsgramRewarded,
    showMonetagRewarded,
    triggerInterstitial,
  };
}

export default useAdManager;
