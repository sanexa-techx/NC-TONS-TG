import { Request, Response } from 'express';
import { prisma, getIsPostgresConnected } from '../db/db.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Custom Error class to pass HTTP status codes out of transactions
 */
class PromoError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, PromoError.prototype);
  }
}

/**
 * User Redemption: POST /api/promos/redeem
 * Payload: { userId?: number, code: string }
 */
export async function redeemPromo(req: Request, res: Response) {
  try {
    const rawUserId = req.telegramUser?.id || req.body.userId;
    if (!rawUserId) {
      return res.status(400).json({ error: 'Missing userId', message: 'User identification is required' });
    }
    const userId = BigInt(rawUserId);

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invalid code', message: 'Promo code must be a non-empty string' });
    }

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return res.status(400).json({ error: 'Invalid code', message: 'Promo code cannot be empty' });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      let promo: any = null;

      // 1. Query promo_codes with row-level lock (FOR UPDATE) if PostgreSQL is active
      if (getIsPostgresConnected()) {
        const rows: any[] = await tx.$queryRaw`
          SELECT * FROM promo_codes WHERE code = ${cleanCode} FOR UPDATE;
        `;
        promo = rows[0] || null;
      } else {
        promo = await tx.promoCode.findUnique({
          where: { code: cleanCode },
        });
      }

      // 2. Return error 404 if code does not exist or is_active === FALSE
      if (!promo || !promo.is_active) {
        throw new PromoError('Invalid or inactive promo code', 404);
      }

      // 3. Return error 400 if max_claims !== null and claimed_count >= max_claims
      if (promo.max_claims !== null && promo.max_claims !== undefined && promo.claimed_count >= promo.max_claims) {
        throw new PromoError('Promo code claim limit has been reached', 400);
      }

      // 4. Query user_promo_claims for (user_id, promo_code_id)
      const existingClaim = await tx.userPromoClaim.findUnique({
        where: {
          unique_user_promo: {
            user_id: userId,
            promo_code_id: promo.id,
          },
        },
      });

      if (existingClaim) {
        throw new PromoError('Already redeemed', 400);
      }

      // 5. Insert record into user_promo_claims
      await tx.userPromoClaim.create({
        data: {
          user_id: userId,
          promo_code_id: promo.id,
        },
      });

      // 6. Increment claimed_count in promo_codes
      await tx.promoCode.update({
        where: { id: promo.id },
        data: {
          claimed_count: { increment: 1 },
        },
      });

      // 7. Atomically update user balance
      const tonRewardDecimal = promo.ton_reward instanceof Decimal
        ? promo.ton_reward
        : new Decimal(promo.ton_reward.toString());

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          nc_balance: { increment: BigInt(promo.nc_reward) },
          ton_balance: { increment: tonRewardDecimal },
        },
      });

      const tonFormatted = typeof promo.ton_reward === 'object' && promo.ton_reward?.toFixed
        ? promo.ton_reward.toFixed(6)
        : Number(promo.ton_reward).toFixed(6);

      const userTonFormatted = typeof updatedUser.ton_balance === 'object' && updatedUser.ton_balance?.toFixed
        ? updatedUser.ton_balance.toFixed(6)
        : Number(updatedUser.ton_balance).toFixed(6);

      return {
        success: true,
        reward: {
          nc: Number(promo.nc_reward),
          ton: tonFormatted,
        },
        newBalances: {
          nc_balance: updatedUser.nc_balance.toString(),
          ton_balance: userTonFormatted,
        },
      };
    });

    return res.json(result);
  } catch (err: any) {
    if (err instanceof PromoError) {
      return res.status(err.statusCode).json({
        error: err.message,
        message: err.message,
      });
    }
    // Handle Prisma unique constraint error
    if (err.code === 'P2002') {
      return res.status(400).json({
        error: 'Already redeemed',
        message: 'You have already redeemed this promo code',
      });
    }
    console.error('Promo redeem error:', err);
    return res.status(500).json({
      error: 'Redemption failed',
      message: err.message || 'An error occurred while redeeming promo code',
    });
  }
}

