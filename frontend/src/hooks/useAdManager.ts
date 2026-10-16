import { useCallback } from "react";
import { adService } from "../services/adService.js";

// Global state tracking to prevent any ad from interrupting active gameplay
export const setGameActiveState = (active: boolean) => {
  adService.setIsPlayingGame(active);
  console.log(`[AdManager] Active game state: ${active ? "ACTIVE (60s ads paused)" : "INACTIVE (60s ads active)"}`);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nc_game_mode_changed", { detail: { active } }));
  }
};

export const isGameActive = () => adService.getIsPlayingGame();

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

  // 1. Play Rewarded Monetag Ad (Strictly Monetag only)
  const showMonetagRewarded = useCallback(async () => {
    try {
      const watched = await adService.showMonetagAd("rewarded", "Monetag High-CPM Video");
      if (watched) {
        return await claimReward("monetag");
      }
    } catch (e: any) {
      console.warn("Monetag error or dismissed:", e?.message || e);
    }
    return null;
  }, [userId]);

  // 2. Play Rewarded Gigapub Ad (Strictly Gigapub only - never Monetag)
  const showGigapubRewarded = useCallback(async () => {
    try {
      const watched = await adService.showGigapubAd("rewarded", "Gigapub Native Video");
      if (watched) {
        return await claimReward("monetag"); // Backend reward claim
      }
    } catch (e: any) {
      console.warn("Gigapub error or dismissed:", e?.message || e);
    }
    return null;
  }, [userId]);

  // 3. Play Rewarded Adsgram Video (Strictly Adsgram only)
  const showAdsgramRewarded = useCallback(async () => {
    try {
      const watched = await adService.showAdsgramAd("rewarded", "Adsgram Video Reward");
      if (watched) {
        return await claimReward("adsgram");
      }
    } catch (err: any) {
      console.warn("Adsgram error or dismissed:", err?.message || err);
    }
    return null;
  }, [userId]);

  // 4. Interstitial Trigger (Alternating 1:1, guarded against mid-game)
  const triggerInterstitial = useCallback(
    async (
      reason: "nav" | "start" | "withdraw" | "game_start" | "game_end" | "auto_30s" | "auto_60s"
    ): Promise<boolean> => {
      return await adService.triggerAlternatingInterstitial(reason);
    },
    []
  );

  // 5. Pre-Game Helper
  const showPreGameAd = useCallback(async (): Promise<boolean> => {
    return await triggerInterstitial("game_start");
  }, [triggerInterstitial]);

  // 6. Post-Game Interstitial (Immediately fires queued or post-game ad)
  const showPostGameAd = useCallback(async (): Promise<boolean> => {
    console.log("[AdManager] Triggering post-game ad via adService.onGameEnd()...");
    return await adService.onGameEnd();
  }, []);

  // 7. Withdrawal Limit Ad (Rewarded video/interstitial for 30 daily / 100 weekly limit pass)
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

    // Show monetag ad via adService
    await adService.showMonetagAd("rewarded", "Withdrawal Limit Breaker");
    return await claimLimitAd();
  }, [userId, onRewardClaimed]);

  return {
    showAdsgramRewarded,
    showGigapubRewarded,
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
