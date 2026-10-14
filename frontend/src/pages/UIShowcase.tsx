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
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  showSmartRewardedAd,
  triggerAlternatingInterstitial,
  calculateTierReward,
  getAdManagerStats,
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
  const [ncBalance, setNcBalance] = useState(181900);
  const [tonBalance, setTonBalance] = useState(0.40);
  const [walletTonBalance, setWalletTonBalance] = useState(23.374);
  const [walletNcBalance, setWalletNcBalance] = useState(50000);

  // Mining Battery Timer ("07:38:35")
  const [batterySeconds, setBatterySeconds] = useState(7 * 3600 + 38 * 60 + 35);
  const [isMiningActive, setIsMiningActive] = useState(true);
  const [batteryProgress, setBatteryProgress] = useState(15);
  const [minerLevel, setMinerLevel] = useState(1);

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
  const [walletAddress, setWalletAddress] = useState('EQBvW8Z5huBkMJYdn30Bl5NsQ5DCMb-EZ13s_EXAMPLE');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoRedeemed, setPromoRedeemed] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState<'terms' | 'privacy' | null>(null);

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
      setAdStats(getAdManagerStats());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10B981', '#2563EB', '#F59E0B', '#3B82F6'],
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

  // 1:1 Alternating Interstitial Ad Trigger
  const handleTriggerInterstitial = async (actionSource: string) => {
    try {
      const res = await triggerAlternatingInterstitial(false);
      if (res.shown) {
        setAdStats(getAdManagerStats());
        showToast(
          'interstitial',
          `1:1 Interstitial Ad Triggered [${res.provider}]`,
          `Triggered via ${actionSource}. Next rotation will show ${res.provider === 'MONETAG' ? 'GIGAPUB' : 'MONETAG'}.`
        );
      } else {
        showToast('info', 'Interstitial Cooldown', `${actionSource} complete. (${res.reason})`);
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
    setBatteryProgress(15);
    setBatterySeconds(7 * 3600 + 38 * 60 + 35);
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

  // ==========================================
  // SCREEN 1: MINING (HOME)
  // ==========================================
  const renderMiningScreen = () => (
    <div className="space-y-3.5">
      {/* Top Header with Dual-Currency Cards */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold text-slate-900 tracking-tight text-base truncate">NC TONs</span>
            <button
              onClick={() => setIsMiningActive((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-emerald-200 shrink-0 cursor-pointer"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMiningActive ? 'bg-[#10B981] animate-pulse' : 'bg-slate-400'}`}></span>
              {isMiningActive ? 'LIVE SYNC' : 'PAUSED'}
            </button>
          </div>
          <button
            onClick={() => setStreakModalOpen(true)}
            className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 hover:bg-amber-100 cursor-pointer"
          >
            <Trophy className="w-3 h-3 text-amber-500" />
            Day 4 Streak
          </button>
        </div>

        {/* Dual-Currency Balance Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#ECFDF5]/70 border border-emerald-100 rounded-xl px-2.5 py-1.5 min-w-0">
            <p className="text-[9px] uppercase font-bold text-emerald-600/80 tracking-wide">NC Coins</p>
            <p className="text-sm font-extrabold text-[#10B981] font-mono truncate">
              {ncBalance.toLocaleString()} NC
            </p>
          </div>
          <div className="bg-[#EFF6FF]/80 border border-blue-100 rounded-xl px-2.5 py-1.5 min-w-0">
            <p className="text-[9px] uppercase font-bold text-blue-500/80 tracking-wide">TON Vault</p>
            <p className="text-sm font-extrabold text-[#2563EB] font-mono truncate">
              {tonBalance.toFixed(2)} TON
            </p>
          </div>
        </div>
      </div>

      {/* Central 8H MINING BATTERY Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-[#10B981]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#10B981] shrink-0">
              <Zap className="w-4 h-4 fill-[#10B981]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
                8H Mining Battery
              </h2>
              <p className="text-[10px] text-slate-500 truncate">Autonomous Rig • Level {minerLevel}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-[#ECFDF5] text-[#059669] border border-emerald-200 shrink-0">
            {batteryProgress}% CHARGED
          </span>
        </div>

        {/* Neo-Mint Progress Bar (15% Default State) */}
        <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-[#10B981] rounded-full transition-all duration-500 shadow-sm relative"
            style={{ width: `${batteryProgress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
          </div>
        </div>

        {/* Two-Column Split: Battery Depletion ("07:38:35") & Mining Rate */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50/90 rounded-xl p-2.5 border border-slate-100 mb-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1 truncate">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" /> Battery Depletion
            </p>
            <p className="text-sm font-bold font-mono text-slate-800 mt-0.5 truncate">
              {formatTimer(batterySeconds)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1 truncate">
              <Flame className="w-3 h-3 text-[#10B981] shrink-0" /> Mining Rate
            </p>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5 truncate">
              <span className="text-[#10B981]">+{(0.5 + minerLevel * 0.1).toFixed(3)}M NC</span> /{' '}
              <span className="text-[#2563EB] font-mono">+0.40 TON</span> / hr
            </p>
          </div>
        </div>

        {/* Action Buttons: Outlined Cobalt Boost & Solid Deep-Cobalt Claim */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setRechargeModalOpen(true)}
            className="w-full py-2.5 px-2 rounded-xl border-2 border-[#2563EB] text-[#2563EB] font-bold text-[11px] uppercase tracking-wider hover:bg-[#EFF6FF] active:scale-95 transition-all flex items-center justify-center gap-1 shadow-xs truncate cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-[#2563EB] shrink-0" />
            ACTIVATE BOOST
          </button>
          <button
            onClick={handleClaimMining}
            className="w-full py-2.5 px-2 rounded-xl bg-[#1E3A8A] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-900/20 truncate cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 shrink-0" />
            CLAIM REWARDS
          </button>
        </div>
      </div>

      {/* Miner Level Upgrade Card (Feature from Previous Setup) */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              Miner Rig Level {minerLevel}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              Next: Level {minerLevel + 1} (+0.100M NC/hr)
            </p>
          </div>
        </div>
        <button
          onClick={handleUpgradeMinerLevel}
          className="py-1.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold text-[10px] uppercase tracking-wider shrink-0 transition-all cursor-pointer"
        >
          Upgrade (10K NC)
        </button>
      </div>

      {/* 7-Day Mining Streak Card */}
      <div
        onClick={() => setStreakModalOpen(true)}
        className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm cursor-pointer hover:border-blue-200 transition-colors"
      >
        <div className="flex items-center justify-between mb-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-slate-800 truncate">Daily Login Streak</span>
          </div>
          <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            {dailyStreakClaimed ? '✓ Claimed Today' : 'Day 4 Active (+5,000 NC)'}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 pt-1">
          {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((day, idx) => (
            <div
              key={day}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-center border ${
                idx < 3 || (idx === 3 && dailyStreakClaimed)
                  ? 'bg-[#ECFDF5] border-emerald-200 text-[#059669]'
                  : idx === 3
                  ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-xs animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
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

      {/* Global Miners Status */}
      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0"></span>
          <span className="truncate">Active Cloud Miners:</span>
        </div>
        <span className="font-mono font-bold text-slate-800 shrink-0">48,219 Online</span>
      </div>
    </div>
  );

  // ==========================================
  // SCREEN 2: ARCADE HUB
  // ==========================================
  const renderArcadeScreen = () => (
    <div className="space-y-3.5">
      {/* Arcade Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight truncate">NC Arcade Hub</h2>
          <p className="text-[11px] text-slate-500 truncate">Play Web3 games & earn dual tokens</p>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold flex items-center gap-1 shrink-0">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>4 Games Ready</span>
        </div>
      </div>

      {/* Featured Dark Navy Card: COLOR TUBE SORT */}
      <div className="bg-[#0F172A] rounded-2xl p-4 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 min-w-0">
          <div className="min-w-0">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-[#10B981] border border-emerald-500/30 inline-block">
              Featured Arcade
            </span>
            <h3 className="text-base font-black text-white mt-1 truncate">COLOR TUBE SORT</h3>
            <p className="text-[11px] text-slate-400 truncate">
              {tubePoured
                ? 'Liquid poured! Tap tubes to sort colors'
                : 'Sort glowing neon liquids into matching test tubes'}
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#10B981] bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800 shrink-0">
            +1,200 NC / LVL
          </span>
        </div>

        {/* 4 Vertical Glass Test Tubes with Dynamic Interaction */}
        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex items-center justify-around my-3">
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
                    // Pour top layer from selectedTube to tIdx
                    const source = [...tubeColors[selectedTube]];
                    const dest = [...tubeColors[tIdx]];
                    // Find top non-transparent layer in source
                    const topSrcIdx = source.findIndex((c) => c !== 'bg-transparent');
                    // Find bottom-most transparent layer in dest
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
                {/* Tube Rim */}
                <div className="w-8 h-1 border border-slate-400/60 rounded-t-sm bg-slate-700/50"></div>
                {/* Glass Tube */}
                <div
                  className={`w-7 h-24 border-2 border-t-0 rounded-b-2xl p-0.5 flex flex-col justify-end gap-0.5 backdrop-blur-sm transition-colors ${
                    isSelected
                      ? 'border-[#10B981] bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'border-slate-500/50 bg-slate-800/40'
                  }`}
                >
                  {tubeLayers.map((color, cIdx) => (
                    <div
                      key={cIdx}
                      className={`h-4 rounded-sm transition-all duration-300 ${color} ${
                        color !== 'bg-transparent' ? 'opacity-90 shadow-xs' : ''
                      }`}
                    ></div>
                  ))}
                </div>
                <span className="text-[9px] font-mono text-slate-400 mt-1">Tube {tIdx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Full-Width Neo-Mint Play Button */}
        <button
          onClick={async () => {
            setActiveGameModal('tube_sort');
          }}
          className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          PLAY COLOR TUBE SORT
        </button>
      </div>

      {/* 2-Column Grid: Memory Matrix & Cyber Car Race */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-2xl p-3 border border-[#E2E8F0] shadow-sm flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] mb-2 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 truncate">Memory Matrix</h4>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Sequence recall challenge</p>
            <div className="mt-1.5 text-[9px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-md inline-block truncate">
              +500 NC / +0.001 TON
            </div>
          </div>
          <button
            onClick={() => setActiveGameModal('memory')}
            className="mt-2.5 w-full py-1.5 rounded-xl border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
          >
            Play Matrix
          </button>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E2E8F0] shadow-sm flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-2 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 truncate">Cyber Car Race</h4>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Traffic evasion speed run</p>
            <div className="mt-1.5 text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md inline-block truncate">
              +750 NC + Fuel Boost
            </div>
          </div>
          <button
            onClick={() => setActiveGameModal('car_race')}
            className="mt-2.5 w-full py-1.5 rounded-xl border border-purple-600 text-purple-600 hover:bg-purple-50 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
          >
            Play Race
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
        <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
              Missions & Ad Hub
            </h2>
            <p className="text-[11px] text-slate-500 truncate">High CPM multi-network monetization</p>
          </div>
          <div className="px-2 py-0.5 rounded-xl bg-[#EFF6FF] border border-blue-200 text-[#2563EB] text-[11px] font-mono font-bold shrink-0">
            {totalWatched}/200 TODAY
          </div>
        </div>

        {/* 15-SECOND DWELL PARTNER LINK Card */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 uppercase truncate">
                  15-Second Dwell Partner Link
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Visit partner dApp for 15s</p>
              </div>
            </div>
            {/* Cobalt Countdown Pill */}
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border shrink-0 transition-colors ${
                dwellActive
                  ? 'bg-[#2563EB] text-white border-[#2563EB] animate-pulse'
                  : dwellCompleted
                  ? 'bg-[#ECFDF5] text-[#059669] border-emerald-200'
                  : 'bg-[#EFF6FF] text-[#2563EB] border-blue-200'
              }`}
            >
              {dwellCompleted ? '✓ CLAIMED (+250)' : dwellActive ? `15s • ${dwellSeconds}s left` : '15s • 11s left'}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-[#10B981]">+250 NC Reward</span>
            <button
              disabled={dwellCompleted || dwellActive}
              onClick={() => {
                setDwellActive(true);
                showToast('info', 'Dwell Timer Started', 'Stay on page 15s to claim rewards.');
              }}
              className="py-1 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-[11px] font-bold transition-all cursor-pointer"
            >
              {dwellCompleted ? 'Completed' : dwellActive ? 'Visiting...' : 'Open Partner'}
            </button>
          </div>
        </div>

        {/* WATCH ADS (200 DAILY SYSTEM) Card */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                <Tv className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 uppercase truncate">
                  Watch Ads (200 Daily System)
                </h3>
                <p className="text-[10px] text-slate-500 truncate">Priority Waterfall Queue</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
              {totalWatched} / 200
            </span>
          </div>

          {/* 3-Tier CPM Protection Pills */}
          <div className="grid grid-cols-3 gap-1.5 my-2.5">
            <div
              className={`p-1.5 rounded-xl border text-center transition-all min-w-0 ${
                totalWatched <= 20
                  ? 'bg-[#ECFDF5] border-emerald-300 text-emerald-800 ring-1 ring-emerald-400'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-tight truncate">ADS 1-20: HIGH</p>
              <p className="text-[9px] font-bold mt-0.5 truncate">NC + Full TON</p>
            </div>
            <div
              className={`p-1.5 rounded-xl border text-center transition-all min-w-0 ${
                totalWatched > 20 && totalWatched <= 50
                  ? 'bg-[#EFF6FF] border-blue-300 text-blue-800 ring-1 ring-blue-400'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-tight truncate">ADS 21-50: MID</p>
              <p className="text-[9px] font-bold mt-0.5 truncate">NC + 50% TON</p>
            </div>
            <div
              className={`p-1.5 rounded-xl border text-center transition-all min-w-0 ${
                totalWatched > 50
                  ? 'bg-amber-50 border-amber-300 text-amber-800 ring-1 ring-amber-400'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-tight truncate">ADS 51+: FUEL</p>
              <p className="text-[9px] font-bold mt-0.5 truncate">NC Only (0 TON)</p>
            </div>
          </div>

          {/* Live Provider Status Rows */}
          <div className="space-y-2 bg-slate-50/90 rounded-xl p-2.5 border border-slate-100 my-2.5">
            {/* Priority 1: Monetag */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0"></span>
                <span className="font-bold text-slate-800 text-[11px] truncate">Priority 1: Monetag</span>
                <span className="text-[9px] text-slate-400 font-mono shrink-0">(98.4%)</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] rounded-full"
                    style={{ width: `${(adStats.counts.monetag / adStats.dailyCaps.monetag) * 100}%` }}
                  ></div>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-600">
                  {adStats.counts.monetag}/{adStats.dailyCaps.monetag}
                </span>
              </div>
            </div>

            {/* Priority 2: Gigapub */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0"></span>
                <span className="font-bold text-slate-800 text-[11px] truncate">Priority 2: Gigapub</span>
                <span className="text-[9px] text-slate-400 font-mono shrink-0">(94.1%)</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full"
                    style={{ width: `${(adStats.counts.gigapub / adStats.dailyCaps.gigapub) * 100}%` }}
                  ></div>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-600">
                  {adStats.counts.gigapub}/{adStats.dailyCaps.gigapub}
                </span>
              </div>
            </div>

            {/* Priority 3: Adsgram */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                <span className="font-bold text-slate-800 text-[11px] truncate">Priority 3: Adsgram</span>
                <span className="text-[9px] text-slate-400 font-mono shrink-0">(89.2%)</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(adStats.counts.adsgram / adStats.dailyCaps.adsgram) * 100}%` }}
                  ></div>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-600">
                  {adStats.counts.adsgram}/{adStats.dailyCaps.adsgram}
                </span>
              </div>
            </div>
          </div>

          {/* Watch Ad CTA */}
          <div className="pt-1">
            <button
              disabled={adLoading}
              onClick={handleWatchRewardedAd}
              className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] active:scale-95 disabled:opacity-60 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {adLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading Ad Waterfall...
                </>
              ) : adStats.rewardedCooldownLeft > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  Cooldown Active ({adStats.rewardedCooldownLeft}s)
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Watch Rewarded Ad (+{currentTier.nc} NC)
                </>
              )}
            </button>
            <p className="text-[9px] text-slate-400 text-center mt-1.5 truncate">
              Next Tier: <strong className="text-slate-700">{currentTier.tier}</strong> (
              +{currentTier.nc} NC, +{currentTier.ton} TON)
            </p>
          </div>
        </div>

        {/* Task / Missions List with Category Pills */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase">Community Tasks</h4>
            {/* Category Filter */}
            <div className="flex gap-1">
              {(['all', 'telegram', 'social', 'partner'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMissionCategory(cat)}
                  className={`text-[9px] px-2 py-0.5 rounded-full capitalize font-semibold transition-colors cursor-pointer ${
                    missionCategory === cat
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-900 truncate">{mission.title}</p>
                  <p className="text-[9px] font-mono text-emerald-600 mt-0.5">
                    +{mission.ncReward.toLocaleString()} NC • +{mission.tonReward} TON
                  </p>
                </div>
                <button
                  disabled={mission.completed}
                  onClick={() => handleCompleteMission(mission.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                    mission.completed
                      ? 'bg-emerald-100 text-emerald-700 cursor-default'
                      : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs'
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
      {/* Verification Header Pills */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#ECFDF5] text-[#059669] border border-emerald-200 shrink-0">
              HUMAN VERIFIED ONLY
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 shrink-0">
              INVITE ONLY
            </span>
          </div>
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight mt-1 truncate">
            Squad Referrals
          </h2>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] text-slate-400 uppercase font-bold">Unclaimed Commission</p>
          <p className="text-xs font-black text-[#2563EB] font-mono">
            {friendCommissionTon > 0 ? `+${friendCommissionTon.toFixed(2)} TON` : '0.00 TON'}
          </p>
        </div>
      </div>

      {/* Referral Stats Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-2.5 border border-[#E2E8F0] shadow-sm text-center min-w-0">
          <p className="text-[9px] uppercase font-bold text-slate-400 truncate">Invited</p>
          <p className="text-base font-black text-slate-800 font-mono mt-0.5">14</p>
          <p className="text-[9px] text-slate-400 truncate">Friends</p>
        </div>
        <div className="bg-white rounded-2xl p-2.5 border border-[#E2E8F0] shadow-sm text-center min-w-0">
          <p className="text-[9px] uppercase font-bold text-slate-400 truncate">Active</p>
          <p className="text-base font-black text-[#10B981] font-mono mt-0.5">11</p>
          <p className="text-[9px] text-emerald-500 font-semibold truncate">Miners</p>
        </div>
        <div className="bg-white rounded-2xl p-2.5 border border-[#E2E8F0] shadow-sm text-center min-w-0">
          <p className="text-[9px] uppercase font-bold text-slate-400 truncate">Commission</p>
          <p className="text-base font-black text-[#2563EB] font-mono mt-0.5">15%</p>
          <p className="text-[9px] text-slate-400 truncate">Lifetime</p>
        </div>
      </div>

      {/* Claim Commission Action (from Previous Setup) */}
      {friendCommissionTon > 0 && !claimedCommission && (
        <div className="bg-[#EFF6FF] rounded-2xl p-3 border border-blue-200 shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#2563EB]">Pending Referral Earnings</p>
            <p className="text-[10px] text-slate-600">You have +1.25 TON ready to collect</p>
          </div>
          <button
            onClick={handleClaimCommission}
            className="py-1.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
          >
            Claim Commission
          </button>
        </div>
      )}

      {/* 5-Emoji Anti-Bot Verification Captcha */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <h3 className="text-xs font-bold text-slate-900 truncate">Anti-Bot Verification Captcha</h3>
          </div>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              captchaVerified
                ? 'bg-[#ECFDF5] text-[#059669] border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {captchaVerified ? '✓ VERIFIED' : 'PENDING'}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mb-2.5">
          Select the <strong className="text-slate-800">🚀 Rocket</strong> icon to verify human session:
        </p>

        {/* 5-Emoji Bar */}
        <div className="grid grid-cols-5 gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          {['💎', '🚀', '⚡', '🍀', '🪙'].map((emoji) => {
            const isChosen = captchaSelected === emoji;
            return (
              <button
                key={emoji}
                onClick={() => handleCaptchaClick(emoji)}
                className={`h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                  isChosen
                    ? emoji === '🚀'
                      ? 'bg-emerald-100 border-2 border-[#10B981] scale-105'
                      : 'bg-red-100 border-2 border-red-500'
                    : 'bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 shadow-xs'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Invite CTA */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm space-y-2.5">
        <button
          onClick={() => {
            const text = '⚡ Mine real TON & NC Coins on NC TONs! Join with my link:';
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/NC_TONs_Bot?start=ref_81920')}&text=${encodeURIComponent(text)}`;
            window.open(shareUrl, '_blank');
            showToast('info', 'Opening Telegram', 'Sharing referral invitation...');
          }}
          className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 shrink-0" />
          + INVITE FRIENDS ON TELEGRAM
        </button>

        <div className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
          <span className="text-slate-500 truncate font-mono text-[10px]">
            https://t.me/NC_TONs_Bot?start=ref_81920
          </span>
          <button
            onClick={() => {
              setCopiedLink(true);
              navigator.clipboard?.writeText('https://t.me/NC_TONs_Bot?start=ref_81920');
              showToast('info', 'Copied', 'Referral link copied to clipboard!');
              setTimeout(() => setCopiedLink(false), 2500);
            }}
            className="text-[#2563EB] hover:text-blue-700 font-bold flex items-center gap-1 shrink-0 ml-1.5 text-[11px] cursor-pointer"
          >
            {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedLink ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Milestone Ladder (from Previous Setup) */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Referral Milestones
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] p-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="font-semibold text-emerald-800">5 Friends Invited</span>
            <span className="font-mono font-bold text-emerald-700">+0.10 TON (Claimed ✓)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] p-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="font-semibold text-emerald-800">10 Friends Invited</span>
            <span className="font-mono font-bold text-emerald-700">+0.25 TON (Claimed ✓)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] p-2 bg-blue-50 rounded-xl border border-blue-100">
            <span className="font-semibold text-[#2563EB]">25 Friends (14/25)</span>
            <span className="font-mono font-bold text-[#2563EB]">+1.00 TON Locked</span>
          </div>
        </div>
      </div>

      {/* Scrollable List of Verified Invites */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Verified Friends
        </h4>
        <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1">
          {[
            { name: 'Alex M.', handle: '@alex_ton', rate: '+0.45 TON', status: 'Active', verified: true },
            { name: 'Sophia K.', handle: '@sophia_web3', rate: '+0.38 TON', status: 'Active', verified: true },
            { name: 'David R.', handle: '@david_crypto', rate: '+0.42 TON', status: 'Active', verified: true },
          ].map((f, i) => (
            <div key={i} className="py-2 flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-600 shrink-0">
                  {f.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">{f.name}</p>
                    {f.verified && <CheckCircle2 className="w-3 h-3 text-[#10B981] fill-emerald-100 shrink-0" />}
                  </div>
                  <p className="text-[9px] text-slate-400 truncate">{f.handle}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-mono font-bold text-[#2563EB]">{f.rate}</p>
                <p className="text-[9px] text-[#059669] font-semibold">{f.status}</p>
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
      {/* Dual Vault Balance Summary */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Total Vault Balance
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#ECFDF5]/80 rounded-xl p-2.5 border border-emerald-100 min-w-0">
            <p className="text-[9px] uppercase font-bold text-[#059669]">NC Tokens</p>
            <p className="text-base font-black text-[#10B981] font-mono mt-0.5 truncate">
              +{walletNcBalance >= 1000000 ? `${(walletNcBalance / 1000000).toFixed(3)}M` : `0.0${(walletNcBalance / 1000).toFixed(0)}M`} NC
            </p>
            <p className="text-[9px] text-emerald-600/80 mt-0.5 truncate">Ready for exchange</p>
          </div>
          <div className="bg-[#EFF6FF]/80 rounded-xl p-2.5 border border-blue-100 min-w-0">
            <p className="text-[9px] uppercase font-bold text-[#2563EB]">TON Vault</p>
            <p className="text-base font-black text-[#2563EB] font-mono mt-0.5 truncate">
              {walletTonBalance.toFixed(3)} TON
            </p>
            <p className="text-[9px] text-blue-600/80 mt-0.5 truncate">≈ ${(walletTonBalance * 5.2).toFixed(2)} USD</p>
          </div>
        </div>
      </div>

      {/* Promo Code Redeem Card (Feature from Previous Setup) */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-[#2563EB]" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Redeem Promo Code
          </h4>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value)}
            placeholder="Try code NCTON2026"
            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono uppercase bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleRedeemPromo}
            className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Withdrawal Quota Status Cards */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm space-y-2.5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Withdrawal Quota Status
        </h3>

        {/* Daily Quota: 1/1 HIT */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1 min-w-0">
            <span className="font-semibold text-slate-600 truncate">Daily Quota</span>
            <span className="font-mono font-bold text-[#DC2626] bg-[#FEF2F2] px-1.5 py-0.2 rounded-full border border-[#FECACA] shrink-0 text-[10px]">
              1/1 HIT (LIMIT REACHED)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full bg-[#DC2626] rounded-full w-full"></div>
          </div>
        </div>

        {/* Weekly Quota: 2/5 LEFT */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1 min-w-0">
            <span className="font-semibold text-slate-600 truncate">Weekly Quota</span>
            <span className="font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.2 rounded-full border border-blue-200 shrink-0 text-[10px]">
              2/5 LEFT (3 REMAINING)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full bg-[#2563EB] rounded-full w-[40%]"></div>
          </div>
        </div>
      </div>

      {/* SOFT CORAL RED ALERT BOX */}
      <div className="bg-[#FEF2F2] rounded-2xl p-3.5 border border-[#FECACA] shadow-sm">
        <div className="flex items-start gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-[11px] font-black text-[#DC2626] uppercase tracking-wide truncate">
              Daily Limit Hit! Watch 30 Ads to break ({dailyBreakCount}/30)
            </h4>
            <p className="text-[10px] text-red-700/90 mt-0.5 leading-snug">
              Bypass cooldown via the Monetag → Gigapub → Adsgram rewarded waterfall.
            </p>

            {/* Red Alert Progress Bar */}
            <div className="w-full h-1.5 bg-red-200/80 rounded-full overflow-hidden my-2">
              <div
                className="h-full bg-[#DC2626] rounded-full transition-all duration-300"
                style={{ width: `${(dailyBreakCount / 30) * 100}%` }}
              ></div>
            </div>

            <button
              disabled={adLoading || dailyBreakCount >= 30}
              onClick={handleBreakDailyLimit}
              className="w-full py-2 rounded-xl bg-[#DC2626] hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              {dailyBreakCount >= 30 ? (
                'Daily Limit Unlocked!'
              ) : (
                <>
                  <Tv className="w-3 h-3 shrink-0" />
                  Watch Ad to Break Limit (+1 Progress)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TON Wallet Address Input & Withdraw CTA */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-700 uppercase">
            Destination TON Wallet Address
          </label>
          <span className="text-[9px] text-[#2563EB] font-bold">TonConnect Supported</span>
        </div>
        <div className="mt-1">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
            placeholder="Enter TON wallet address"
          />
        </div>

        <button
          onClick={() => {
            if (dailyBreakCount < 30) {
              showToast('error', 'Daily Quota Hit', 'Break your daily limit by watching remaining ads or wait for 24h reset.');
            } else {
              triggerCelebration();
              showToast('reward', 'Withdrawal Initiated', `Transferred 5.0 TON to ${walletAddress.substring(0, 8)}...`);
            }
          }}
          className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
        >
          <Wallet className="w-3.5 h-3.5" />
          Withdraw TON Now
        </button>
      </div>

      {/* Past Withdrawal History (Feature from Previous Setup) */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-sm">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Recent Withdrawals
        </h4>
        <div className="space-y-2">
          {[
            { amount: '5.0 TON', date: 'Today, 14:20', status: 'Completed', tx: 'EQA...3b91' },
            { amount: '2.5 TON', date: 'Yesterday', status: 'Completed', tx: 'EQC...1f4e' },
            { amount: '1.0 TON', date: 'Oct 12', status: 'Pending', tx: 'In queue' },
          ].map((tx, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px] py-1.5 border-b border-slate-100 last:border-b-0">
              <div>
                <p className="font-bold text-slate-900">{tx.amount}</p>
                <p className="text-[9px] text-slate-400">{tx.date} • {tx.tx}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {tx.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legal Footer Links */}
      <div className="flex justify-center gap-4 text-[10px] text-slate-400 pt-1">
        <button onClick={() => setLegalModalOpen('terms')} className="hover:text-slate-600 underline cursor-pointer">
          Terms of Service
        </button>
        <span>•</span>
        <button onClick={() => setLegalModalOpen('privacy')} className="hover:text-slate-600 underline cursor-pointer">
          Privacy Policy
        </button>
      </div>
    </div>
  );

  // Bottom Navigation Bar
  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 max-w-[380px] mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 z-40 flex items-center justify-around shadow-lg">
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
            onClick={() => setActiveTab(tab.id as ScreenTab)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-[#2563EB] font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-[#EFF6FF]' : ''}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[9px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 antialiased selection:bg-[#10B981] selection:text-white pb-20">
      {/* Toast Notification */}
      {activeNotification && (
        <div className="fixed top-3 left-3 right-3 max-w-[380px] mx-auto z-50">
          <div
            className={`rounded-2xl p-3 shadow-xl border flex items-start gap-2.5 ${
              activeNotification.type === 'reward'
                ? 'bg-[#ECFDF5] border-emerald-300 text-emerald-900'
                : activeNotification.type === 'interstitial'
                ? 'bg-[#EFF6FF] border-blue-300 text-blue-900'
                : activeNotification.type === 'error'
                ? 'bg-[#FEF2F2] border-red-300 text-red-900'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {activeNotification.type === 'reward' && <Sparkles className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />}
            {activeNotification.type === 'interstitial' && <Tv className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />}
            {activeNotification.type === 'error' && <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />}
            {activeNotification.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
            <div className="flex-1 text-xs min-w-0">
              <p className="font-extrabold truncate">{activeNotification.title}</p>
              <p className="mt-0.5 text-[11px] opacity-90 leading-tight">{activeNotification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recharge / Boost Modal (from Previous Setup) */}
      {rechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setRechargeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <Zap className="w-4 h-4 fill-[#2563EB]" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Recharge Mining Battery</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
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
                className="w-full p-3 rounded-2xl border border-emerald-200 bg-[#ECFDF5] hover:bg-emerald-100/70 text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-emerald-900">Instant Fuel Boost</p>
                  <p className="text-[10px] text-emerald-700">Recharges battery to 100%</p>
                </div>
                <span className="text-xs font-bold text-[#10B981]">500 NC</span>
              </button>

              <button
                onClick={async () => {
                  setRechargeModalOpen(false);
                  await handleWatchRewardedAd();
                  setBatteryProgress(100);
                  setBatterySeconds(8 * 3600);
                }}
                className="w-full p-3 rounded-2xl border border-blue-200 bg-[#EFF6FF] hover:bg-blue-100/70 text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-blue-900">Watch Ad to Recharge</p>
                  <p className="text-[10px] text-blue-700">Multi-network ad waterfall</p>
                </div>
                <span className="text-xs font-bold text-[#2563EB]">Free</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Streak Ladder Modal (from Previous Setup) */}
      {streakModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setStreakModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-extrabold text-slate-900">7-Day Mining Login Streak</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
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
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                      : item.status === 'Ready'
                      ? 'bg-blue-50 text-blue-900 border-blue-200 font-bold ring-1 ring-blue-400'
                      : 'bg-slate-50 text-slate-400 border-slate-100'
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
              className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {dailyStreakClaimed ? 'Streak Claimed Today' : 'Claim Day 4 Reward (+5,000 NC)'}
            </button>
          </div>
        </div>
      )}

      {/* Mini-Game Arena Modal (Playable Arcade from Previous Setup) */}
      {activeGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-[#0F172A] rounded-3xl p-5 max-w-sm w-full border border-slate-700 shadow-2xl relative text-white animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {activeGameModal === 'tube_sort'
                    ? 'Color Tube Sort'
                    : activeGameModal === 'memory'
                    ? 'Memory Matrix'
                    : 'Cyber Car Race'}
                </h3>
              </div>
              <button
                onClick={() => setActiveGameModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Game Screen Content */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-center space-y-4">
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

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-around text-xs font-mono">
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
                  triggerCelebration();
                  showToast('reward', 'Round Victory!', '+1,200 NC awarded for completing game round.');
                  await handleTriggerInterstitial('Game Round Completion');
                }}
                className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Complete & Claim Reward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modal (from Previous Setup) */}
      {legalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setLegalModalOpen(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                {legalModalOpen === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
            </div>
            <div className="text-xs text-slate-600 space-y-2 max-h-60 overflow-y-auto pr-1">
              <p>
                NC TONs is a dual-currency Telegram Mini App cloud simulation protocol. NC Coins are in-app rewards
                utilizable within the arcade gaming and cloud hashrate ecosystem.
              </p>
              <p>
                All withdrawals are governed by dynamic network quotas, anti-bot captcha verification, and CPM
                protection tiers to ensure sustainable distribution.
              </p>
            </div>
            <button
              onClick={() => setLegalModalOpen(null)}
              className="mt-4 w-full py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Top Header / View Mode Controls */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 py-2.5 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm tracking-tight text-slate-900">
            NC TONs <span className="text-[#10B981]">NEO-MINT</span> &{' '}
            <span className="text-[#2563EB]">COBALT</span>
          </span>
        </div>

        {/* View Mode Toggle: Phone View vs 5-Screen Studio */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setViewMode('single')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'single'
                ? 'bg-white text-[#2563EB] shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Phone View
          </button>
          <button
            onClick={() => setViewMode('studio')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'studio'
                ? 'bg-white text-[#2563EB] shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            5-Screen Studio
          </button>
        </div>
      </div>

      {/* Main App Content */}
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
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              NC TONs: Neo-Mint & Cobalt Daylight Studio
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              5-screen complete presentation sheet — horizontal scroll layout with full feature parity
            </p>
          </div>

          <div className="w-full overflow-x-auto pb-6 px-4">
            <div className="flex flex-row gap-5 items-start min-w-max mx-auto justify-start lg:justify-center">
              {/* Phone 1: MINING (HOME) */}
              <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-white rounded-[28px] border-2 border-slate-200/90 shadow-lg overflow-hidden flex flex-col">
                <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-700">1. MINING (HOME)</span>
                  <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
                </div>
                <div className="p-3 bg-[#F4F7FB]">
                  {renderMiningScreen()}
                </div>
                <div className="py-2 bg-white flex justify-center border-t border-slate-100">
                  <div className="w-24 h-1 rounded-full bg-slate-300"></div>
                </div>
              </div>

              {/* Phone 2: ARCADE HUB */}
              <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-white rounded-[28px] border-2 border-slate-200/90 shadow-lg overflow-hidden flex flex-col">
                <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-700">2. ARCADE HUB</span>
                  <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
                </div>
                <div className="p-3 bg-[#F4F7FB]">
                  {renderArcadeScreen()}
                </div>
                <div className="py-2 bg-white flex justify-center border-t border-slate-100">
                  <div className="w-24 h-1 rounded-full bg-slate-300"></div>
                </div>
              </div>

              {/* Phone 3: MISSIONS & ADS */}
              <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-white rounded-[28px] border-2 border-slate-200/90 shadow-lg overflow-hidden flex flex-col">
                <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-700">3. MISSIONS & ADS</span>
                  <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
                </div>
                <div className="p-3 bg-[#F4F7FB]">
                  {renderMissionsScreen()}
                </div>
                <div className="py-2 bg-white flex justify-center border-t border-slate-100">
                  <div className="w-24 h-1 rounded-full bg-slate-300"></div>
                </div>
              </div>

              {/* Phone 4: SQUAD REFERRALS */}
              <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-white rounded-[28px] border-2 border-slate-200/90 shadow-lg overflow-hidden flex flex-col">
                <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-700">4. SQUAD REFERRALS</span>
                  <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
                </div>
                <div className="p-3 bg-[#F4F7FB]">
                  {renderFriendsScreen()}
                </div>
                <div className="py-2 bg-white flex justify-center border-t border-slate-100">
                  <div className="w-24 h-1 rounded-full bg-slate-300"></div>
                </div>
              </div>

              {/* Phone 5: WALLET & QUOTA */}
              <div className="w-[340px] min-w-[340px] max-w-[340px] shrink-0 bg-white rounded-[28px] border-2 border-slate-200/90 shadow-lg overflow-hidden flex flex-col">
                <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-700">5. WALLET & QUOTA</span>
                  <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
                </div>
                <div className="p-3 bg-[#F4F7FB]">
                  {renderWalletScreen()}
                </div>
                <div className="py-2 bg-white flex justify-center border-t border-slate-100">
                  <div className="w-24 h-1 rounded-full bg-slate-300"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