/**
 * Admin: GET /api/admin/promos
 * Retrieve all promo codes ordered by created_at DESC with usage statistics
 */
export async function getAdminPromos(req: Request, res: Response) {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { created_at: 'desc' },
    });

    const formatted = promos.map((p: any) => ({
      id: p.id,
      code: p.code,
      nc_reward: p.nc_reward,
      ton_reward: typeof p.ton_reward === 'object' && p.ton_reward?.toFixed
        ? p.ton_reward.toFixed(6)
        : Number(p.ton_reward).toFixed(6),
      max_claims: p.max_claims,
      claimed_count: p.claimed_count,
      is_active: p.is_active,
      created_at: p.created_at,
    }));

    return res.json({ promos: formatted });
  } catch (err: any) {
    console.error('Error fetching admin promos:', err);
    return res.status(500).json({ error: 'Failed to fetch promo codes', message: err.message });
  }
}

/**
 * Admin: POST /api/admin/promos
 * Payload: { code: string, ncReward: number, tonReward: number, maxClaims: number | null }
 */
export async function createAdminPromo(req: Request, res: Response) {
  try {
    const { code, ncReward, tonReward, maxClaims } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Validation error', message: 'Code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 3 || cleanCode.length > 32) {
      return res.status(400).json({ error: 'Validation error', message: 'Code must be between 3 and 32 characters' });
    }

    const nc = Number(ncReward);
    if (isNaN(nc) || nc < 0) {
      return res.status(400).json({ error: 'Validation error', message: 'Valid NC reward is required' });
    }

    const ton = Number(tonReward);
    if (isNaN(ton) || ton < 0) {
      return res.status(400).json({ error: 'Validation error', message: 'Valid TON reward is required' });
    }

    const parsedMaxClaims = maxClaims !== null && maxClaims !== undefined && maxClaims !== ''
      ? Math.max(1, Number(maxClaims))
      : null;

    // Check if code already exists
    const existing = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: `Promo code "${cleanCode}" already exists` });
    }

    const newPromo = await prisma.promoCode.create({
      data: {
        code: cleanCode,
        nc_reward: nc,
        ton_reward: new Decimal(ton.toFixed(6)),
        max_claims: parsedMaxClaims,
        claimed_count: 0,
        is_active: true,
      },
    });

    return res.status(201).json({
      success: true,
      promo: {
        id: newPromo.id,
        code: newPromo.code,
        nc_reward: newPromo.nc_reward,
        ton_reward: typeof newPromo.ton_reward === 'object' && newPromo.ton_reward?.toFixed
          ? newPromo.ton_reward.toFixed(6)
          : Number(newPromo.ton_reward).toFixed(6),
        max_claims: newPromo.max_claims,
        claimed_count: newPromo.claimed_count,
        is_active: newPromo.is_active,
        created_at: newPromo.created_at,
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict', message: 'Promo code already exists' });
    }
    console.error('Error creating promo code:', err);
    return res.status(500).json({ error: 'Failed to create promo code', message: err.message });
  }
}

/**
 * Admin: PUT /api/admin/promos/:id/toggle
 * Toggles is_active = NOT is_active
 */
export async function toggleAdminPromo(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID', message: 'Promo code ID must be a number' });
    }

    const existing = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Not found', message: 'Promo code not found' });
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        is_active: !existing.is_active,
      },
    });

    return res.json({
      success: true,
      id: updated.id,
      code: updated.code,
      is_active: updated.is_active,
    });
  } catch (err: any) {
    console.error('Error toggling promo code:', err);
    return res.status(500).json({ error: 'Failed to toggle promo code', message: err.message });
  }
}

/**
 * Admin: DELETE /api/admin/promos/:id
 * Removes promo code and cascades claim records
 */
export async function deleteAdminPromo(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID', message: 'Promo code ID must be a number' });
    }

    const existing = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Not found', message: 'Promo code not found' });
    }

    await prisma.promoCode.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: `Promo code "${existing.code}" deleted successfully`,
    });
  } catch (err: any) {
    console.error('Error deleting promo code:', err);
    return res.status(500).json({ error: 'Failed to delete promo code', message: err.message });
  }
}
