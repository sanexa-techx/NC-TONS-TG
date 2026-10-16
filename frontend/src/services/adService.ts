// src/services/adService.ts
// Comprehensive singleton multi-network ad engine with:
// 1. Strict Mutex Lock (isAdPlaying = true with minimum 5s lock window)
// 2. Strict Provider Isolation (No fallback between Monetag, Gigapub, and Adsgram)
// 3. Single Global setTimeout Chain for 60s Alternating Interstitials (protected by window.__NC_AD_TIMER_INITIALIZED__)
// 4. Gameplay Ad Protection (No ads mid-game; queued for onGameEnd)
// 5. Missions Tab 3-Step Combo Lock (Monetag -> Gigapub -> Adsgram -> +Combo Bonus)

export type AdProvider = "monetag" | "gigapub" | "adsgram";
export type AdType = "interstitial" | "rewarded";

export interface AdModalState {
  isOpen: boolean;
  provider: "MONETAG" | "GIGAPUB" | "ADSGRAM";
  secondsLeft: number;
  totalSeconds: number;
  isSimulated: boolean;
  rewardText?: string;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export interface AdServiceState {
  secondsUntilNextInterstitial: number;
  nextInterstitialProvider: "MONETAG" | "GIGAPUB";
  lastInterstitialProvider: "monetag" | "gigapub";
  isPlayingGame: boolean;
  interstitialQueued: boolean;
  isAdPlaying: boolean;
  comboStep: 1 | 2 | 3;
  comboCompletions: number;
  modal: AdModalState;
  appOpenTriggered: boolean;
}

declare global {
  interface Window {
    __NC_AD_TIMER_INITIALIZED__?: boolean;
    show_11886350?: (options?: any) => Promise<any>;
    show_MONETAG_ZONE_ID?: (options?: any) => Promise<any>;
    show_MONETAG?: (options?: any) => Promise<any>;
    showMonetagInterstitial?: () => Promise<boolean>;
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

const MONETAG_ZONE_ID = "11886350";
const ADSGRAM_BLOCK_ID = "12571";
const INTERSTITIAL_CYCLE_SECONDS = 60;
const MUTEX_COOLDOWN_MS = 5000; // Minimum 5-second lock window after ad closes

class AdService {
  private lastInterstitialProvider: "monetag" | "gigapub" = "gigapub"; // So 1st interstitial is Monetag
  private secondsUntilNextInterstitial: number = INTERSTITIAL_CYCLE_SECONDS;
  private isPlayingGame: boolean = false;
  private interstitialQueued: boolean = false;
  private isAdPlaying: boolean = false;
  private adLockUntil: number = 0;
  private comboStep: 1 | 2 | 3 = 1;
  private comboCompletions: number = 0;
  private appOpenTriggered: boolean = false;
  private isInitialized: boolean = false;
  private currentUserId: string = "";
  private countdownTimerId: any = null;
  private interstitialTimeoutId: any = null;

  private modalState: AdModalState = {
    isOpen: false,
    provider: "MONETAG",
    secondsLeft: 5,
    totalSeconds: 5,
    isSimulated: true,
  };

  private listeners: Set<(state: AdServiceState) => void> = new Set();

  constructor() {
    if (typeof localStorage !== "undefined") {
      const savedProvider = localStorage.getItem("nc_last_tab_ad_provider");
      if (savedProvider === "monetag" || savedProvider === "gigapub") {
        this.lastInterstitialProvider = savedProvider;
      }
      const savedCombo = localStorage.getItem("nc_ad_combo_step");
      if (savedCombo === "1" || savedCombo === "2" || savedCombo === "3") {
        this.comboStep = parseInt(savedCombo, 10) as 1 | 2 | 3;
      }
      const savedCompletions = localStorage.getItem("nc_ad_combo_completions");
      if (savedCompletions) {
        this.comboCompletions = parseInt(savedCompletions, 10) || 0;
      }
    }
  }

  // --- INITIALIZATION ---
  public init(userId: string | number) {
    this.currentUserId = String(userId || "");

    // Global guard to prevent duplicate timer chains across StrictMode or re-renders
    if (typeof window !== "undefined") {
      if (window.__NC_AD_TIMER_INITIALIZED__) {
        console.log("[AdService] Timer already initialized on window. Skipping duplicate chain.");
        return;
      }
      window.__NC_AD_TIMER_INITIALIZED__ = true;
    }

    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log("[AdService] Initializing single global ad engine & setTimeout chain...");

    // Start 1-second countdown tick for UI indicators
    if (!this.countdownTimerId && typeof window !== "undefined") {
      this.countdownTimerId = setInterval(() => this.tick(), 1000);
    }

    // Sequence: On initial App Open (after 3s), Show ONLY 1 MONETAG interstitial
    if (!this.appOpenTriggered) {
      setTimeout(() => {
        if (!this.appOpenTriggered) {
          console.log("[AdService] Initial App Open (after 3s): Triggering MONETAG Interstitial...");
          this.triggerAppOpenInterstitial();
        }
      }, 3000);
    }

    this.notify();
  }

  // --- MUTEX LOCK MANAGEMENT ---
  public canPlayAd(): boolean {
    const now = Date.now();
    if (this.isAdPlaying) {
      console.warn("[AdService] Ad trigger blocked: An ad is currently active (isAdPlaying = true)");
      return false;
    }
    if (now < this.adLockUntil) {
      const remainingSec = Math.ceil((this.adLockUntil - now) / 1000);
      console.warn(`[AdService] Ad trigger blocked: Mutex lock active (${remainingSec}s remaining)`);
      return false;
    }
    return true;
  }

  private acquireLock() {
    this.isAdPlaying = true;
    this.notify();
  }

  private releaseLock() {
    this.adLockUntil = Date.now() + MUTEX_COOLDOWN_MS;
    this.isAdPlaying = false;
    this.notify();
  }

  // --- 1-SECOND TICK (For UI countdowns) ---
  private tick() {
    // 1. Modal countdown
    if (this.modalState.isOpen && this.modalState.secondsLeft > 0) {
      this.modalState.secondsLeft -= 1;
      if (this.modalState.secondsLeft <= 0) {
        const onComplete = this.modalState.onComplete;
        this.modalState.isOpen = false;
        if (onComplete) onComplete();
      }
      this.notify();
    }

    // 2. Countdown display tick
    if (this.secondsUntilNextInterstitial > 0) {
      this.secondsUntilNextInterstitial -= 1;
      this.notify();
    }
  }

  // --- 60-SECOND INTERSTITIAL TIMEOUT SCHEDULER (Single setTimeout Chain) ---
  public scheduleNextInterstitial(seconds: number = INTERSTITIAL_CYCLE_SECONDS) {
    if (this.interstitialTimeoutId) {
      clearTimeout(this.interstitialTimeoutId);
      this.interstitialTimeoutId = null;
    }

    this.secondsUntilNextInterstitial = seconds;
    this.notify();

    console.log(`[AdService] Next interstitial scheduled in ${seconds}s`);

    this.interstitialTimeoutId = setTimeout(async () => {
      this.interstitialTimeoutId = null;

      // If user is actively playing a game, DO NOT show ad mid-game; queue it!
      if (this.isPlayingGame) {
        console.log("[AdService] 60s timer reached 0 while game is active. Queueing single interstitial ad.");
        this.interstitialQueued = true;
        this.notify();
        return;
      }

      // If an ad is currently playing or locked, push back by 10s
      if (!this.canPlayAd()) {
        console.log("[AdService] Mutex busy when 60s timer finished. Retrying in 10s...");
        this.scheduleNextInterstitial(10);
        return;
      }

      await this.triggerAlternatingInterstitial("timer_60s");
    }, seconds * 1000);
  }

  // Reset 60s interstitial timer (e.g. after manual mission ad is completed)
  public resetInterstitialTimer(seconds: number = INTERSTITIAL_CYCLE_SECONDS) {
    console.log(`[AdService] Interstitial timer reset: Next ad in ${seconds}s.`);
    this.scheduleNextInterstitial(seconds);
  }

  // --- SDK AVAILABILITY DETECTION ---
  public isMonetagAvailable(): boolean {
    if (typeof window === "undefined") return false;
    return (
      typeof window.show_11886350 === "function" ||
      typeof window.show_MONETAG_ZONE_ID === "function" ||
      typeof (window as any)[`show_${MONETAG_ZONE_ID}`] === "function" ||
      typeof (window as any).show_MONETAG === "function" ||
      typeof window.showMonetagInterstitial === "function"
    );
  }

  public isGigapubAvailable(): boolean {
    if (typeof window === "undefined") return false;
    return (
      typeof window.showGiga === "function" ||
      (Boolean(window.Gigapub) &&
        (typeof window.Gigapub?.showRewarded === "function" ||
          typeof window.Gigapub?.showInterstitial === "function"))
    );
  }

  public isAdsgramAvailable(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(window.Adsgram) && typeof window.Adsgram?.init === "function";
  }

  // --- SLEEK OBSIDIAN GLASS MODAL FALLBACK TRIGGER ---
  private showModalFallback(
    provider: AdProvider,
    rewardText?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const badgeText = provider.toUpperCase() as "MONETAG" | "GIGAPUB" | "ADSGRAM";
      this.modalState = {
        isOpen: true,
        provider: badgeText,
        secondsLeft: 5,
        totalSeconds: 5,
        isSimulated: true,
        rewardText,
        onComplete: () => {
          this.modalState.isOpen = false;
          this.notify();
          resolve(true);
        },
        onDismiss: () => {
          this.modalState.isOpen = false;
          this.notify();
          resolve(false);
        },
      };
      this.notify();
    });
  }

  // =========================================================================
  // STRICT PROVIDER ISOLATION: NO AUTO-FALLBACK BETWEEN NETWORKS
  // =========================================================================

  // 1. STRICT MONETAG EXECUTION (Never calls Gigapub or Adsgram)
  public async showMonetagAd(
    type: AdType = "rewarded",
    rewardText?: string
  ): Promise<boolean> {
    if (!this.canPlayAd()) return false;
    this.acquireLock();
    console.log(`[AdService] Starting strictly isolated MONETAG ${type} ad...`);

    let result = false;
    try {
      if (this.isMonetagAvailable()) {
        const fn =
          window.show_11886350 ||
          window.show_MONETAG_ZONE_ID ||
          (window as any)[`show_${MONETAG_ZONE_ID}`] ||
          (window as any).show_MONETAG;

        if (typeof fn === "function") {
          try {
            await fn({ ymid: this.currentUserId || "miner" });
            result = true;
          } catch (e) {
            console.warn("[AdService] Monetag standard call failed, attempting pop:", e);
            try {
              await fn("pop");
              result = true;
            } catch (popErr) {
              console.warn("[AdService] Monetag pop error, displaying Monetag modal:", popErr);
              result = await this.showModalFallback("monetag", rewardText);
            }
          }
        } else if (typeof window.showMonetagInterstitial === "function") {
          const res = await window.showMonetagInterstitial();
          result = Boolean(res);
        }
      } else {
        console.log("[AdService] Monetag SDK not ready. Showing Monetag Obsidian modal...");
        result = await this.showModalFallback("monetag", rewardText);
      }
    } catch (err) {
      console.warn("[AdService] Monetag error:", err);
      result = await this.showModalFallback("monetag", rewardText);
    } finally {
      this.releaseLock();
      this.resetInterstitialTimer(60);
    }

    return result;
  }

  // 2. STRICT GIGAPUB EXECUTION (Never calls Monetag or Adsgram)
  public async showGigapubAd(
    type: AdType = "rewarded",
    rewardText?: string
  ): Promise<boolean> {
    if (!this.canPlayAd()) return false;
    this.acquireLock();
    console.log(`[AdService] Starting strictly isolated GIGAPUB ${type} ad...`);

    let result = false;
    try {
      if (this.isGigapubAvailable()) {
        if (typeof window.showGiga === "function") {
          await window.showGiga("main");
          result = true;
        } else if (window.Gigapub) {
          if (type === "rewarded" && typeof window.Gigapub.showRewarded === "function") {
            const res = await window.Gigapub.showRewarded();
            result = Boolean(res);
          } else if (typeof window.Gigapub.showInterstitial === "function") {
            const res = await window.Gigapub.showInterstitial();
            result = Boolean(res);
          }
        }
      } else {
        console.log("[AdService] Gigapub SDK not ready. Showing Gigapub Obsidian modal...");
        result = await this.showModalFallback("gigapub", rewardText);
      }
    } catch (err) {
      console.warn("[AdService] Gigapub error, showing Gigapub modal (NO MONETAG FALLBACK):", err);
      result = await this.showModalFallback("gigapub", rewardText);
    } finally {
      this.releaseLock();
      this.resetInterstitialTimer(60);
    }

    return result;
  }

  // 3. STRICT ADSGRAM EXECUTION (Never calls Monetag or Gigapub)
  public async showAdsgramAd(
    type: AdType = "rewarded",
    rewardText?: string
  ): Promise<boolean> {
    if (!this.canPlayAd()) return false;
    this.acquireLock();
    console.log(`[AdService] Starting strictly isolated ADSGRAM ${type} ad...`);

    let result = false;
    try {
      if (this.isAdsgramAvailable() && window.Adsgram) {
        const ad = window.Adsgram.init({
          blockId: ADSGRAM_BLOCK_ID,
          userId: this.currentUserId,
        });
        const res = await ad.show();
        result = Boolean(res?.done);
      } else {
        console.log("[AdService] Adsgram SDK not ready. Showing Adsgram Obsidian modal...");
        result = await this.showModalFallback("adsgram", rewardText);
      }
    } catch (err) {
      console.warn("[AdService] Adsgram error, showing Adsgram modal:", err);
      result = await this.showModalFallback("adsgram", rewardText);
    } finally {
      this.releaseLock();
      this.resetInterstitialTimer(60);
    }

    return result;
  }

  // Generic router dispatching to strictly isolated provider methods
  public async showAd(
    provider: AdProvider,
    type: AdType = "interstitial",
    rewardText?: string
  ): Promise<boolean> {
    if (provider === "monetag") return await this.showMonetagAd(type, rewardText);
    if (provider === "gigapub") return await this.showGigapubAd(type, rewardText);
    if (provider === "adsgram") return await this.showAdsgramAd(type, rewardText);
    return false;
  }

  // --- APP OPEN INTERSTITIAL (After 3s: ONLY 1 MONETAG) ---
  public async triggerAppOpenInterstitial(): Promise<boolean> {
    if (this.appOpenTriggered) return false;
    this.appOpenTriggered = true;
    this.lastInterstitialProvider = "monetag";
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nc_last_tab_ad_provider", "monetag");
    }

    console.log("[AdService] Playing App Open Interstitial (MONETAG ONLY)...");
    const res = await this.showMonetagAd("interstitial", "Welcome to NC TONs Mining Rig");

    // Strictly wait 60 seconds AFTER the ad closes before showing GIGAPUB
    this.scheduleNextInterstitial(60);
    return res;
  }

