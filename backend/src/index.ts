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
import withdrawRouter from './routes/withdraw.js';
import { antiFraudCheck } from './middleware/antiFraud.js';
import {
  getRewardConfigs,
  updateRewardConfig,
  createAdminMission,
  updateAdminMission,
  getAdminStats,
  getDailyStreakConfigs,
  updateDailyStreakConfig,
  getReferralMilestones,
  updateReferralMilestone,
} from './controllers/adminController.js';
import {
  redeemPromo,
  getAdminPromos,
  createAdminPromo,
  toggleAdminPromo,
  deleteAdminPromo,
} from './controllers/promoController.js';
import { getOnlineStats, pingOnlineStatus } from './controllers/statsController.js';
import { getFriendStats, claimFriendRewards, claimMilestoneReward } from './controllers/friendsController.js';
import { getUserProfile, getAvatarProxy } from './controllers/profileController.js';
import dailyRouter from './routes/daily.js';
import proofTasksRouter from './routes/proofTasks.js';
import adsRouter from './routes/ads.js';
import gamesRouter from './routes/games.js';
import levelRouter from './routes/level.js';
import membershipRouter from './routes/membership.js';

// Telegraf Bot Lifecycle & Keep-Alive Service
import { initBotEngine, stopBotEngine, getBotState } from './bot/botLifecycle.js';
import { KeepAliveService } from './services/keepAliveService.js';

const app = express();

app.use(cors());
app.use(express.json());

