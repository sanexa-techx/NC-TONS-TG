import { useState, useEffect } from 'react';
import {
  Pickaxe,
  Gamepad2,
  CheckCircle2,
  Users,
  Wallet,
  Zap,
  Flame,
  ShieldCheck,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Trophy,
  Play,
  Gift,
  AlertTriangle,
  Layers,
  Smartphone,
  Info,
  Tv,
  X,
  Share2,
  TrendingUp,
  Tag,
  Lock,
  Camera,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  showSmartRewardedAd,
  triggerAlternatingInterstitial,
  calculateTierReward,
  getAdManagerStats,
  setGameActiveState,
  isGameActive,
} from '../services/smartAdManager.js';

export type ScreenTab = 'mining' | 'arcade' | 'missions' | 'friends' | 'wallet';

interface MissionItem {
  id: number;
  title: string;
  category: 'telegram' | 'social' | 'partner';
  ncReward: number;
  tonReward: number;
  completed: boolean;
  link?: string;
}

export function UIShowcase() {
  const [activeTab, setActiveTab] = useState<ScreenTab>('mining');
  const [viewMode, setViewMode] = useState<'single' | 'studio'>('single');

  // Balances
  const [ncBalance, setNcBalance] = useState(179500);
  const [tonBalance, setTonBalance] = useState(0.40);
  const [walletTonBalance, setWalletTonBalance] = useState(23.374);
  const [walletNcBalance, setWalletNcBalance] = useState(50000);

  // Mining Battery Timer ("05:14:12 LEFT")
  const [batterySeconds, setBatterySeconds] = useState(5 * 3600 + 14 * 60 + 12);
  const [isMiningActive, setIsMiningActive] = useState(true);
  const [batteryProgress, setBatteryProgress] = useState(66);
  const [minerLevel, setMinerLevel] = useState(1);
  const [minedNcCount, setMinedNcCount] = useState(63601);

  // 15s Dwell Timer
  const [dwellSeconds, setDwellSeconds] = useState(11);
  const [dwellActive, setDwellActive] = useState(false);
  const [dwellCompleted, setDwellCompleted] = useState(false);

  // Ad Stats & State
  const [adStats, setAdStats] = useState(getAdManagerStats());
  const [dailyBreakCount, setDailyBreakCount] = useState(12);
  const [adLoading, setAdLoading] = useState(false);
  const [activeNotification, setActiveNotification] = useState<{
    type: 'reward' | 'interstitial' | 'info' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Friends Captcha & Commission State
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaSelected, setCaptchaSelected] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [friendCommissionTon, setFriendCommissionTon] = useState(1.25);
  const [claimedCommission, setClaimedCommission] = useState(false);

  // Wallet Verification Gate (0.05 TON)
  const [isAccountVerified, setIsAccountVerified] = useState<boolean>(false);
  const [isPayingFee, setIsPayingFee] = useState<boolean>(false);
  const [adminReceiverWallet] = useState<string>('UQC7H_l-uAuupnB1tplVxMCKeImLbv1vzJhKnVDDJyg9V97v');

  // Color Tube Sort visual state & In-Game Mode
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [tubePoured, setTubePoured] = useState(false);
  const [tubeColors, setTubeColors] = useState([
    ['bg-emerald-400', 'bg-blue-500', 'bg-amber-400', 'bg-purple-500'],
    ['bg-blue-500', 'bg-emerald-400', 'bg-cyan-400', 'bg-blue-500'],
    ['bg-amber-400', 'bg-purple-500', 'bg-emerald-400', 'bg-cyan-400'],
    ['bg-transparent', 'bg-transparent', 'bg-transparent', 'bg-transparent'],
  ]);

  // Active Mini-Game Modal State
  const [activeGameModal, setActiveGameModal] = useState<'tube_sort' | 'memory' | 'car_race' | null>(null);

  // Wallet State & Modals
  const [walletAddress, setWalletAddress] = useState('UQD-1VqX4bF-8VfR8zL4wR9Yv9_6xK7uP4bT2hQ9wY7eN8mK');
  const [withdrawAmount, setWithdrawAmount] = useState('0.0500');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoRedeemed, setPromoRedeemed] = useState(false);

  // Mining Modals
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [dailyStreakClaimed, setDailyStreakClaimed] = useState(false);

  // Missions Category & List
  const [missionCategory, setMissionCategory] = useState<'all' | 'telegram' | 'social' | 'partner'>('all');
  const [missionsList, setMissionsList] = useState<MissionItem[]>([
    {
      id: 1,
      title: 'Join Official NC TONs Community Channel',
      category: 'telegram',
      ncReward: 2500,
      tonReward: 0.005,
      completed: false,
    },
    {
      id: 2,
      title: 'Follow NC TONs Ecosystem on X (Twitter)',
      category: 'social',
      ncReward: 1500,
      tonReward: 0.002,
      completed: false,
    },
    {
      id: 3,
      title: 'Explore Partner Web3 DeFi Exchange',
      category: 'partner',
      ncReward: 2000,
      tonReward: 0.004,
      completed: false,
    },
    {
      id: 4,
      title: 'Join Telegram Discussion & News Squad',
      category: 'telegram',
      ncReward: 1800,
      tonReward: 0.003,
      completed: true,
    },
  ]);

  // Countdown clock effect for 8H battery
  useEffect(() => {
    const timer = setInterval(() => {
      setBatterySeconds((prev) => {
        if (prev <= 0) return 8 * 3600;
        return prev - 1;
      });
      if (isMiningActive) {
        setMinedNcCount((prev) => prev + 1);
      }
      setAdStats(getAdManagerStats());
    }, 1000);
    return () => clearInterval(timer);
  }, [isMiningActive]);

  // 15s Dwell timer effect
  useEffect(() => {
    let dwellInterval: any = null;
    if (dwellActive && dwellSeconds > 0) {
      dwellInterval = setInterval(() => {
        setDwellSeconds((prev) => {
          if (prev <= 1) {
            setDwellActive(false);
            setDwellCompleted(true);
            setNcBalance((b) => b + 250);
            setWalletNcBalance((b) => b + 250);
            triggerCelebration();
            showToast('reward', 'Dwell Partner Completed!', '+250 NC credited for visiting 15s partner link.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (dwellInterval) clearInterval(dwellInterval);
    };
  }, [dwellActive, dwellSeconds]);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#10B981', '#2563EB', '#F59E0B', '#38BDF8'],
      });
    } catch {}
  };

  const formatTimer = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const showToast = (type: 'reward' | 'interstitial' | 'info' | 'error', title: string, message: string) => {
    setActiveNotification({ type, title, message });
    setTimeout(() => {
      setActiveNotification(null);
    }, 4500);
  };

  // Rewarded Ad Waterfall (Monetag -> Gigapub -> Adsgram)
  const handleWatchRewardedAd = async () => {
    setAdLoading(true);
    try {
      const res = await showSmartRewardedAd(false);
      setAdLoading(false);
      if (res.success && res.reward) {
        setNcBalance((b) => b + res.reward!.nc);
        setWalletNcBalance((b) => b + res.reward!.nc);
        setTonBalance((b) => Number((b + res.reward!.ton).toFixed(4)));
        setWalletTonBalance((b) => Number((b + res.reward!.ton).toFixed(4)));
        setAdStats(getAdManagerStats());
        triggerCelebration();
        showToast(
          'reward',
          `Rewarded Ad Completed (${res.provider})!`,
          `Tier: ${res.reward.tier} • +${res.reward.nc} NC${res.reward.ton > 0 ? ` • +${res.reward.ton} TON` : ''}${res.reward.fuelBoost ? ' • ⚡ Fuel Boost Active' : ''}`
        );
      } else {
        showToast('info', 'Ad Waterfall Status', res.reason || 'Cooldown active or no fill');
      }
    } catch (e: any) {
      setAdLoading(false);
      showToast('error', 'Ad Error', e.message || 'Failed to display ad');
    }
  };

  // 60-Second Automatic Interstitial Loop (Monetag -> 60s -> Gigapub -> 60s -> Monetag...)
  // Pauses strictly during active game mode!
  // When user finishes a game, an ad shows immediately and resets the 60s timer.
  useEffect(() => {
    const timer = setInterval(async () => {
      // Do not trigger while in Game Mode
      if (isGameActive() || activeGameModal !== null) {
        return;
      }
      const res = await triggerAlternatingInterstitial(false);
      if (res.shown) {
        setAdStats(getAdManagerStats());
        showToast(
          'interstitial',
          `60s Interstitial Ad [${res.provider}]`,
          `Sequence: ${res.provider}. Next auto ad in 60s (${res.provider === 'MONETAG' ? 'GIGAPUB' : 'MONETAG'}).`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeGameModal]);

  // Tab Switch with 1:1 Alternating Interstitial
  const handleTabChange = async (tab: ScreenTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      await handleTriggerInterstitial(`Tab switch to ${tab.toUpperCase()}`);
    }
  };

  // 1:1 Alternating Interstitial Ad Trigger (Monetag <-> Gigapub)
  const handleTriggerInterstitial = async (actionSource: string, force = false) => {
    try {
      const res = await triggerAlternatingInterstitial(force);
      if (res.shown) {
        setAdStats(getAdManagerStats());
        showToast(
          'interstitial',
          `Interstitial Ad [${res.provider}]`,
          `Shown via ${actionSource}. Next rotation will show ${res.provider === 'MONETAG' ? 'GIGAPUB' : 'MONETAG'} in 60s.`
        );
      } else if (!force) {
        showToast('info', 'Interstitial Status', `${actionSource}. (${res.reason})`);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // Claim Mining Rewards
  const handleClaimMining = async () => {
    const claimNc = 1500;
    const claimTon = 0.002;
    setNcBalance((b) => b + claimNc);
    setWalletNcBalance((b) => b + claimNc);
    setTonBalance((b) => Number((b + claimTon).toFixed(4)));
    setBatteryProgress(66);
    setBatterySeconds(5 * 3600 + 14 * 60 + 12);
    triggerCelebration();
    showToast('reward', 'Mining Rewards Claimed!', `+${claimNc} NC and +${claimTon} TON added.`);
    await handleTriggerInterstitial('Claim Mining Rewards');
  };

  // Miner Level Upgrade
  const handleUpgradeMinerLevel = () => {
    const upgradeCost = 10000;
    if (ncBalance < upgradeCost) {
      showToast('error', 'Insufficient NC', `You need ${upgradeCost.toLocaleString()} NC to upgrade to Level ${minerLevel + 1}.`);
      return;
    }
    setNcBalance((b) => b - upgradeCost);
    setWalletNcBalance((b) => Math.max(0, b - upgradeCost));
    setMinerLevel((l) => l + 1);
    triggerCelebration();
    showToast('reward', `Miner Level Upgraded! (Level ${minerLevel + 1})`, `Mining speed increased to +${(0.5 + (minerLevel + 1) * 0.1).toFixed(3)}M NC / hr.`);
  };

  // Daily Streak Claim
  const handleClaimDailyStreak = () => {
    if (dailyStreakClaimed) return;
    const streakRewardNc = 5000;
    const streakRewardTon = 0.005;
    setNcBalance((b) => b + streakRewardNc);
    setWalletNcBalance((b) => b + streakRewardNc);
    setTonBalance((b) => Number((b + streakRewardTon).toFixed(4)));
    setDailyStreakClaimed(true);
    setStreakModalOpen(false);
    triggerCelebration();
    showToast('reward', 'Day 4 Streak Claimed! 🔥', `+${streakRewardNc.toLocaleString()} NC and +${streakRewardTon} TON added to vault.`);
  };

  // Daily Limit Break via Waterfall
  const handleBreakDailyLimit = async () => {
    setAdLoading(true);
    const res = await showSmartRewardedAd(true);
    setAdLoading(false);
    if (res.success && res.reward) {
      setDailyBreakCount((c) => Math.min(30, c + 1));
      setNcBalance((b) => b + res.reward!.nc);
      setWalletNcBalance((b) => b + res.reward!.nc);
      setAdStats(getAdManagerStats());
      triggerCelebration();
      showToast(
        'reward',
        `Quota Break Progress (${dailyBreakCount + 1}/30)!`,
        `Watched ${res.provider} ad. +${res.reward.nc} NC earned.`
      );
    } else {
      showToast('info', 'Notice', res.reason || 'Ad network busy');
    }
  };

  // Promo Code Redeem
  const handleRedeemPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (promoRedeemed) {
      showToast('info', 'Already Redeemed', 'You have already redeemed your promo code.');
      return;
    }
    if (code === 'NCTON2026' || code === 'AIRDROP' || code === 'BOOST') {
      const promoNc = 10000;
      const promoTon = 0.05;
      setNcBalance((b) => b + promoNc);
      setWalletNcBalance((b) => b + promoNc);
      setTonBalance((b) => Number((b + promoTon).toFixed(4)));
      setWalletTonBalance((b) => Number((b + promoTon).toFixed(4)));
      setPromoRedeemed(true);
      setPromoCodeInput('');
      triggerCelebration();
      showToast('reward', 'Promo Code Applied! 🎉', `+${promoNc.toLocaleString()} NC and +${promoTon} TON added!`);
    } else {
      showToast('error', 'Invalid Code', 'Try promo code "NCTON2026" or "BOOST".');
    }
  };

  // Captcha selection
  const handleCaptchaClick = (emoji: string) => {
    setCaptchaSelected(emoji);
    if (emoji === '🚀') {
      setCaptchaVerified(true);
      setNcBalance((b) => b + 500);
      setWalletNcBalance((b) => b + 500);
      triggerCelebration();
      showToast('reward', 'Captcha Verified! 🚀', 'Human session confirmed. +500 NC referral bonus added.');
    } else {
      showToast('error', 'Wrong Emoji', 'Please choose the 🚀 Rocket to verify human session.');
    }
  };

  // Claim Friend Commission
  const handleClaimCommission = () => {
    if (claimedCommission || friendCommissionTon <= 0) return;
    setTonBalance((b) => Number((b + friendCommissionTon).toFixed(4)));
    setWalletTonBalance((b) => Number((b + friendCommissionTon).toFixed(4)));
    setClaimedCommission(true);
    setFriendCommissionTon(0);
    triggerCelebration();
    showToast('reward', 'Commission Claimed! 💎', '+1.25 TON added directly to your vault balance.');
  };

  // Complete Mission
  const handleCompleteMission = (missionId: number) => {
    const target = missionsList.find((m) => m.id === missionId);
    if (!target || target.completed) return;
    setMissionsList((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, completed: true } : m))
    );
    setNcBalance((b) => b + target.ncReward);
    setWalletNcBalance((b) => b + target.ncReward);
    setTonBalance((b) => Number((b + target.tonReward).toFixed(4)));
    setWalletTonBalance((b) => Number((b + target.tonReward).toFixed(4)));
    triggerCelebration();
    showToast('reward', 'Mission Completed! 🎯', `+${target.ncReward.toLocaleString()} NC and +${target.tonReward} TON claimed.`);
  };

  // Simulate or execute 0.05 TON Verification
  const handlePay005TonFee = () => {
    setIsPayingFee(true);
    setTimeout(() => {
      setIsPayingFee(false);
      setIsAccountVerified(true);
      triggerCelebration();
      showToast(
        'reward',
        '0.05 TON Verified! 💎',
        `Transferred 50,000,000 nanotons to admin ${adminReceiverWallet.slice(0, 6)}... Withdrawal locks permanently removed!`
      );
    }, 1200);
  };

  // ==========================================
  // SCREEN 1: MINING (HOME)
  // ==========================================
  const renderMiningScreen = () => (
    <div className="space-y-3.5">
      {/* Top Header with Dual-Currency Glowing Pills */}
      <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-2xl shadow-black/70">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-white tracking-tight text-base truncate">NC TONs</span>
            <button
              onClick={() => setIsMiningActive((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold btn-mint-glass shrink-0 cursor-pointer"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMiningActive ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]' : 'bg-slate-500'}`}></span>
              {isMiningActive ? 'LIVE RIG' : 'PAUSED'}
            </button>
          </div>
          <button
            onClick={() => setStreakModalOpen(true)}
            className="text-[10px] font-bold btn-amber-glass px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <Trophy className="w-3 h-3 text-amber-300" />
            Day 4 Streak
          </button>
        </div>

        {/* Dual-Currency Balance Pills */}
        <div className="grid grid-cols-2 gap-2">
          {/* Amber Gold Glass NC Pill */}
          <div className="btn-amber-glass rounded-xl px-3 py-2 min-w-0 flex flex-col justify-center">
            <p className="text-[9px] uppercase font-bold text-amber-300/90 tracking-wider">NC Coins</p>
            <p className="text-sm font-black text-amber-100 font-mono truncate drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              +{ncBalance.toLocaleString()} NC
            </p>
          </div>

          {/* Cobalt Blue Glass TON Pill */}
          <div className="btn-cobalt-glass rounded-xl px-3 py-2 min-w-0 flex flex-col justify-center">
            <p className="text-[9px] uppercase font-bold text-blue-300/90 tracking-wider">TON Vault</p>
            <p className="text-sm font-black text-blue-100 font-mono truncate drop-shadow-[0_0_10px_rgba(37,99,235,0.6)]">
              {tonBalance.toFixed(2)} TON
            </p>
          </div>
        </div>
      </div>

      {/* Central 8H MINING BATTERY Card */}
      <div className="obsidian-card rounded-2xl p-4 border border-white/10 shadow-2xl shadow-black/70 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
              <Zap className="w-4 h-4 fill-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-white uppercase tracking-wider truncate">
                8H Mining Battery
              </h2>
              <p className="text-[10px] text-slate-400 truncate">Autonomous Rig • Level {minerLevel}</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono btn-mint-glass shrink-0">
            {batteryProgress}% CHARGED
          </span>
        </div>

        {/* 3D Translucent Glass Battery Cylinder filled to 66% with Glowing Neon-Mint Liquid */}
        <div className="relative w-full mb-3 flex items-center">
          {/* Outer Glass Cylinder */}
          <div className="relative flex-1 h-8 bg-slate-950/70 rounded-full border border-white/20 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] backdrop-blur-md overflow-hidden">
            {/* Top Specular Sheen Reflection */}
            <div className="absolute inset-x-2 top-0.5 h-2.5 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none z-10" />

            {/* Glowing Neon-Mint Liquid Fill (66%) */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#10B981] shadow-[0_0_18px_rgba(16,185,129,0.6)] transition-all duration-700 relative overflow-hidden flex items-center justify-end pr-2"
              style={{ width: `${batteryProgress}%` }}
            >
              {/* Internal pulsing liquid bubbles */}
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              <span className="text-[9px] font-mono font-black text-slate-950 relative z-10 tracking-tight">
                {batteryProgress}%
              </span>
            </div>
          </div>

          {/* Battery Positive Terminal Node */}
          <div className="w-2 h-4 rounded-r-md bg-slate-700 border border-white/20 -ml-0.5 shadow-sm shrink-0" />
        </div>

        {/* Neon-Mint Digital Countdown Banner */}
        <div className="mb-3.5 p-2 rounded-xl bg-slate-950/60 border border-emerald-500/30 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Time Remaining</span>
          </div>
          <span className="font-mono font-black text-emerald-300 text-xs tracking-wider drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]">
            {formatTimer(batterySeconds)} LEFT
          </span>
        </div>

        {/* 3 Smoked-Glass Metric Sub-Cards */}
        <div className="grid grid-cols-3 gap-2 mb-3.5">
          <div className="btn-smoked-glass rounded-xl p-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">OUTPUT</p>
            <p className="text-[11px] font-black text-emerald-300 font-mono mt-0.5 truncate drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]">
              +0.50M
            </p>
          </div>
          <div className="btn-smoked-glass rounded-xl p-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">MINED</p>
            <p className="text-[11px] font-black text-amber-300 font-mono mt-0.5 truncate drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
              {minedNcCount.toLocaleString()}
            </p>
          </div>
          <div className="btn-smoked-glass rounded-xl p-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">BOOST</p>
            <p className="text-[11px] font-black text-blue-300 font-mono mt-0.5 truncate drop-shadow-[0_0_6px_rgba(37,99,235,0.4)]">
              x1.5
            </p>
          </div>
        </div>

        {/* Full-width glowing Amber Gold ACTIVATE BOOST button stacked above full-width glowing Cobalt Blue CLAIM REWARDS */}
        <div className="space-y-2">
          <button
            onClick={() => setRechargeModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl btn-amber-glass font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(245,158,11,0.3)] active:scale-[0.98]"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
            <span>⚡ ACTIVATE BOOST</span>
          </button>

          <button
            onClick={handleClaimMining}
            className="w-full py-2.5 px-4 rounded-xl btn-cobalt-glass font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-[0.98]"
          >
            <Gift className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            <span>💎 CLAIM REWARDS</span>
          </button>
        </div>
      </div>

      {/* Miner Level Upgrade Card */}
      <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              Miner Rig Level {minerLevel}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              Next: Level {minerLevel + 1} (+0.100M NC/hr)
            </p>
          </div>
        </div>
        <button
          onClick={handleUpgradeMinerLevel}
          className="py-1.5 px-3 rounded-xl btn-cobalt-glass font-black text-[10px] uppercase tracking-wider shrink-0 cursor-pointer"
        >
          Upgrade (10K NC)
        </button>
      </div>

      {/* 7-Day Mining Streak Card */}
      <div
        onClick={() => setStreakModalOpen(true)}
        className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl cursor-pointer hover:border-blue-400/40 transition-colors"
      >
        <div className="flex items-center justify-between mb-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200 truncate">Daily Login Streak</span>
          </div>
          <span className="text-[10px] font-bold btn-mint-glass px-2 py-0.5 rounded-full shrink-0">
            {dailyStreakClaimed ? '✓ Claimed Today' : 'Day 4 Active (+5,000 NC)'}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 pt-1">
          {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((day, idx) => (
            <div
              key={day}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-center border backdrop-blur-md ${
                idx < 3 || (idx === 3 && dailyStreakClaimed)
                  ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
                  : idx === 3
                  ? 'btn-cobalt-glass text-white shadow-xs animate-pulse font-bold'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <span className="text-[9px] font-bold">{day}</span>
              <span className="text-[8px] font-mono mt-0.5">
                {idx < 3 || (idx === 3 && dailyStreakClaimed) ? '✓' : idx === 3 ? 'TODAY' : `+${(idx + 1) * 2}K`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // SCREEN 2: ARCADE HUB
  // ==========================================
  const renderArcadeScreen = () => (
    <div className="space-y-3.5">
      {/* Arcade Header */}
      <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-white tracking-tight truncate">NC Arcade Hub</h2>
          <p className="text-[11px] text-slate-400 truncate">Play Web3 games & earn dual tokens</p>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[11px] font-bold flex items-center gap-1 shrink-0 backdrop-blur-md shadow-[0_0_12px_rgba(168,85,247,0.3)]">
          <Gamepad2 className="w-3.5 h-3.5 text-purple-300" />
          <span>4 Games Ready</span>
        </div>
      </div>

      {/* Featured Smoked-Glass Card: COLOR TUBE SORT */}
      <div className="obsidian-card rounded-2xl p-4 border border-white/10 shadow-2xl shadow-black/80 relative overflow-hidden">
        {/* Ambient Top Light Reflection */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 min-w-0">
          <div className="min-w-0">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider btn-mint-glass inline-block">
              Featured Arcade
            </span>
            <h3 className="text-base font-black text-white mt-1.5 truncate tracking-tight">
              COLOR TUBE SORT
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {tubePoured
                ? 'Liquid poured! Tap tubes to sort colors'
                : 'Sort glowing neon liquids into matching test tubes'}
            </p>
          </div>
          <span className="text-[10px] font-mono font-black btn-mint-glass px-2.5 py-1 rounded-xl shrink-0">
            +1,200 NC / LVL
          </span>
        </div>

        {/* 4 Glossy Translucent Glass Test Tubes with Dynamic Glowing Liquid Layers */}
        <div className="bg-slate-950/70 rounded-2xl p-3.5 border border-white/10 flex items-center justify-around my-3.5 shadow-inner backdrop-blur-xl">
          {tubeColors.map((tubeLayers, tIdx) => {
            const isSelected = selectedTube === tIdx;
            return (
              <div
                key={tIdx}
                onClick={() => {
                  if (selectedTube === null) {
                    setSelectedTube(tIdx);
                    showToast('info', `Tube #${tIdx + 1} Selected`, 'Tap destination tube to pour liquid layer.');
                  } else if (selectedTube === tIdx) {
                    setSelectedTube(null);
                  } else {
                    const source = [...tubeColors[selectedTube]];
                    const dest = [...tubeColors[tIdx]];
                    const topSrcIdx = source.findIndex((c) => c !== 'bg-transparent');
                    const destEmptyIdx = dest.lastIndexOf('bg-transparent');

                    if (topSrcIdx !== -1 && destEmptyIdx !== -1) {
                      const colorToMove = source[topSrcIdx];
                      source[topSrcIdx] = 'bg-transparent';
                      dest[destEmptyIdx] = colorToMove;

                      const nextTubes = [...tubeColors];
                      nextTubes[selectedTube] = source;
                      nextTubes[tIdx] = dest;
                      setTubeColors(nextTubes);
                      setTubePoured(true);
                      setSelectedTube(null);
                      showToast('reward', 'Liquid Poured! 🧪', 'Layer sorted. Keep matching tubes.');
                    } else {
                      setSelectedTube(null);
                    }
                  }
                }}
                className={`cursor-pointer transition-all duration-200 flex flex-col items-center ${
                  isSelected ? '-translate-y-2 scale-105' : 'hover:-translate-y-1'
                }`}
              >
                {/* Tube Rim with Specular Glass Light */}
                <div className="w-8 h-1.5 border border-white/30 rounded-t-sm bg-white/20 shadow-xs" />
                {/* 3D Glass Tube Cylinder */}
                <div
                  className={`w-7 h-24 border-2 border-t-0 rounded-b-2xl p-0.5 flex flex-col justify-end gap-0.5 backdrop-blur-md relative overflow-hidden transition-all ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                      : 'border-white/25 bg-slate-900/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]'
                  }`}
                >
                  {/* Vertical Light Refraction Specular Sheen */}
                  <div className="absolute top-0 bottom-0 left-1 w-0.5 bg-white/25 pointer-events-none rounded-full" />

                  {tubeLayers.map((color, cIdx) => (
                    <div
                      key={cIdx}
                      className={`h-4 rounded-sm transition-all duration-300 relative ${color} ${
                        color !== 'bg-transparent'
                          ? 'opacity-95 shadow-[0_0_8px_currentColor]'
                          : ''
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-slate-400 mt-1.5 font-bold">Tube {tIdx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Full-Width Glowing Neo-Mint Play Button */}
        <button
          onClick={() => {
            setGameActiveState(true);
            setActiveGameModal('tube_sort');
          }}
          className="w-full py-2.5 rounded-xl btn-mint-glass font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.35)] active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 fill-emerald-300 text-emerald-300" />
          <span>▶ PLAY COLOR TUBE SORT</span>
        </button>
      </div>

      {/* 2-Column Frosted Glass Grid: Memory Matrix & Cyber Car Race */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Memory Matrix */}
        <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 mb-2 shrink-0 shadow-[0_0_12px_rgba(37,99,235,0.3)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black text-white truncate">Memory Matrix</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">Sequence recall challenge</p>
            <div className="mt-1.5 text-[9px] font-bold text-blue-300 bg-blue-500/15 border border-blue-400/30 px-2 py-0.5 rounded-md inline-block truncate">
              +500 NC / +0.001 TON
            </div>
          </div>
          <button
            onClick={() => {
              setGameActiveState(true);
              setActiveGameModal('memory');
            }}
            className="mt-3 w-full py-2 rounded-xl btn-mint-glass font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3 fill-emerald-300 text-emerald-300" />
            <span>▶ Play</span>
          </button>
        </div>

        {/* Cyber Car Race */}
        <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 mb-2 shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <Flame className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black text-white truncate">Cyber Car Race</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">Traffic evasion speed run</p>
            <div className="mt-1.5 text-[9px] font-bold text-purple-300 bg-purple-500/15 border border-purple-400/30 px-2 py-0.5 rounded-md inline-block truncate">
              +750 NC + Boost
            </div>
          </div>
          <button
            onClick={() => {
              setGameActiveState(true);
              setActiveGameModal('car_race');
            }}
            className="mt-3 w-full py-2 rounded-xl btn-mint-glass font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3 fill-emerald-300 text-emerald-300" />
            <span>▶ Play</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // SCREEN 3: MISSIONS & ADS
  // ==========================================
  const renderMissionsScreen = () => {
    const totalWatched = adStats.totalWatched;
    const currentTier = calculateTierReward(totalWatched + 1);

    const filteredMissions =
      missionCategory === 'all'
        ? missionsList
        : missionsList.filter((m) => m.category === missionCategory);

    return (
      <div className="space-y-3.5">
        {/* Missions Header */}
        <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white tracking-tight truncate">
              Missions &amp; Ad Hub
            </h2>
            <p className="text-[11px] text-slate-400 truncate">High CPM multi-network monetization</p>
          </div>
          <div className="px-2.5 py-1 rounded-xl btn-cobalt-glass text-[11px] font-mono font-bold shrink-0">
            {totalWatched}/200 TODAY
          </div>
        </div>

        {/* 15-SECOND ACTIVE PARTNER LINK Card with Glowing Neo-Mint Progress Pill */}
        <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-white uppercase truncate">
                  Active Partner Link
                </h3>
                <p className="text-[10px] text-slate-400 truncate">Visit partner dApp for 15s dwell</p>
              </div>
            </div>

            {/* Glowing Neo-Mint Progress Pill: "15s • 11s LEFT" */}
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black btn-mint-glass shrink-0 shadow-[0_0_18px_rgba(16,185,129,0.35)]">
              {dwellCompleted ? '✓ CLAIMED (+250)' : dwellActive ? `15s • ${dwellSeconds}s LEFT` : '15s • 11s LEFT'}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10">
            <span className="text-[11px] font-bold text-emerald-400">+250 NC Reward</span>
            <button
              disabled={dwellCompleted || dwellActive}
              onClick={() => {
                setDwellActive(true);
                showToast('info', 'Dwell Timer Started', 'Stay on page 15s to claim rewards.');
              }}
              className="py-1.5 px-3 rounded-xl btn-cobalt-glass disabled:opacity-50 text-[11px] font-bold cursor-pointer"
            >
              {dwellCompleted ? 'Completed' : dwellActive ? 'Visiting...' : 'Open Partner'}
            </button>
          </div>
        </div>

        {/* WATCH ADS Card with 3D Icons & Provider Rows */}
        <div className="obsidian-card rounded-2xl p-4 border border-white/10 shadow-2xl shadow-black/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Dark Glass 3D Camera/Clapperboard Icon */}
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/15 text-slate-200 flex items-center justify-center shrink-0 backdrop-blur-md shadow-inner">
                <Camera className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-white uppercase truncate">
                  Watch Ads (200 Daily Waterfall)
                </h3>
                <p className="text-[10px] text-slate-400 truncate">Priority Ad Network Routing</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-300 btn-smoked-glass px-2 py-0.5 rounded-lg shrink-0">
              {totalWatched} / 200
            </span>
          </div>

          {/* 3-Column Bottom Row of Glowing Neon-Bordered Pills: TIER 1 (Neo-Mint), TIER 2 (Cobalt Blue), TIER 3 (Smoked Slate) */}
          <div className="grid grid-cols-3 gap-1.5 my-3">
            <div
              className={`p-2 rounded-xl text-center transition-all min-w-0 ${
                totalWatched <= 20
                  ? 'btn-mint-glass'
                  : 'btn-smoked-glass opacity-60'
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-tight truncate">TIER 1 (ADS 1-20)</p>
              <p className="text-[9px] font-bold mt-0.5 truncate">NC + Full TON</p>
            </div>
            <div
              className={`p-2 rounded-xl text-center transition-all min-w-0 ${
                totalWatched > 20 && totalWatched <= 50
                  ? 'btn-cobalt-glass'
                  : 'btn-smoked-glass opacity-60'
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-tight truncate">TIER 2 (ADS 21-50)</p>
              <p className="text-[9px] font-bold mt-0.5 truncate">NC + 50% TON</p>
            </div>
            <div
              className={`p-2 rounded-xl text-center transition-all min-w-0 ${
                totalWatched > 50
                  ? 'btn-smoked-glass border-white/40 text-white'
                  : 'btn-smoked-glass opacity-60'
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-tight truncate">TIER 3 (ADS 51+)</p>
              <p className="text-[9px] font-bold mt-0.5 truncate">NC Only (Fuel)</p>
            </div>
          </div>

          {/* Smoked-Glass Provider Rows with Frosted [ Watch ] Buttons */}
          <div className="space-y-2 bg-slate-950/70 rounded-xl p-2.5 border border-white/10 my-2.5 backdrop-blur-md">
            {/* MONETAG Row */}
            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#10B981]" />
                <span className="font-bold text-white text-[11px] truncate">MONETAG</span>
                <span className="text-[9px] text-slate-400 font-mono shrink-0">(98.4%)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[10px] text-slate-400">
                  {adStats.counts.monetag}/{adStats.dailyCaps.monetag}
                </span>
                <button
                  onClick={handleWatchRewardedAd}
                  className="btn-smoked-glass px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  [ Watch ]
                </button>
              </div>
            </div>

            {/* GIGAPUB Row */}
            <div className="flex items-center justify-between text-xs py-1 border-t border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_#3B82F6]" />
                <span className="font-bold text-white text-[11px] truncate">GIGAPUB</span>
                <span className="text-[9px] text-slate-400 font-mono shrink-0">(94.1%)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[10px] text-slate-400">
                  {adStats.counts.gigapub}/{adStats.dailyCaps.gigapub}
                </span>
                <button
                  onClick={handleWatchRewardedAd}
                  className="btn-smoked-glass px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  [ Watch ]
                </button>
              </div>
            </div>

            {/* ADSGRAM Row */}
            <div className="flex items-center justify-between text-xs py-1 border-t border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0 shadow-[0_0_6px_#A855F7]" />
                <span className="font-bold text-white text-[11px] truncate">ADSGRAM</span>
                <span className="text-[9px] text-slate-400 font-mono shrink-0">(89.2%)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[10px] text-slate-400">
                  {adStats.counts.adsgram}/{adStats.dailyCaps.adsgram}
                </span>
                <button
                  onClick={handleWatchRewardedAd}
                  className="btn-smoked-glass px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  [ Watch ]
                </button>
              </div>
            </div>
          </div>

          {/* Full Waterfall Trigger Button */}
          <div className="pt-1">
            <button
              disabled={adLoading}
              onClick={handleWatchRewardedAd}
              className="w-full py-2.5 rounded-xl btn-mint-glass font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(16,185,129,0.35)] cursor-pointer"
            >
              {adLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                  <span>Loading Ad Waterfall...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-emerald-300 text-emerald-300" />
                  <span>Watch Rewarded Ad (+{currentTier.nc} NC)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 60-SECOND INTERSTITIAL WATERFALL CARD */}
        <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-400/40 text-blue-300 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  60s Interstitial Waterfall
                </h4>
                <p className="text-[10px] text-slate-400">
                  Monetag ⇄ Gigapub (Alternates every 60s)
                </p>
              </div>
            </div>
            {isGameActive() || activeGameModal !== null ? (
              <span className="px-2 py-0.5 rounded-full btn-amber-glass text-[9px] font-mono font-bold text-amber-200">
                🎮 GAME MODE (PAUSED)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full btn-mint-glass text-[9px] font-mono font-bold text-emerald-200">
                ACTIVE • {adStats.interstitialCooldownLeft > 0 ? `${adStats.interstitialCooldownLeft}s LEFT` : 'READY'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
            <span className="text-slate-300">
              Next In Rotation: <strong className="text-blue-300 font-mono">{(typeof localStorage !== 'undefined' && localStorage.getItem('nc_last_tab_ad_provider') === 'monetag') ? 'GIGAPUB' : 'MONETAG'}</strong>
            </span>
            <button
              onClick={() => handleTriggerInterstitial('Manual Test', true)}
              className="px-2.5 py-1 rounded-lg btn-cobalt-glass text-[10px] font-black uppercase tracking-wider cursor-pointer"
            >
              ⚡ Test Interstitial
            </button>
          </div>
        </div>

        {/* Task / Missions List */}
        <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-black text-white uppercase">Community Tasks</h4>
            <div className="flex gap-1">
              {(['all', 'telegram', 'social', 'partner'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMissionCategory(cat)}
                  className={`text-[9px] px-2 py-0.5 rounded-full capitalize font-bold transition-all cursor-pointer ${
                    missionCategory === cat
                      ? 'btn-cobalt-glass'
                      : 'btn-smoked-glass text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredMissions.map((mission) => (
              <div
                key={mission.id}
                className="p-2.5 rounded-xl border border-white/10 bg-slate-950/60 flex items-center justify-between gap-2 backdrop-blur-md"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{mission.title}</p>
                  <p className="text-[9px] font-mono text-emerald-400 mt-0.5">
                    +{mission.ncReward.toLocaleString()} NC • +{mission.tonReward} TON
                  </p>
                </div>
                <button
                  disabled={mission.completed}
                  onClick={() => handleCompleteMission(mission.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                    mission.completed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : 'btn-cobalt-glass'
                  }`}
                >
                  {mission.completed ? 'Claimed ✓' : 'Start'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // SCREEN 4: SQUAD REFERRALS
  // ==========================================
  const renderFriendsScreen = () => (
    <div className="space-y-3.5">
      {/* Frosted Referral Gate Card with Glowing Pills */}
      <div className="obsidian-card rounded-2xl p-4 border border-white/10 shadow-2xl shadow-black/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Glowing Neo-Mint "✓ HUMAN VERIFIED ONLY" Badge */}
            <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold btn-mint-glass shadow-[0_0_18px_rgba(16,185,129,0.35)] shrink-0">
              ✓ HUMAN VERIFIED ONLY
            </span>
            {/* Glowing Cobalt "INVITE ONLY" Badge */}
            <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold btn-cobalt-glass shadow-[0_0_20px_rgba(37,99,235,0.4)] shrink-0">
              INVITE ONLY
            </span>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[8px] text-slate-400 uppercase font-bold">Unclaimed</p>
            <p className="text-xs font-black text-blue-300 font-mono">
              +{friendCommissionTon.toFixed(2)} TON
            </p>
          </div>
        </div>

        <h2 className="text-sm font-black text-white tracking-tight mb-3">
          Squad Referral Engine
        </h2>

        {/* Full-width glowing Cobalt Blue "+ INVITE FRIENDS ON TELEGRAM" Button */}
        <button
          onClick={() => {
            const text = '⚡ Mine real TON & NC Coins on NC TONs! Join with my link:';
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/NC_TONs_Bot?start=ref_81920')}&text=${encodeURIComponent(text)}`;
            window.open(shareUrl, '_blank');
            showToast('info', 'Opening Telegram', 'Sharing referral invitation...');
          }}
          className="w-full py-2.5 rounded-xl btn-cobalt-glass font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-[0.98]"
        >
          <Share2 className="w-3.5 h-3.5 shrink-0" />
          <span>+ INVITE FRIENDS ON TELEGRAM</span>
        </button>

        <div className="mt-2.5 flex items-center justify-between text-xs bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-white/10">
          <span className="text-slate-400 truncate font-mono text-[10px]">
            https://t.me/NC_TONs_Bot?start=ref_81920
          </span>
          <button
            onClick={() => {
              setCopiedLink(true);
              navigator.clipboard?.writeText('https://t.me/NC_TONs_Bot?start=ref_81920');
              showToast('info', 'Copied', 'Referral link copied to clipboard!');
              setTimeout(() => setCopiedLink(false), 2500);
            }}
            className="text-blue-300 hover:text-blue-200 font-bold flex items-center gap-1 shrink-0 ml-1.5 text-[11px] cursor-pointer"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedLink ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Frosted ANTI-BOT VERIFICATION CAPTCHA Card */}
      <div className="obsidian-card rounded-2xl p-4 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">
              Anti-Bot Verification Captcha
            </h3>
          </div>
          <span
            className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
              captchaVerified
                ? 'btn-mint-glass text-emerald-300'
                : 'btn-amber-glass text-amber-300'
            }`}
          >
            {captchaVerified ? '✓ VERIFIED' : 'PENDING'}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mb-3">
          Select the <strong className="text-white">🚀 Rocket</strong> icon to verify human session:
        </p>

        {/* 5 Backlit Smoked-Glass Emoji Buttons */}
        <div className="grid grid-cols-5 gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
          {['💎', '🚀', '⚡', '🍀', '🪙'].map((emoji) => {
            const isChosen = captchaSelected === emoji;
            return (
              <button
                key={emoji}
                onClick={() => handleCaptchaClick(emoji)}
                className={`h-11 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                  isChosen
                    ? emoji === '🚀'
                      ? 'btn-mint-glass scale-105 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)]'
                      : 'card-crimson-glass scale-95'
                    : 'btn-smoked-glass hover:bg-white/10 active:scale-95'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Claim Commission Action */}
      {friendCommissionTon > 0 && !claimedCommission && (
        <div className="btn-cobalt-glass rounded-2xl p-3.5 border border-blue-400/80 shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Pending Referral Commission</p>
            <p className="text-[10px] text-blue-200 font-mono">You have +1.25 TON ready to collect</p>
          </div>
          <button
            onClick={handleClaimCommission}
            className="py-1.5 px-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
          >
            Claim Commission
          </button>
        </div>
      )}

      {/* Smoked-Glass Referral List Rows with Neon-Mint Checkmarks */}
      <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl">
        <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">
          Verified Friends
        </h4>
        <div className="divide-y divide-white/5 max-h-36 overflow-y-auto pr-1">
          {[
            { name: 'Alex M.', handle: '@alex_ton', rate: '+0.45 TON', status: 'Active', verified: true },
            { name: 'Sophia K.', handle: '@sophia_web3', rate: '+0.38 TON', status: 'Active', verified: true },
            { name: 'David R.', handle: '@david_crypto', rate: '+0.42 TON', status: 'Active', verified: true },
          ].map((f, i) => (
            <div key={i} className="py-2 flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-bold text-[11px] text-slate-200 shrink-0">
                  {f.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{f.name}</p>
                    {f.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[9px] text-slate-400 truncate">{f.handle}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-mono font-bold text-blue-300">{f.rate}</p>
                <p className="text-[9px] text-emerald-400 font-semibold">{f.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // SCREEN 5: WALLET & QUOTA
  // ==========================================
  const renderWalletScreen = () => (
    <div className="space-y-3.5">
      {/* Top Full-Width Glowing Amber Gold Bar ("+0.050M NC") */}
      <div className="w-full btn-amber-glass rounded-2xl p-3.5 border border-amber-400/70 shadow-[0_0_18px_rgba(245,158,11,0.3)] backdrop-blur-md flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase font-bold text-amber-300 tracking-wider">Mining Fuel Supply</p>
          <div className="text-xl font-black font-mono text-amber-100 tracking-tight mt-0.5 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">
            +{(walletNcBalance / 1000000).toFixed(3)}M <span className="text-xs text-amber-300">NC</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
          <Zap className="w-4 h-4 fill-amber-300" />
        </div>
      </div>

      {/* Stacked Above Glowing Cobalt Blue Bar ("23.374 TON") with 3D Blue Diamond Accent */}
      <div className="w-full btn-cobalt-glass rounded-2xl p-3.5 border border-blue-400/80 shadow-[0_0_20px_rgba(37,99,235,0.4)] backdrop-blur-md flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">Withdrawable Real TON</p>
          <div className="text-xl font-black font-mono text-blue-100 tracking-tight mt-0.5 drop-shadow-[0_0_12px_rgba(37,99,235,0.7)] flex items-center gap-1.5">
            <span>{walletTonBalance.toFixed(3)}</span>
            <span className="text-xs text-blue-300">TON</span>
          </div>
        </div>
        {/* 3D Blue Diamond Accent */}
        <div className="w-9 h-9 rounded-2xl bg-blue-600/30 border border-blue-400 flex items-center justify-center shadow-[0_0_16px_rgba(37,99,235,0.6)] animate-pulse">
          <span className="text-lg">💎</span>
        </div>
      </div>

      {/* Frosted ACCOUNT VERIFICATION Card */}
      <div className="obsidian-card rounded-2xl p-4 border border-white/10 shadow-2xl shadow-black/80">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2.5">
            {/* Dark Translucent Glass Padlock & Safe Visuals */}
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-400/40 text-blue-300 flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.35)] shrink-0">
              {isAccountVerified ? <ShieldCheck size={18} className="text-emerald-400" /> : <Lock size={18} />}
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Account Verification
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">
                {isAccountVerified ? 'Withdrawals Unlocked' : 'Anti-bot Security Gate'}
              </p>
            </div>
          </div>

          {/* Smoked-Glass "Required: 0.05 TON" Pill Badge */}
          {isAccountVerified ? (
            <span className="px-2.5 py-1 rounded-full btn-mint-glass text-[10px] font-extrabold font-mono shadow-[0_0_14px_rgba(16,185,129,0.35)]">
              ✓ Verified
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full btn-smoked-glass text-amber-300 text-[10px] font-extrabold font-mono border border-white/15">
              Required: 0.05 TON
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
          To prevent bot syndicates and authenticate non-custodial wallet ownership, a one-time network fee of{' '}
          <strong className="text-blue-300 font-mono font-bold">0.05 TON (50,000,000 nanotons)</strong> is required to unlock payouts to{' '}
          <span className="font-mono text-slate-400 text-[10px]">{adminReceiverWallet.slice(0, 6)}...{adminReceiverWallet.slice(-4)}</span>.
        </p>

        {/* Prominent Glowing Cobalt Blue "💎 PAY 0.05 TON & UNLOCK WALLET" Button */}
        <button
          onClick={handlePay005TonFee}
          disabled={isPayingFee || isAccountVerified}
          className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${
            isAccountVerified
              ? 'btn-mint-glass cursor-default opacity-90'
              : 'btn-cobalt-glass cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)]'
          }`}
        >
          {isPayingFee ? (
            <span>Broadcasting &amp; Verifying BOC...</span>
          ) : isAccountVerified ? (
            <span>✓ Verified • Withdrawals Unlocked</span>
          ) : (
            <span>💎 PAY 0.05 TON &amp; UNLOCK WALLET</span>
          )}
        </button>
      </div>

      {/* Crimson Frosted Glass "⚠️ Daily Limit Hit! (12/30)" Container */}
      <div className="card-crimson-glass rounded-2xl p-4 border border-red-500/50 shadow-[0_0_18px_rgba(239,68,68,0.2)]">
        <div className="flex items-start gap-2.5 mb-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-[11px] font-black text-red-200 uppercase tracking-wide truncate">
              ⚠️ Daily Limit Hit! ({dailyBreakCount}/30)
            </h4>
            <p className="text-[10px] text-red-300/90 mt-0.5">
              Daily quota reached (1/1). Watch 30 ads to break daily limit or wait for midnight reset.
            </p>
          </div>
        </div>

        {/* Glowing Red Progress Bar */}
        <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden border border-red-500/30 p-0.5 mb-2">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
            style={{ width: `${(dailyBreakCount / 30) * 100}%` }}
          />
        </div>

        {/* Quota Break Action Button */}
        <div className="flex items-center justify-between mb-3 bg-red-950/40 p-2 rounded-xl border border-red-500/20">
          <span className="text-[10px] text-red-200 font-mono font-medium">Break Limit via Smart Ad:</span>
          <button
            onClick={handleBreakDailyLimit}
            disabled={adLoading || dailyBreakCount >= 30}
            className="px-2.5 py-1 rounded-lg btn-amber-glass text-[10px] font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {adLoading ? 'Loading Ad...' : '⚡ Break Limit (+1)'}
          </button>
        </div>

        {/* Dark Translucent Glass Input Fields: Address & Amount */}
        <div className="space-y-2 mb-3">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">
              Destination TON Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter TON Wallet Address..."
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                Withdraw Amount (TON)
              </label>
              <span className="text-[9px] text-blue-300 font-mono">Bal: {walletTonBalance.toFixed(3)} TON</span>
            </div>
            <input
              type="text"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0.0500"
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        {/* Smoked-Glass "🔒 Withdraw TON Now" Button that Transforms into Glowing Cobalt Blue once isVerified */}
        <button
          onClick={() => {
            if (!isAccountVerified) {
              showToast('error', 'Verification Required', 'Complete the 0.05 TON verification above to unlock payouts.');
            } else {
              triggerCelebration();
              showToast('reward', 'Withdrawal Sent!', `Withdrew ${withdrawAmount} TON to ${walletAddress.slice(0, 8)}...`);
            }
          }}
          disabled={!isAccountVerified}
          className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            !isAccountVerified
              ? 'btn-smoked-glass text-slate-400 cursor-not-allowed opacity-80'
              : 'btn-cobalt-glass cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)]'
          }`}
        >
          {!isAccountVerified ? (
            <>
              <Lock size={14} />
              <span>🔒 Withdraw TON Now (Locked)</span>
            </>
          ) : (
            <>
              <Wallet size={14} />
              <span>Withdraw TON Now</span>
            </>
          )}
        </button>
      </div>

      {/* Redeem Promo Card */}
      <div className="obsidian-card rounded-2xl p-3.5 border border-white/10 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Redeem Promo Code
          </h4>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value)}
            placeholder="Try code NCTON2026"
            className="flex-1 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono uppercase bg-slate-950/70 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleRedeemPromo}
            className="px-3 py-1.5 rounded-xl btn-cobalt-glass text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  // Bottom Navigation Bar: Floating frosted obsidian bar with glowing neon-mint active tab icons
  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 max-w-[380px] mx-auto bg-slate-950/85 backdrop-blur-2xl border-t border-white/10 py-1.5 px-3 z-40 flex items-center justify-around shadow-2xl shadow-black/90">
      {[
        { id: 'mining', label: 'Mining', icon: Pickaxe },
        { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
        { id: 'missions', label: 'Missions', icon: CheckCircle2 },
        { id: 'friends', label: 'Friends', icon: Users },
        { id: 'wallet', label: 'Wallet', icon: Wallet },
      ].map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as ScreenTab)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-emerald-300 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-emerald-500/15 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                  : 'bg-transparent border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive
                    ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                    : 'text-slate-400'
                }`}
              />
            </div>
            <span
              className={`text-[9px] mt-0.5 ${
                isActive ? 'text-emerald-300 font-bold' : 'text-slate-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 antialiased selection:bg-[#10B981] selection:text-white pb-20 relative overflow-hidden">
      {/* Ambient Radial Neon-Emerald and Cobalt-Blue Background Light Blurs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/12 blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-blue-600/14 blur-[110px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      {/* Toast Notification */}
      {activeNotification && (
        <div className="fixed top-3 left-3 right-3 max-w-[380px] mx-auto z-50 animate-in fade-in slide-in-from-top-2">
          <div
            className={`rounded-2xl p-3 shadow-2xl border backdrop-blur-xl flex items-start gap-2.5 ${
              activeNotification.type === 'reward'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : activeNotification.type === 'interstitial'
                ? 'bg-blue-950/80 border-blue-500/50 text-blue-200 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                : activeNotification.type === 'error'
                ? 'bg-red-950/80 border-red-500/50 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                : 'obsidian-card text-white'
            }`}
          >
            {activeNotification.type === 'reward' && <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {activeNotification.type === 'interstitial' && <Tv className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
            {activeNotification.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
            {activeNotification.type === 'info' && <Info className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />}
            <div className="flex-1 text-xs min-w-0">
              <p className="font-black truncate">{activeNotification.title}</p>
              <p className="mt-0.5 text-[11px] opacity-90 leading-tight">{activeNotification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {rechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="obsidian-card rounded-3xl p-5 max-w-sm w-full border border-white/10 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setRechargeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-300 flex items-center justify-center">
                <Zap className="w-4 h-4 fill-blue-300" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Recharge Mining Battery</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Select your preferred recharge method to restore your rig back to 100% capacity:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setBatteryProgress(100);
                  setBatterySeconds(8 * 3600);
                  setRechargeModalOpen(false);
                  triggerCelebration();
                  showToast('reward', 'Battery Recharged! ⚡', 'Power grid restored to 100% with speed boost.');
                }}
                className="w-full p-3 rounded-2xl btn-mint-glass text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-white">Instant Fuel Boost</p>
                  <p className="text-[10px] text-emerald-300">Recharges battery to 100%</p>
                </div>
                <span className="text-xs font-bold text-emerald-300">500 NC</span>
              </button>

              <button
                onClick={async () => {
                  setRechargeModalOpen(false);
                  await handleWatchRewardedAd();
                  setBatteryProgress(100);
                  setBatterySeconds(8 * 3600);
                }}
                className="w-full p-3 rounded-2xl btn-cobalt-glass text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-white">Watch Ad to Recharge</p>
                  <p className="text-[10px] text-blue-200">Multi-network ad waterfall</p>
                </div>
                <span className="text-xs font-bold text-blue-200">Free</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Streak Ladder Modal */}
      {streakModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="obsidian-card rounded-3xl p-5 max-w-sm w-full border border-white/10 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setStreakModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">7-Day Mining Login Streak</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Log in daily to claim escalating NC coins and TON bonuses!
            </p>

            <div className="space-y-1.5 mb-4">
              {[
                { day: 'Day 1', reward: '+1,000 NC', status: 'Claimed' },
                { day: 'Day 2', reward: '+2,000 NC', status: 'Claimed' },
                { day: 'Day 3', reward: '+3,500 NC', status: 'Claimed' },
                { day: 'Day 4 (Today)', reward: '+5,000 NC & +0.005 TON', status: dailyStreakClaimed ? 'Claimed' : 'Ready' },
                { day: 'Day 5', reward: '+7,500 NC', status: 'Locked' },
                { day: 'Day 6', reward: '+10,000 NC', status: 'Locked' },
                { day: 'Day 7', reward: '+25,000 NC & +0.05 TON', status: 'Locked' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                    item.status === 'Claimed'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                      : item.status === 'Ready'
                      ? 'btn-cobalt-glass text-white font-bold ring-1 ring-blue-400'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  <span>{item.day}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{item.reward}</span>
                    <span className="text-[10px]">
                      {item.status === 'Claimed' ? '✓' : item.status === 'Ready' ? '★' : '🔒'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              disabled={dailyStreakClaimed}
              onClick={handleClaimDailyStreak}
              className="w-full py-2.5 rounded-xl btn-cobalt-glass disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {dailyStreakClaimed ? 'Streak Claimed Today' : 'Claim Day 4 Reward (+5,000 NC)'}
            </button>
          </div>
        </div>
      )}

      {/* Mini-Game Arena Modal */}
      {activeGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="obsidian-card rounded-3xl p-5 max-w-sm w-full border border-white/10 shadow-2xl relative text-white animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {activeGameModal === 'tube_sort'
                    ? 'Color Tube Sort'
                    : activeGameModal === 'memory'
                    ? 'Memory Matrix'
                    : 'Cyber Car Race'}
                </h3>
              </div>
              <button
                onClick={async () => {
                  setActiveGameModal(null);
                  setGameActiveState(false);
                  await handleTriggerInterstitial('Game Exit', true);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/70 rounded-2xl p-4 border border-white/10 text-center space-y-4">
              <p className="text-xs text-slate-300">
                {activeGameModal === 'tube_sort'
                  ? 'All tubes aligned! Test tubes ready for high-speed automated chemistry sort.'
                  : activeGameModal === 'memory'
                  ? 'Cyberpunk sequence matched with 100% telemetry accuracy.'
                  : 'Speed record unbroken! Nitro collected on cyber highway.'}
              </p>

              <div className="py-6 flex justify-center items-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-bounce">
                  <Trophy className="w-8 h-8" />
                </div>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/10 flex justify-around text-xs font-mono">
                <div>
                  <p className="text-[10px] text-slate-400">Score</p>
                  <p className="text-emerald-400 font-bold">1,450 PTS</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Award</p>
                  <p className="text-blue-400 font-bold">+1,200 NC</p>
                </div>
              </div>

              <button
                onClick={async () => {
                  setNcBalance((b) => b + 1200);
                  setWalletNcBalance((b) => b + 1200);
                  setActiveGameModal(null);
                  setGameActiveState(false);
                  triggerCelebration();
                  showToast('reward', 'Round Victory!', '+1,200 NC awarded for completing game round.');
                  await handleTriggerInterstitial('Game Round Completion', true);
                }}
                className="w-full py-2.5 rounded-xl btn-mint-glass text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.35)]"
              >
                Complete &amp; Claim Reward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header / View Mode Controls */}
      <div className="bg-slate-950/80 border-b border-white/10 px-4 py-2.5 sticky top-0 z-30 shadow-2xl backdrop-blur-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm tracking-tight text-white">
            NC TONs <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">OBSIDIAN</span> &amp;{' '}
            <span className="text-blue-400 drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]">GLASS</span>
          </span>
        </div>

        {/* View Mode Toggle: Phone View vs 5-Screen Studio */}
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-white/10 text-xs font-bold backdrop-blur-md">
          <button
            onClick={() => setViewMode('single')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'single'
                ? 'btn-cobalt-glass text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone View</span>
          </button>
          <button
            onClick={() => setViewMode('studio')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'studio'
                ? 'btn-cobalt-glass text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>5-Screen Studio</span>
          </button>
        </div>
      </div>

      {/* Main App Content */}
      <div className="relative z-10">
        {viewMode === 'single' ? (
          /* Single Centered Mobile Container (max-w-[380px]) */
          <div className="max-w-[380px] w-full mx-auto p-3.5 pt-3">
            {activeTab === 'mining' && renderMiningScreen()}
            {activeTab === 'arcade' && renderArcadeScreen()}
            {activeTab === 'missions' && renderMissionsScreen()}
            {activeTab === 'friends' && renderFriendsScreen()}
            {activeTab === 'wallet' && renderWalletScreen()}
            {renderBottomNav()}
          </div>
        ) : (
          /* 5-Screen Studio: Horizontal Scroll Container with fixed min-w-[340px] per phone */
          <div className="w-full py-4">
            <div className="text-center max-w-xl mx-auto mb-4 px-4">
              <h1 className="text-xl font-black text-white tracking-tight">
                NC TONs: Obsidian Glassmorphism Studio
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                5-screen complete presentation sheet — horizontal scroll layout with full feature parity
              </p>
            </div>

            <div className="w-full overflow-x-auto pb-6 px-4">
              <div className="flex flex-row gap-5 items-start min-w-max mx-auto justify-start lg:justify-center">
                {/* Phone 1: MINING (HOME) */}
                <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-slate-900/90 rounded-[28px] border-2 border-white/10 shadow-2xl shadow-black/90 overflow-hidden flex flex-col backdrop-blur-2xl">
                  <div className="bg-slate-950/90 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="font-bold text-[11px] text-emerald-300">1. MINING (HOME)</span>
                    <div className="w-10 h-1.5 rounded-full bg-slate-700" />
                  </div>
                  <div className="p-3 bg-[#060911]/90">
                    {renderMiningScreen()}
                  </div>
                  <div className="py-2 bg-slate-950 flex justify-center border-t border-white/5">
                    <div className="w-24 h-1 rounded-full bg-slate-700" />
                  </div>
                </div>

                {/* Phone 2: ARCADE HUB */}
                <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-slate-900/90 rounded-[28px] border-2 border-white/10 shadow-2xl shadow-black/90 overflow-hidden flex flex-col backdrop-blur-2xl">
                  <div className="bg-slate-950/90 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="font-bold text-[11px] text-blue-300">2. ARCADE HUB</span>
                    <div className="w-10 h-1.5 rounded-full bg-slate-700" />
                  </div>
                  <div className="p-3 bg-[#060911]/90">
                    {renderArcadeScreen()}
                  </div>
                  <div className="py-2 bg-slate-950 flex justify-center border-t border-white/5">
                    <div className="w-24 h-1 rounded-full bg-slate-700" />
                  </div>
                </div>

                {/* Phone 3: MISSIONS & ADS */}
                <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-slate-900/90 rounded-[28px] border-2 border-white/10 shadow-2xl shadow-black/90 overflow-hidden flex flex-col backdrop-blur-2xl">
                  <div className="bg-slate-950/90 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="font-bold text-[11px] text-amber-300">3. MISSIONS &amp; ADS</span>
                    <div className="w-10 h-1.5 rounded-full bg-slate-700" />
                  </div>
                  <div className="p-3 bg-[#060911]/90">
                    {renderMissionsScreen()}
                  </div>
                  <div className="py-2 bg-slate-950 flex justify-center border-t border-white/5">
                    <div className="w-24 h-1 rounded-full bg-slate-700" />
                  </div>
                </div>

                {/* Phone 4: SQUAD REFERRALS */}
                <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-slate-900/90 rounded-[28px] border-2 border-white/10 shadow-2xl shadow-black/90 overflow-hidden flex flex-col backdrop-blur-2xl">
                  <div className="bg-slate-950/90 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="font-bold text-[11px] text-purple-300">4. SQUAD REFERRALS</span>
                    <div className="w-10 h-1.5 rounded-full bg-slate-700" />
                  </div>
                  <div className="p-3 bg-[#060911]/90">
                    {renderFriendsScreen()}
                  </div>
                  <div className="py-2 bg-slate-950 flex justify-center border-t border-white/5">
                    <div className="w-24 h-1 rounded-full bg-slate-700" />
                  </div>
                </div>

                {/* Phone 5: WALLET & QUOTA */}
                <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-slate-900/90 rounded-[28px] border-2 border-white/10 shadow-2xl shadow-black/90 overflow-hidden flex flex-col backdrop-blur-2xl">
                  <div className="bg-slate-950/90 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="font-bold text-[11px] text-rose-300">5. WALLET &amp; QUOTA</span>
                    <div className="w-10 h-1.5 rounded-full bg-slate-700" />
                  </div>
                  <div className="p-3 bg-[#060911]/90">
                    {renderWalletScreen()}
                  </div>
                  <div className="py-2 bg-slate-950 flex justify-center border-t border-white/5">
                    <div className="w-24 h-1 rounded-full bg-slate-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
