import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { connectDB } from './db/db.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { adminMiddleware } from './middleware/adminMiddleware.js';

// Controllers
import { verifyAuth } from './controllers/authController.js';
import { syncMining, rechargeMining } from './controllers/miningController.js';
import { startGame, finishGame } from './controllers/gameController.js';
import { getAvailableMissions, startMission, claimMission, createMission } from './controllers/missionController.js';
import { requestWithdrawal, getWithdrawalHistory } from './controllers/withdrawController.js';
import {
  getRewardConfigs,
  updateRewardConfig,
  createAdminMission,
  updateAdminMission,
  getAdminStats,
} from './controllers/adminController.js';
import {
  redeemPromo,
  getAdminPromos,
  createAdminPromo,
  toggleAdminPromo,
  deleteAdminPromo,
} from './controllers/promoController.js';
import { getOnlineStats, pingOnlineStatus } from './controllers/statsController.js';
import { getFriendStats, claimFriendRewards } from './controllers/friendsController.js';
import { getUserProfile, getAvatarProxy } from './controllers/profileController.js';
import dailyRouter from './routes/daily.js';
import proofTasksRouter from './routes/proofTasks.js';
import adsRouter from './routes/ads.js';

// Telegraf Bot
import { bot, registerMasterBotHandlers, setupBotCommands } from './bot/bot.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NC TONs Backend',
    timestamp: new Date().toISOString(),
  });
});

// Authentication & Profile
app.post('/api/auth/verify', authMiddleware, verifyAuth);
app.get('/api/user/profile/:userId', authMiddleware, getUserProfile);
app.get('/api/user/profile', authMiddleware, getUserProfile);
app.get('/api/user/avatar/:userId', getAvatarProxy);

// Mining Operations
app.post('/api/mining/sync', authMiddleware, syncMining);
app.post('/api/mining/recharge', authMiddleware, rechargeMining);

// Mini-Game
app.post('/api/game/start', authMiddleware, startGame);
app.post('/api/game/finish', authMiddleware, finishGame);

// Missions Marketplace
app.get('/api/missions/available', authMiddleware, getAvailableMissions);
app.post('/api/missions/start', authMiddleware, startMission);
app.post('/api/missions/claim', authMiddleware, claimMission);
app.post('/api/missions/create', authMiddleware, createMission);

// Withdrawals
app.post('/api/withdraw/request', authMiddleware, requestWithdrawal);
app.get('/api/withdraw/history', authMiddleware, getWithdrawalHistory);

// Promo Codes
app.post('/api/promos/redeem', authMiddleware, redeemPromo);

// Referral System & Friends Hub
app.get('/api/friends/stats', authMiddleware, getFriendStats);
app.post('/api/friends/claim', authMiddleware, claimFriendRewards);

// Daily Streak & Rewards
app.use('/api/daily', dailyRouter);

// Social Task Screenshot Verification
app.use('/api/proof', proofTasksRouter);

// Dual Ad Networks (Adsgram & Monetag)
app.use('/api/ads', adsRouter);

// Notion Workspace Integration
import notionRouter from './routes/notion.js';
app.use('/api/notion', notionRouter);

// Real-time Online Telemetry
app.get('/api/stats/online', getOnlineStats);
app.post('/api/stats/ping', pingOnlineStatus);

// Admin Routes (Protected by ADMIN_TELEGRAM_IDS)
app.get('/api/admin/config', authMiddleware, adminMiddleware, getRewardConfigs);
app.put('/api/admin/config', authMiddleware, adminMiddleware, updateRewardConfig);
app.post('/api/admin/missions', authMiddleware, adminMiddleware, createAdminMission);
app.put('/api/admin/missions/:id', authMiddleware, adminMiddleware, updateAdminMission);
app.get('/api/admin/stats', authMiddleware, adminMiddleware, getAdminStats);

// Admin Promo Management
app.get('/api/admin/promos', authMiddleware, adminMiddleware, getAdminPromos);
app.post('/api/admin/promos', authMiddleware, adminMiddleware, createAdminPromo);
app.put('/api/admin/promos/:id/toggle', authMiddleware, adminMiddleware, toggleAdminPromo);
app.delete('/api/admin/promos/:id', authMiddleware, adminMiddleware, deleteAdminPromo);

// Initialize DB and Bot
async function startServer() {
  await connectDB();

  if (bot) {
    registerMasterBotHandlers(bot);
    await setupBotCommands(bot);

    bot.launch({ dropPendingUpdates: true })
      .then(() => {
        console.log('🤖 Telegram Bot polling started successfully');
      })
      .catch((err) => {
        console.warn('⚠️ Telegram Bot could not start polling:', err.message);
      });

    // Graceful stop
    process.once('SIGINT', () => bot?.stop('SIGINT'));
    process.once('SIGTERM', () => bot?.stop('SIGTERM'));
  }

  app.listen(ENV.PORT, () => {
    console.log(`🚀 NC TONs Server listening on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
  });
}

startServer();
