import { ENV, getEffectiveWebhookUrl } from '../config/env.js';

export interface KeepAliveStats {
  active: boolean;
  intervalMs: number;
  targetUrl: string | null;
  lastPingAt: Date | null;
  lastStatus: number | null;
  totalPings: number;
  lastError: string | null;
}

/**
 * Service to ping the public server URL periodically to prevent Render Free Tier from sleeping.
 * Render free web services spin down after 15 minutes of inactivity. Pinging /ping resets this timer.
 */
export class KeepAliveService {
  private static timer: NodeJS.Timeout | null = null;
  private static isProcessing = false;
  private static intervalMs = 10 * 60 * 1000; // 10 minutes (safely below Render's 15m idle sleep)
  private static lastPingAt: Date | null = null;
  private static lastStatus: number | null = null;
  private static totalPings = 0;
  private static lastError: string | null = null;

  /**
   * Resolves the target URL for the keep-alive ping
   */
  static getTargetUrl(): string | null {
    if (ENV.KEEP_ALIVE_URL) {
      return ENV.KEEP_ALIVE_URL;
    }

    const renderUrl = (process.env.RENDER_EXTERNAL_URL || ENV.RENDER_EXTERNAL_URL || '').trim();
    if (renderUrl) {
      const clean = renderUrl.replace(/\/+$/, '');
      return `${clean}/ping`;
    }

    const webhookUrl = getEffectiveWebhookUrl();
    if (webhookUrl) {
      try {
        const u = new URL(webhookUrl);
        u.pathname = '/ping';
        return u.toString();
      } catch {
        // ignore
      }
    }

    return null;
  }

  /**
   * Executes a single keep-alive ping
   */
  static async pingNow(): Promise<{ success: boolean; status?: number; error?: string }> {
    const target = this.getTargetUrl();
    if (!target) {
      return { success: false, error: 'No public URL configured for keep-alive ping' };
    }

    try {
      this.lastPingAt = new Date();
      const response = await fetch(target, {
        method: 'GET',
        headers: {
          'User-Agent': 'NC-TONs-KeepAlive-Worker/1.0',
          'Accept': 'application/json',
        },
      });

      this.lastStatus = response.status;
      this.lastError = null;
      this.totalPings++;

      console.log(`[Keep-Alive Worker] 💓 Pinged ${target} -> Status: ${response.status} OK (Render keep-alive active)`);
      return { success: response.ok, status: response.status };
    } catch (err: any) {
      this.lastError = err.message || 'Unknown network error';
      console.warn(`[Keep-Alive Worker] ⚠️ Ping warning for ${target}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Starts the keep-alive background worker
   */
  static startKeepAliveWorker(customIntervalMs?: number) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (!ENV.ENABLE_SELF_PING) {
      console.log('[Keep-Alive Worker] Self-ping is disabled via ENABLE_SELF_PING=false');
      return;
    }

    if (customIntervalMs && customIntervalMs > 0) {
      this.intervalMs = customIntervalMs;
    }

    const target = this.getTargetUrl();
    if (!target) {
      console.log('[Keep-Alive Worker] No external URL detected. Self-ping will be active once RENDER_EXTERNAL_URL or KEEP_ALIVE_URL is provided.');
      return;
    }

    console.log(`[Keep-Alive Worker] 🚀 Started keep-alive worker. Target: ${target} (every ${Math.round(this.intervalMs / 1000 / 60)} minutes)`);

    // Schedule periodic pings
    this.timer = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        await this.pingNow();
      } finally {
        this.isProcessing = false;
      }
    }, this.intervalMs);
  }

  /**
   * Stops the keep-alive background worker
   */
  static stopKeepAliveWorker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Keep-Alive Worker] 🛑 Keep-alive worker stopped.');
    }
  }

  /**
   * Telemetry stats
   */
  static getStats(): KeepAliveStats {
    return {
      active: this.timer !== null,
      intervalMs: this.intervalMs,
      targetUrl: this.getTargetUrl(),
      lastPingAt: this.lastPingAt,
      lastStatus: this.lastStatus,
      totalPings: this.totalPings,
      lastError: this.lastError,
    };
  }
}
