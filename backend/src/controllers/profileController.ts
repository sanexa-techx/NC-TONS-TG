import { Request, Response } from 'express';
import { prisma } from '../db/db.js';
import { bot } from '../bot/telegrafInstance.js';
import { isAdmin } from '../config/env.js';

// Cache invalidation threshold: 24 hours
const AVATAR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generate a styled SVG fallback avatar with the user's initial
 */
function generateFallbackSvg(initial: string, name: string): string {
  const char = (initial || 'N').toUpperCase().slice(0, 1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F0FF" />
      <stop offset="50%" stop-color="#0098EA" />
      <stop offset="100%" stop-color="#7B2CBF" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="128" height="128" rx="64" fill="#0B132B" stroke="#00F0FF" stroke-width="3" filter="url(#glow)"/>
  <circle cx="64" cy="64" r="54" fill="url(#cyberGrad)" opacity="0.2" />
  <text x="64" y="78" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#00F0FF" text-anchor="middle" dominant-baseline="central">${char}</text>
</svg>`;
}

/**
 * GET /api/user/profile/:userId
 * Retrieves full user profile information and performs on-demand 24h cached avatar sync via Telegram Bot API
 */
export async function getUserProfile(req: Request, res: Response) {
  try {
    const rawUserId = req.params.userId || req.query.userId || req.telegramUser?.id;
    if (!rawUserId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const userId = BigInt(String(rawUserId).replace(/[^0-9]/g, ''));

    // Fetch user from DB
    let user: any = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // If requested by authenticated user who is not in DB yet
      if (req.telegramUser && req.telegramUser.id === userId) {
        user = await prisma.user.create({
          data: {
            id: userId,
            first_name: req.telegramUser.first_name,
            username: req.telegramUser.username || null,
            ton_balance: 0,
            nc_balance: 100,
            power_percentage: 100,
            power_capacity_hours: 8,
            ton_hashrate_per_sec: 0.00000100,
            photo_url: null,
            photo_synced_at: null,
            miner_level: 1,
          },
        });
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Check if Telegram Avatar needs sync (if never synced or older than 24h)
    const now = Date.now();
    const lastSynced = user.photo_synced_at ? new Date(user.photo_synced_at).getTime() : 0;
    const isExpired = now - lastSynced > AVATAR_CACHE_TTL_MS;

    if (isExpired && bot) {
      try {
        const photos = await bot.telegram.getUserProfilePhotos(Number(userId), 0, 1);
        if (photos && photos.total_count > 0 && photos.photos.length > 0) {
          const photoSizes = photos.photos[0];
          // Take the highest resolution photo available
          const bestPhoto = photoSizes[photoSizes.length - 1];
          const fileLink = await bot.telegram.getFileLink(bestPhoto.file_id);

          const updated = await prisma.user.update({
            where: { id: userId },
            data: {
              photo_url: fileLink.href,
              photo_synced_at: new Date(),
            },
          });
          user.photo_url = updated.photo_url;
          user.photo_synced_at = updated.photo_synced_at;
        } else {
          // No photo or privacy restricted - update timestamp to avoid re-querying continuously
          await prisma.user.update({
            where: { id: userId },
            data: {
              photo_synced_at: new Date(),
            },
          });
        }
      } catch (err: any) {
        console.warn(`[Avatar Sync] Could not fetch photos for user ${userId}:`, err?.message || err);
        // Set sync timestamp to throttle retries on error
        await prisma.user.update({
          where: { id: userId },
          data: {
            photo_synced_at: new Date(),
          },
        }).catch(() => {});
      }
    }

    return res.json({
      id: user.id.toString(),
      firstName: user.first_name,
      username: user.username,
      photoUrl: user.photo_url ? `/api/user/avatar/${user.id.toString()}` : null,
      minerLevel: user.miner_level || 1,
      tonBalance: user.ton_balance.toString(),
      ncBalance: user.nc_balance.toString(),
      powerPercentage: user.power_percentage,
      powerCapacityHours: user.power_capacity_hours || 8,
      referralCount: user.referral_count || 0,
      createdAt: user.created_at ? user.created_at.toISOString() : new Date().toISOString(),
      isAdmin: isAdmin(user.id),
    });
  } catch (err: any) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}

/**
 * GET /api/user/avatar/:userId
 * Secure image proxy that serves the cached Telegram profile photo without exposing BOT_TOKEN to the client
 */
export async function getAvatarProxy(req: Request, res: Response) {
  try {
    const rawUserId = req.params.userId;
    if (!rawUserId) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(generateFallbackSvg('?', 'Unknown'));
    }

    const userId = BigInt(String(rawUserId).replace(/[^0-9]/g, ''));

    const user: any = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        first_name: true,
        photo_url: true,
        photo_synced_at: true,
      },
    });

    const initial = user?.first_name?.charAt(0) || 'N';

    if (!user || !user.photo_url) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(generateFallbackSvg(initial, user?.first_name || 'NC Miner'));
    }

    // Fetch the image from Telegram's CDN server-side
    const response = await fetch(user.photo_url);
    if (!response.ok) {
      console.warn(`[Avatar Proxy] Upstream fetch returned ${response.status} for user ${userId}`);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(generateFallbackSvg(initial, user.first_name));
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // Cache for 24h
    return res.send(buffer);
  } catch (err: any) {
    console.error('Error in avatar proxy:', err);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(generateFallbackSvg('N', 'NC Miner'));
  }
}
