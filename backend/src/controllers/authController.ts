import { Request, Response } from 'express';
import { prisma } from '../db/db.js';
import { MiningService } from '../services/miningService.js';
import { isAdmin } from '../config/env.js';
import { bot } from '../bot/telegrafInstance.js';

export async function verifyAuth(req: Request, res: Response) {
  try {
    const telegramUser = req.telegramUser;
    if (!telegramUser) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    const userId = telegramUser.id;
    const incomingPhotoUrl = req.body?.photoUrl || telegramUser.photo_url || null;

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          first_name: telegramUser.first_name,
          username: telegramUser.username || null,
          ton_balance: 0,
          nc_balance: 100, // New user bonus
          power_percentage: 100,
          power_capacity_hours: 8,
          ton_hashrate_per_sec: 0.00000100,
          photo_url: incomingPhotoUrl,
          photo_synced_at: incomingPhotoUrl ? new Date() : null,
        },
      });
    } else {
      // Update photo if provided by Telegram client or if user changed photo
      let photoToUpdate = incomingPhotoUrl;
      if (!photoToUpdate && !user.photo_url && bot) {
        try {
          const photos = await bot.telegram.getUserProfilePhotos(Number(userId), 0, 1);
          if (photos && photos.total_count > 0 && photos.photos.length > 0) {
            const photoSizes = photos.photos[0];
            const bestPhoto = photoSizes[photoSizes.length - 1];
            const fileLink = await bot.telegram.getFileLink(bestPhoto.file_id);
            photoToUpdate = fileLink.href;
          }
        } catch (e) {
          // ignore bot fetch error
        }
      }

      if (photoToUpdate && photoToUpdate !== user.photo_url) {
        user = await prisma.user.update({
          where: { id: userId },
          data: {
            photo_url: photoToUpdate,
            photo_synced_at: new Date(),
          },
        });
      }
    }

    // Sync mining state to get fresh balances
    const miningState = await MiningService.syncMining(userId);

    const activePhoto = user.photo_url || incomingPhotoUrl || null;

    return res.json({
      user: {
        id: user.id.toString(),
        firstName: user.first_name,
        username: user.username,
        photoUrl: activePhoto ? (activePhoto.startsWith('http') ? activePhoto : `/api/user/avatar/${user.id.toString()}`) : null,
        minerLevel: user.miner_level || 1,
        isAdmin: isAdmin(userId),
      },
      mining: miningState,
    });
  } catch (err) {
    console.error('Error in auth verify:', err);
    return res.status(500).json({ error: 'Internal server error', message: (err as Error).message });
  }
}