// 24/7 Keep-Alive & Ping Endpoints (Compatible with @Roboxyzbot, Telegram ping bots, UptimeRobot)
app.all(['/', '/ping', '/api/ping', '/pong'], (req, res) => {
  const userAgent = req.headers['user-agent'] || 'Unknown Agent';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Log ping activity so user can verify ping bot in Render service logs
  console.log(`[Ping Bot] 📡 Ping received on '${req.path}' from ${userAgent} (${ip}) -> 200 OK`);

  const botState = getBotState();

  // Support plain text response if requested by certain ping bots
  if (req.headers.accept?.includes('text/plain') || req.query.format === 'text') {
    return res.status(200).send('PONG');
  }

  res.status(200).json({
    status: 'ok',
    alive: true,
    service: 'NC TONs Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    botMode: botState.mode,
    botUsername: botState.botUsername,
    timestamp: new Date().toISOString(),
    message: 'Backend is awake and active. Render sleep averted.',
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  const botState = getBotState();
  res.status(200).json({
    status: 'ok',
    service: 'NC TONs Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: ENV.NODE_ENV,
    botState,
    timestamp: new Date().toISOString(),
  });
});

// Keep-Alive Service telemetry & manual trigger
app.get('/api/keep-alive/stats', (req, res) => {
  res.json({
    keepAlive: KeepAliveService.getStats(),
    botState: getBotState(),
  });
});

app.post('/api/keep-alive/ping', async (req, res) => {
  const result = await KeepAliveService.pingNow();
  res.json(result);
});

// Anti-Fraud, Multi-Accounting & Device Fingerprint Engine
app.use('/api', antiFraudCheck);

// Authentication & Profile
app.post('/api/auth/verify', authMiddleware, verifyAuth);
app.get('/api/user/profile/:userId', authMiddleware, getUserProfile);
app.get('/api/user/profile', authMiddleware, getUserProfile);
app.get('/api/user/avatar/:userId', getAvatarProxy);

// Mining Operations
app.post('/api/mining/sync', authMiddleware, syncMining);
app.post('/api/mining/recharge', authMiddleware, rechargeMining);

// Mini-Game (Supports both /api/game and /api/games)
app.use('/api/games', gamesRouter);
app.use('/api/game', gamesRouter);

// Missions Marketplace
app.get('/api/missions/available', authMiddleware, getAvailableMissions);
app.post('/api/missions/start', authMiddleware, startMission);
app.post('/api/missions/claim', authMiddleware, claimMission);
app.post('/api/missions/create', authMiddleware, createMission);

// Withdrawals
app.use('/api/withdraw', withdrawRouter);

// Promo Codes
app.post('/api/promos/redeem', authMiddleware, redeemPromo);

// Referral System & Friends Hub
app.get('/api/friends/stats', authMiddleware, getFriendStats);
app.post('/api/friends/claim', authMiddleware, claimFriendRewards);
app.post('/api/friends/claim-milestone', authMiddleware, claimMilestoneReward);

// Daily Streak & Rewards
app.use('/api/daily', dailyRouter);

// Social Task Screenshot Verification
app.use('/api/proof', proofTasksRouter);

// Dual Ad Networks (Adsgram & Monetag)
app.use('/api/ads', adsRouter);

// Level & Rig Upgrade System
app.use('/api/level', levelRouter);

// Mandatory Channel & Group Gatekeeper
app.use('/api/membership', membershipRouter);

// Notion Workspace Integration
import notionRouter from './routes/notion.js';
app.use('/api/notion', notionRouter);

// Real-time Online Telemetry
app.get('/api/stats/online', getOnlineStats);
app.post('/api/stats/ping', pingOnlineStatus);

// Admin Routes (Protected by ADMIN_TELEGRAM_IDS)
app.get('/api/admin/config', authMiddleware, adminMiddleware, getRewardConfigs);
app.put('/api/admin/config', authMiddleware, adminMiddleware, updateRewardConfig);
app.get('/api/admin/daily-rewards', authMiddleware, adminMiddleware, getDailyStreakConfigs);
app.put('/api/admin/daily-rewards/:day', authMiddleware, adminMiddleware, updateDailyStreakConfig);
app.get('/api/admin/referral-milestones', authMiddleware, adminMiddleware, getReferralMilestones);
app.put('/api/admin/referral-milestones/:count', authMiddleware, adminMiddleware, updateReferralMilestone);
app.post('/api/admin/missions', authMiddleware, adminMiddleware, createAdminMission);
app.put('/api/admin/missions/:id', authMiddleware, adminMiddleware, updateAdminMission);
app.get('/api/admin/stats', authMiddleware, adminMiddleware, getAdminStats);

// Admin Promo Management
app.get('/api/admin/promos', authMiddleware, adminMiddleware, getAdminPromos);
app.post('/api/admin/promos', authMiddleware, adminMiddleware, createAdminPromo);
app.put('/api/admin/promos/:id/toggle', authMiddleware, adminMiddleware, toggleAdminPromo);
app.delete('/api/admin/promos/:id', authMiddleware, adminMiddleware, deleteAdminPromo);

// Mining Reminder Service & Admin Route
import { MiningReminderService } from './services/miningReminderService.js';
app.get('/api/admin/mining-reminders', authMiddleware, adminMiddleware, (req, res) => {
  return res.json(MiningReminderService.getStats());
});
app.post('/api/admin/mining-reminders/trigger', authMiddleware, adminMiddleware, async (req, res) => {
  const sent = await MiningReminderService.checkAndSendMiningReminders();
  return res.json({ success: true, sentCount: sent, stats: MiningReminderService.getStats() });
});

// Initialize DB and Bot
async function startServer() {
  await connectDB();

  // Start Mining Reminder Background Worker (polls every 60s)
  MiningReminderService.startMiningReminderWorker(60000);

  // Initialize Telegram Bot Engine (Registers webhook on Render or starts polling for dev)
  await initBotEngine(app);

  // Start Keep-Alive Worker (Self-pings public URL every 10 min to keep Render alive)
  KeepAliveService.startKeepAliveWorker();

  // Graceful stop
  process.once('SIGINT', () => {
    MiningReminderService.stopMiningReminderWorker();
    KeepAliveService.stopKeepAliveWorker();
    stopBotEngine('SIGINT');
  });
  process.once('SIGTERM', () => {
    MiningReminderService.stopMiningReminderWorker();
    KeepAliveService.stopKeepAliveWorker();
    stopBotEngine('SIGTERM');
  });

  app.listen(ENV.PORT, () => {
    console.log(`🚀 NC TONs Server listening on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
  });
}

startServer();