  // --- 1:1 STRICTLY ALTERNATING INTERSTITIAL ENGINE (NO CROSS-FALLBACK) ---
  public async triggerAlternatingInterstitial(reason: string = "timer"): Promise<boolean> {
    // If gameplay active, mark queued and abort!
    if (this.isPlayingGame && reason !== "game_end" && reason !== "game_queued") {
      console.log(`[AdService] Interstitial blocked (${reason}): Gameplay active! Queuing ad.`);
      this.interstitialQueued = true;
      this.notify();
      return false;
    }

    if (!this.canPlayAd()) {
      console.log(`[AdService] Interstitial skipped (${reason}): Ad is currently playing or locked.`);
      return false;
    }

    // Strictly alternate: Monetag -> 60s -> Gigapub -> 60s -> Monetag...
    const next: "monetag" | "gigapub" =
      this.lastInterstitialProvider === "monetag" ? "gigapub" : "monetag";

    console.log(
      `[AdService] 1:1 Interstitial (${reason}): Showing ${next.toUpperCase()} (last was ${this.lastInterstitialProvider.toUpperCase()})`
    );

    let shown = false;
    try {
      if (next === "monetag") {
        shown = await this.showMonetagAd("interstitial");
      } else {
        shown = await this.showGigapubAd("interstitial");
      }

      if (shown) {
        this.lastInterstitialProvider = next;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("nc_last_tab_ad_provider", next);
        }
      }
    } catch (e) {
      console.warn(`[AdService] ${next} interstitial error:`, e);
      // STRICT REQUIREMENT: NEVER FALLBACK TO OPPOSITE NETWORK!
    }

