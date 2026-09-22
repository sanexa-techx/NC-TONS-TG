import { Request, Response } from 'express';
import { prisma } from '../db/db.js';
import { Decimal } from '@prisma/client/runtime/library';
import { sendWithdrawalApprovalCard } from '../bot/notifications.js';

export async function requestWithdrawal(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const { tonAddress, tonAmount } = req.body;

    if (!tonAddress || typeof tonAddress !== 'string' || tonAddress.length < 24) {
      return res.status(400).json({ error: 'Invalid TON wallet address' });
    }

    const amountNum = parseFloat(tonAmount);
    if (isNaN(amountNum) || amountNum < 0.01) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is 0.01 TON' });
    }

    const amountDecimal = new Decimal(amountNum.toFixed(4));

    // Check user balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.ton_balance.lessThan(amountDecimal)) {
      return res.status(400).json({
        error: `Insufficient TON balance. Available: ${user.ton_balance.toFixed(4)} TON, Requested: ${amountDecimal.toFixed(4)} TON`,
      });
    }

    // Freezes funds immediately and records pending withdrawal
    const withdrawal = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ton_balance: { decrement: amountDecimal },
        },
      });

      return tx.withdrawal.create({
        data: {
          user_id: userId,
          ton_address: tonAddress.trim(),
          ton_amount: amountDecimal,
          status: 'PENDING',
        },
      });
    });

    // Send interactive approval card to Admin Telegram Channel
    const channelMessageId = await sendWithdrawalApprovalCard(
      withdrawal.id,
      user.id,
      user.username,
      user.first_name,
      withdrawal.ton_address,
      withdrawal.ton_amount.toFixed(4)
    );

    if (channelMessageId) {
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { channel_message_id: channelMessageId },
      });
    }

    // Get fresh user balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    return res.json({
      success: true,
      message: 'Withdrawal request submitted for admin approval',
      withdrawal: {
        id: withdrawal.id,
        tonAddress: withdrawal.ton_address,
        tonAmount: withdrawal.ton_amount.toFixed(4),
        status: withdrawal.status,
        createdAt: withdrawal.created_at,
      },
      remainingBalance: updatedUser?.ton_balance.toFixed(6),
    });
  } catch (err) {
    console.error('Error requesting withdrawal:', err);
    return res.status(500).json({ error: 'Failed to process withdrawal request', message: (err as Error).message });
  }
}

export async function getWithdrawalHistory(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const history = await prisma.withdrawal.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return res.json({
      history: history.map((w) => ({
        id: w.id,
        tonAddress: w.ton_address,
        tonAmount: w.ton_amount.toFixed(4),
        status: w.status,
        createdAt: w.created_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching withdrawal history:', err);
    return res.status(500).json({ error: 'Failed to fetch withdrawal history', message: (err as Error).message });
  }
}
