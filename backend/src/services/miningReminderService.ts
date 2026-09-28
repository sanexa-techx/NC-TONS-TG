import { pool, prisma } from '../db/db.js';
import { MiningService } from './miningService.js';
import { notifyUserMiningPeriodEnded } from '../bot/notifications.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface MiningReminderStats {
  workerActive: boolean;
  intervalMs: number;
  lastCheckAt: Date | null;
  lastBatchSent: number;
  totalRemindersSent: number;
}

export class MiningReminderService {
  private static timer: NodeJS.Timeout | null = null;
  private static isProcessing = false;
  private static intervalMs = 60000; // Default check interval: 60 seconds
  private static lastCheckAt: Date | null = null;
  private static lastBatchSent = 0;
  private static totalRemindersSent = 0;

  /**
   * Scans for users whose mining period has expired and sends a private Telegram reminder
   */
  static async checkAndSendMiningReminders(): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    this.lastCheckAt = new Date();
    let sentCount = 0;

    try {
      // Find users whose battery is 0 or elapsed time >= remaining capacity
      const query = `
        SELECT id, first_name, username, power_percentage, power_capacity_hours, last_sync_at, ton_hashrate_per_sec
        FROM users
        WHERE (mining_reminder_sent IS FALSE OR mining_reminder_sent IS NULL)
          AND (
            power_percentage = 0
            OR (last_sync_at + ((power_percentage::float / 100.0) * (power_capacity_hours * 3600) * interval '1 second') <= NOW())
          )
        LIMIT 100
      `;

      const result = await pool.query(query);
      const eligibleUsers = result.rows || [];

      if (eligibleUsers.length > 0) {
        console.log(`[Mining Reminder Worker] Found ${eligibleUsers.length} user(s) with expired mining periods.`);
      }

      for (const row of eligibleUsers) {
        const userId = BigInt(row.id);
        const firstName = row.first_name || 'Miner';

        try {
          // 1. Sync mining balance to credit final accrued TON and lock battery at 0%
          let accruedTon = '0.000000';
          let currentTonBalance = '0.000000';

          try {
            const syncResult = await MiningService.syncMining(userId);
            accruedTon = syncResult.accruedTon;
            currentTonBalance = syncResult.tonBalance;
          } catch (syncErr: any) {
            console.warn(`[Mining Reminder Worker] Mining sync error for user ${userId}:`, syncErr.message);
          }

          // 2. Dispatch the Telegram direct message to the user
          await notifyUserMiningPeriodEnded(userId, firstName, accruedTon, currentTonBalance);

          // 3. Mark mining_reminder_sent = true to prevent duplicate reminders
          await prisma.user.update({
            where: { id: userId },
            data: {
              mining_reminder_sent: true,
              last_mining_reminder_at: new Date(),
            },
          });

          sentCount++;
          this.totalRemindersSent++;

          // Pacing delay between Telegram API calls (50ms ~ 20 msgs/sec max)
          await sleep(50);
        } catch (userErr: any) {
          console.error(`[Mining Reminder Worker] Failed to process user ${userId}:`, userErr.message);
          // Mark sent so one failing user doesn't block or loop endlessly
          try {
            await prisma.user.update({
              where: { id: userId },
              data: {
                mining_reminder_sent: true,
                last_mining_reminder_at: new Date(),
              },
            });
          } catch {
            // ignore
          }
        }
      }

      this.lastBatchSent = sentCount;
      if (sentCount > 0) {
        console.log(`[Mining Reminder Worker] Dispatched ${sentCount} mining reminder(s). Total sent: ${this.totalRemindersSent}`);
      }
    } catch (err: any) {
      console.error('[Mining Reminder Worker] Error during reminder scan:', err.message);
    } finally {
      this.isProcessing = false;
    }

    return sentCount;
  }

  /**
   * Starts the recurring background interval worker
   */
  static startMiningReminderWorker(intervalMs: number = 60000) {
    if (this.timer) {
      console.log('[Mining Reminder Worker] Worker is already active.');
      return;
    }

    this.intervalMs = intervalMs;
    console.log(`🚀 [Mining Reminder Worker] Started (Polling every ${intervalMs / 1000}s)`);

    // Run first check shortly after boot (5 seconds)
    setTimeout(() => {
      this.checkAndSendMiningReminders().catch((err) => {
        console.error('[Mining Reminder Worker] Initial scan error:', err);
      });
    }, 5000);

    // Recurring interval
    this.timer = setInterval(() => {
      this.checkAndSendMiningReminders().catch((err) => {
        console.error('[Mining Reminder Worker] Periodic scan error:', err);
      });
    }, intervalMs);
  }

  /**
   * Stops the background worker cleanly
   */
  static stopMiningReminderWorker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 [Mining Reminder Worker] Stopped background worker.');
    }
  }

  /**
   * Returns operational statistics of the reminder worker
   */
  static getStats(): MiningReminderStats {
    return {
      workerActive: this.timer !== null,
      intervalMs: this.intervalMs,
      lastCheckAt: this.lastCheckAt,
      lastBatchSent: this.lastBatchSent,
      totalRemindersSent: this.totalRemindersSent,
    };
  }
}
