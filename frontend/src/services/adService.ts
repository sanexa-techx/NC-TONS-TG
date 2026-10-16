// src/services/adService.ts
// Comprehensive singleton multi-network ad engine with game protection,
// 60-second 1:1 alternating interstitials, 3-step missions combo lock,
// and 5-second Obsidian Glass fallback modal.

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
  comboStep: 1 | 2 | 3;
  comboCompletions: number;
  modal: AdModalState;
  appOpenTriggered: boolean;
}

declare global {
  interface Window {
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

class AdService {
  private lastInterstitialProvider: "monetag" | "gigapub" = "gigapub"; // So 1st interstitial is Monetag
  private secondsUntilNextInterstitial: number = INTERSTITIAL_CYCLE_SECONDS;
  private isPlayingGame: boolean = false;
  private interstitialQueued: boolean = false;
  private comboStep: 1 | 2 | 3 = 1;
  private comboCompletions: number = 0;
  private appOpenTriggered: boolean = false;
  private isInitialized: boolean = false;
  private timerId: any = null;
  private currentUserId: string = "";

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
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log("[AdService] Initializing global multi-network ad engine...");

    // 1. Initial App Open Trigger: 2 Seconds Delay -> First Interstitial from MONETAG
    if (!this.appOpenTriggered) {
      setTimeout(() => {
        if (!this.appOpenTriggered) {
          console.log("[AdService] Initial App Open (2s delay): Triggering MONETAG Interstitial...");
          this.triggerAppOpenInterstitial();
        }
      }, 2000);
    }

    // 2. Start Persistent 60-Second Alternating Loop
    if (!this.timerId && typeof window !== "undefined") {
      this.timerId = setInterval(() => this.tick(), 1000);
    }

    this.notify();
  }

  // --- TICK LOOP (Every 1 Second) ---
  private tick() {
    // 1. Modal Countdown
    if (this.modalState.isOpen && this.modalState.secondsLeft > 0) {
      this.modalState.secondsLeft -= 1;
      if (this.modalState.secondsLeft <= 0) {
        const onComplete = this.modalState.onComplete;
        this.modalState.isOpen = false;
        if (onComplete) onComplete();
      }
      this.notify();
    }

    // 2. Interstitial Countdown
    if (this.secondsUntilNextInterstitial > 0) {
      this.secondsUntilNextInterstitial -= 1;
      this.notify();
    } else {
      // Timer reached 0!
      if (this.isPlayingGame) {
        // GAMEPLAY AD PROTECTION: DO NOT show ad mid-game!
        if (!this.interstitialQueued) {
          console.log("[AdService] 60s timer reached 0 while game is active! Queueing interstitial for post-game.");
          this.interstitialQueued = true;
          this.notify();
        }
      } else {
        // Outside of game: trigger strictly alternating 1:1 interstitial
        this.secondsUntilNextInterstitial = INTERSTITIAL_CYCLE_SECONDS;
        this.triggerAlternatingInterstitial("timer_60s");
      }
    }
  }

  // --- SDK AVAILABILITY DETECTION ---
  public isSdkAvailable(provider: AdProvider): boolean {
    if (typeof window === "undefined") return false;

    if (provider === "monetag") {
      return (
        typeof window.show_11886350 === "function" ||
        typeof window.show_MONETAG_ZONE_ID === "function" ||
        typeof (window as any)[`show_${MONETAG_ZONE_ID}`] === "function" ||
        typeof (window as any).show_MONETAG === "function" ||
        typeof window.showMonetagInterstitial === "function"
      );
    }

    if (provider === "gigapub") {
      return (
        typeof window.showGiga === "function" ||
        (Boolean(window.Gigapub) &&
          (typeof window.Gigapub?.showRewarded === "function" ||
            typeof window.Gigapub?.showInterstitial === "function"))
      );
    }

    if (provider === "adsgram") {
      return (
        Boolean(window.Adsgram) &&
        typeof window.Adsgram?.init === "function"
      );
    }

    return false;
  }

  // --- SLEEK OBSIDIAN GLASS MODAL FALLBACK TRIGGER ---
  public showModalFallback(
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

  // --- CORE AD EXECUTION WITH SDK + SLEEK FALLBACK MODAL ---
  public async showAd(
    provider: AdProvider,
    type: AdType = "interstitial",
    rewardText?: string
  ): Promise<boolean> {
    console.log(`[AdService] Requesting ${type.toUpperCase()} from [${provider.toUpperCase()}]...`);

    // 1. If SDK is not loaded (dev / local / preview / adblocked), open 5s Obsidian Glass Modal
    if (!this.isSdkAvailable(provider)) {
      console.log(`[AdService] Real SDK for ${provider} not detected. Displaying Obsidian Glass fallback modal...`);
      return await this.showModalFallback(provider, rewardText);
    }

    // 2. Real SDK execution with timeout and fallback
    try {
      if (provider === "monetag") {
        const fn =
          window.show_11886350 ||
          window.show_MONETAG_ZONE_ID ||
          (window as any)[`show_${MONETAG_ZONE_ID}`] ||
          (window as any).show_MONETAG;

        if (typeof fn === "function") {
          try {
            await fn({ ymid: this.currentUserId || "miner" });
            return true;
          } catch (e) {
            console.warn("[AdService] Monetag standard format failed, attempting pop:", e);
            try {
              await fn("pop");
              return true;
            } catch (popErr) {
              console.warn("[AdService] Monetag pop error, falling back to modal:", popErr);
              return await this.showModalFallback(provider, rewardText);
            }
          }
        } else if (typeof window.showMonetagInterstitial === "function") {
          const res = await window.showMonetagInterstitial();
          return Boolean(res);
        }
      } else if (provider === "gigapub") {
        if (typeof window.showGiga === "function") {
          await window.showGiga("main");
          return true;
        } else if (window.Gigapub) {
          if (type === "rewarded" && typeof window.Gigapub.showRewarded === "function") {
            const res = await window.Gigapub.showRewarded();
            return Boolean(res);
          } else if (typeof window.Gigapub.showInterstitial === "function") {
            const res = await window.Gigapub.showInterstitial();
            return Boolean(res);
          }
        }
      } else if (provider === "adsgram") {
        if (window.Adsgram && typeof window.Adsgram.init === "function") {
          const ad = window.Adsgram.init({
            blockId: ADSGRAM_BLOCK_ID,
            userId: this.currentUserId,
          });
          const res = await ad.show();
          return Boolean(res?.done);
        }
      }
    } catch (sdkError) {
      console.warn(`[AdService] Real SDK execution for ${provider} failed, falling back to modal:`, sdkError);
      return await this.showModalFallback(provider, rewardText);
    }

    // Default fallback to ensure user never gets stuck
    return await this.showModalFallback(provider, rewardText);
  }

  // --- APP OPEN INTERSTITIAL (2s: MONETAG) ---
  public async triggerAppOpenInterstitial(): Promise<boolean> {
    this.appOpenTriggered = true;
    this.lastInterstitialProvider = "monetag";
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nc_last_tab_ad_provider", "monetag");
    }
    this.secondsUntilNextInterstitial = INTERSTITIAL_CYCLE_SECONDS;
    this.notify();

    console.log("[AdService] Playing App Open Interstitial (MONETAG)...");
    const res = await this.showAd("monetag", "interstitial", "Welcome to NC TONs Mining Rig");
    this.secondsUntilNextInterstitial = INTERSTITIAL_CYCLE_SECONDS;
    this.notify();
    return res;
  }

  // --- 1:1 STRICTLY ALTERNATING INTERSTITIAL ENGINE (MONETAG <-> GIGAPUB) ---
  public async triggerAlternatingInterstitial(reason: string = "manual"): Promise<boolean> {
    // If game is active and not a post-game trigger, block it!
    if (this.isPlayingGame && reason !== "game_end" && reason !== "game_queued") {
      console.log(`[AdService] Interstitial blocked (${reason}): Gameplay active!`);
      this.interstitialQueued = true;
      this.notify();
      return false;
    }

    // Determine 1:1 strictly alternating next provider:
    // Open (2s): Monetag -> 60s: Gigapub -> 120s: Monetag -> 180s: Gigapub...
    const next: "monetag" | "gigapub" =
      this.lastInterstitialProvider === "monetag" ? "gigapub" : "monetag";
    const fallback: "monetag" | "gigapub" =
      next === "monetag" ? "gigapub" : "monetag";

    console.log(
      `[AdService] 1:1 Interstitial (${reason}): Triggering ${next.toUpperCase()} (last was ${this.lastInterstitialProvider.toUpperCase()})`
    );

    let shown = false;
    try {
      shown = await this.showAd(next, "interstitial");
      if (shown) {
        this.lastInterstitialProvider = next;
      }
    } catch (e) {
      console.warn(`[AdService] ${next} interstitial failed, falling back to ${fallback}:`, e);
      try {
        shown = await this.showAd(fallback, "interstitial");
        if (shown) {
          this.lastInterstitialProvider = fallback;
        }
      } catch (fallbackErr) {
        console.warn("[AdService] Both providers failed for interstitial:", fallbackErr);
      }
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nc_last_tab_ad_provider", this.lastInterstitialProvider);
    }

    this.secondsUntilNextInterstitial = INTERSTITIAL_CYCLE_SECONDS;
    this.notify();
    return shown;
  }

  // --- GAMEPLAY AD PROTECTION ---
  public setIsPlayingGame(playing: boolean) {
    this.isPlayingGame = playing;
    console.log(`[AdService] Gameplay state changed: ${playing ? "PLAYING (Ads Protected)" : "IDLE"}`);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nc_game_mode_changed", { detail: { active: playing } }));
    }

    // If game ended and ad was queued, fire queued ad immediately
    if (!playing && this.interstitialQueued) {
      console.log("[AdService] Game ended with an interstitial queued! Firing queued ad now...");
      this.interstitialQueued = false;
      this.triggerAlternatingInterstitial("game_queued");
    }

    this.notify();
  }

  public getIsPlayingGame(): boolean {
    return this.isPlayingGame;
  }

  public onGameEnd(): Promise<boolean> {
    console.log("[AdService] onGameEnd called. Checking queued ads & triggering post-game ad...");
    this.isPlayingGame = false;
    const wasQueued = this.interstitialQueued;
    this.interstitialQueued = false;

    // Reset countdown from 60 seconds
    this.secondsUntilNextInterstitial = INTERSTITIAL_CYCLE_SECONDS;
    this.notify();

    // Trigger post-game interstitial (strictly alternating 1:1)
    return this.triggerAlternatingInterstitial(wasQueued ? "game_queued" : "game_end");
  }

  // --- MISSIONS TAB: MANDATORY 3-CATEGORY COMBO LOCK ---
  // Step 1: Watch MONETAG (Unlocked first). Completing locks Monetag and unlocks Step 2.
  // Step 2: Watch GIGAPUB (Locked until Step 1 done). Completing locks Gigapub and unlocks Step 3.
  // Step 3: Watch ADSGRAM (Locked until Step 2 done). Completing awards "+Combo Bonus" & resets to Step 1.
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

  // Reset combo back to Step 1
  public resetComboCycle() {
    this.comboStep = 1;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nc_ad_combo_step", "1");
    }
    this.notify();
  }

  // Dismiss fallback modal
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

// Export singleton
export const adService = new AdService();
export default adService;