    // Schedule next interstitial strictly 60s after ad finishes
    this.scheduleNextInterstitial(60);
    return shown;
  }

  // --- GAMEPLAY AD PROTECTION ---
  public setIsPlayingGame(playing: boolean) {
    this.isPlayingGame = playing;
    console.log(`[AdService] Gameplay state: ${playing ? "ACTIVE (Ads Protected)" : "IDLE"}`);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nc_game_mode_changed", { detail: { active: playing } }));
    }

    // If game ended and an interstitial was queued, fire that single queued ad immediately
    if (!playing && this.interstitialQueued) {
      console.log("[AdService] Game ended with queued interstitial. Firing single queued ad now...");
      this.interstitialQueued = false;
      this.triggerAlternatingInterstitial("game_queued");
    }

    this.notify();
  }

  public getIsPlayingGame(): boolean {
    return this.isPlayingGame;
  }

  public onGameEnd(): Promise<boolean> {
    console.log("[AdService] onGameEnd: Firing post-game interstitial & resetting 60s timer...");
    this.isPlayingGame = false;
    const wasQueued = this.interstitialQueued;
    this.interstitialQueued = false;
    this.notify();

    return this.triggerAlternatingInterstitial(wasQueued ? "game_queued" : "game_end");
  }

  // --- MISSIONS TAB: MANDATORY 3-CATEGORY COMBO LOCK ---
  public getComboStep(): 1 | 2 | 3 {
    return this.comboStep;
  }

  public getComboCompletions(): number {
    return this.comboCompletions;
  }

  public isComboStepUnlocked(step: 1 | 2 | 3): boolean {
    return this.comboStep === step;
  }

  public advanceComboStep(): { completedStep: 1 | 2 | 3; nextStep: 1 | 2 | 3; comboBonusReady: boolean } {
    const completedStep = this.comboStep;
    let nextStep: 1 | 2 | 3 = 1;
    let comboBonusReady = false;

    if (this.comboStep === 1) {
      nextStep = 2;
    } else if (this.comboStep === 2) {
      nextStep = 3;
    } else if (this.comboStep === 3) {
      comboBonusReady = true;
      nextStep = 1;
      this.comboCompletions += 1;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("nc_ad_combo_completions", String(this.comboCompletions));
      }
    }

    this.comboStep = nextStep;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nc_ad_combo_step", String(this.comboStep));
    }

    this.notify();
    return { completedStep, nextStep, comboBonusReady };
  }

  public resetComboCycle() {
    this.comboStep = 1;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nc_ad_combo_step", "1");
    }
    this.notify();
  }

  public dismissModal() {
    if (this.modalState.onDismiss) {
      this.modalState.onDismiss();
    } else {
      this.modalState.isOpen = false;
      this.notify();
    }
  }

  // --- STATE SUBSCRIPTION ---
  public getSnapshot(): AdServiceState {
    const next = this.lastInterstitialProvider === "monetag" ? "GIGAPUB" : "MONETAG";
    return {
      secondsUntilNextInterstitial: this.secondsUntilNextInterstitial,
      nextInterstitialProvider: next,
      lastInterstitialProvider: this.lastInterstitialProvider,
      isPlayingGame: this.isPlayingGame,
      interstitialQueued: this.interstitialQueued,
      isAdPlaying: this.isAdPlaying,
      comboStep: this.comboStep,
      comboCompletions: this.comboCompletions,
      modal: { ...this.modalState },
      appOpenTriggered: this.appOpenTriggered,
    };
  }

  public subscribe(listener: (state: AdServiceState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error("[AdService] Listener error:", e);
      }
    });
  }
}

export const adService = new AdService();
export default adService;
