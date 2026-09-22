import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../db/db.js';

export interface MiningSyncResult {
  userId: string;
  tonBalance: string;
  ncBalance: string;
  powerPercentage: number;
  powerCapacityHours: number;
  tonHashratePerSec: string;
  accruedTon: string;
  elapsedSeconds: number;
  activeSeconds: number;
  lastSyncAt: Date;
  isMiningActive: boolean;
}

export class MiningService {
  /**
   * Computes accrued TON and battery drain on-demand using time-delta logic
   */
  static async syncMining(userId: bigint): Promise<MiningSyncResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const lastSync = new Date(user.last_sync_at);
    const elapsedSeconds = Math.max(0, (now.getTime() - lastSync.getTime()) / 1000);

    const capacitySeconds = user.power_capacity_hours * 3600;
    // Percentage points drained per second
    const drainRatePerSec = 100 / capacitySeconds;

    // Time until battery hits 0%
    const currentPower = user.power_percentage;
    const secondsUntilDepleted = currentPower / drainRatePerSec;

    // Active mining seconds is bounded by elapsed time and remaining battery life
    const activeSeconds = Math.max(0, Math.min(elapsedSeconds, secondsUntilDepleted));

    // Calculate accrued TON
    const hashrate = Number(user.ton_hashrate_per_sec);
    const accruedTonNumber = activeSeconds * hashrate;
    const accruedTonDecimal = new Decimal(accruedTonNumber.toFixed(6));

    // Calculate updated power percentage (integer 0-100)
    const newPowerExact = Math.max(0, currentPower - (elapsedSeconds * drainRatePerSec));
    const newPowerPercentage = Math.round(newPowerExact);

    const updatedTonBalance = user.ton_balance.plus(accruedTonDecimal);

    // Save atomic update
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ton_balance: updatedTonBalance,
        power_percentage: newPowerPercentage,
        last_sync_at: now,
      },
    });

    return {
      userId: updatedUser.id.toString(),
      tonBalance: updatedUser.ton_balance.toFixed(6),
      ncBalance: updatedUser.nc_balance.toString(),
      powerPercentage: updatedUser.power_percentage,
      powerCapacityHours: updatedUser.power_capacity_hours,
      tonHashratePerSec: updatedUser.ton_hashrate_per_sec.toString(),
      accruedTon: accruedTonDecimal.toFixed(6),
      elapsedSeconds: Math.round(elapsedSeconds),
      activeSeconds: Math.round(activeSeconds),
      lastSyncAt: updatedUser.last_sync_at,
      isMiningActive: updatedUser.power_percentage > 0,
    };
  }

  /**
   * Recharges power grid to 100% using NC Coins or Rewarded Ads
   */
  static async rechargePower(userId: bigint, method: 'nc' | 'ad'): Promise<MiningSyncResult> {
    // First sync pending rewards before modifying power/time
    await this.syncMining(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const RECHARGE_NC_COST = 500n;

    if (method === 'nc') {
      if (user.nc_balance < RECHARGE_NC_COST) {
        throw new Error(`Insufficient NC Coins. Required: 500, Available: ${user.nc_balance}`);
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          nc_balance: { decrement: RECHARGE_NC_COST },
          power_percentage: 100,
          last_sync_at: new Date(),
        },
      });
    } else {
      // Rewarded Ad recharge (e.g. Adsgram)
      await prisma.user.update({
        where: { id: userId },
        data: {
          power_percentage: 100,
          last_sync_at: new Date(),
        },
      });
    }

    return this.syncMining(userId);
  }
}
