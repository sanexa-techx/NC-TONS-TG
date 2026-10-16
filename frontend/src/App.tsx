import React, { useState, useEffect, useCallback } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { UserProfile } from './types/index.js';
import { api, getDetectedUser } from './services/api.js';
import { useMining } from './hooks/useMining.js';
import { Navbar, NavTab } from './components/Navbar.js';
import { MiningDashboard } from './pages/MiningDashboard.js';
import { GamePage } from './pages/GamePage.js';
import { MissionsPage } from './pages/MissionsPage.js';
import FriendsView from './components/FriendsView.js';
import { WalletPage } from './pages/WalletPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { OnlinePlayersBadge } from './components/OnlinePlayersBadge.js';
import { UserProfileHeader } from './components/UserProfileHeader.js';
import DailyStreakModal from './components/DailyStreakModal.js';
import { DailyStreakStatusResponse } from './types/index.js';
import { adService } from './services/adService.js';
import { AdCountdownBadge } from './components/AdCountdownBadge.js';
import { AdOverlayModal } from './components/AdOverlayModal.js';
import { Loader2 } from 'lucide-react';
import ForceJoinGate, { ChannelItem } from './components/ForceJoinGate.js';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('mining');
  const [user, setUser] = useState<UserProfile | null>(() => {
    const d = getDetectedUser();
    if (d && d.id !== '9990001') {
      const tgPhoto = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
      const initialPhoto = d.photoUrl || tgPhoto || localStorage.getItem('nctons_photo_url') || null;
      return {
        id: d.id,
        firstName: d.firstName,
        username: d.username,
        photoUrl: initialPhoto,
        minerLevel: 1,
        tonBalance: '0.000000',
        ncBalance: '0',
        powerPercentage: 100,
        powerCapacityHours: 8,
        referralCount: 0,
        createdAt: new Date().toISOString(),
        isAdmin: false,
      };
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [membershipVerified, setMembershipVerified] = useState<boolean | null>(null);
  const [missingChannels, setMissingChannels] = useState<ChannelItem[]>([]);
  const [dailyStatus, setDailyStatus] = useState<DailyStreakStatusResponse | null>(null);
  const [dailyModalOpen, setDailyModalOpen] = useState<boolean>(false);
  const [botUsername, setBotUsername] = useState<string>('');

  const detected = getDetectedUser();
  const currentUserId = detected?.id || (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || user?.id || '123456789';

  const checkMembership = useCallback(async (targetId?: string | number) => {
    const idToCheck = targetId || currentUserId;
    try {
      const res = await api.getMembershipStatus(idToCheck);
      if (res.allJoined) {
        setMembershipVerified(true);
      } else {
        setMissingChannels(res.channels || []);
        setMembershipVerified(false);
      }
    } catch (e) {
      setMembershipVerified(false);
    }
  }, [currentUserId]);

  const {
    mining,
    liveTonBalance,
    livePowerPercentage,
    recharge,
    sync,
    setMiningState,
  } = useMining();

  // Initialize Global Singleton adService (starts 2s app-open Monetag ad & persistent 60s alternating timer)
  useEffect(() => {
    adService.init(currentUserId);
  }, [currentUserId]);

  const handleTabChange = (newTab: NavTab) => {
    if (newTab !== activeTab) {
      console.log(`[Navigation] Tab changed: ${activeTab} -> ${newTab}. Triggering 1:1 alternating ad (Monetag <-> Gigapub)...`);
      adService.triggerAlternatingInterstitial('nav').catch((err) => console.warn('[App] Tab interstitial error:', err));
      setActiveTab(newTab);
    }
  };

  const initAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await api.verifyAuth();
      const tgPhoto = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
      const finalPhoto = res.user.photoUrl || tgPhoto || localStorage.getItem('nctons_photo_url') || null;
      setUser({ ...res.user, photoUrl: finalPhoto });
      if (finalPhoto) {
        localStorage.setItem('nctons_photo_url', finalPhoto);
      }
      setMiningState(res.mining);
      if (res.botUsername) {
        setBotUsername(res.botUsername);
      }

      try {
        const streakData = await api.getDailyStatus(res.user.id);
        setDailyStatus(streakData);
        if (streakData.canClaim) {
          setDailyModalOpen(true);
        }
      } catch (streakErr) {
        console.warn('Daily status fetch fallback:', streakErr);
      }
    } catch (err) {
      console.warn('Auth verify fallback:', (err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  }, [setMiningState]);

  useEffect(() => {
    initAuth();
    checkMembership();
  }, [initAuth, checkMembership]);

  const handleGameFinished = (_ncAwarded: number, _tonAwarded: string) => {
    sync();
  };

  const handleRewardClaimed = (_ncAwarded: number, _tonAwarded: string) => {
    sync();
  };

  const handleDailyClaimSuccess = (_newBalances: any, _reward: any) => {
    sync();
    if (user?.id) {
      api.getDailyStatus(user.id).then((status) => {
        setDailyStatus(status);
      }).catch(console.warn);
    }
  };

  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

  // Loading Splash
  if (authLoading || membershipVerified === null) {
    return (
      <div className="min-h-screen bg-[#060911] text-white flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 rounded-full bg-blue-600/15 blur-[90px] pointer-events-none" />
        
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-300 mb-4 shadow-[0_0_24px_rgba(37,99,235,0.4)] backdrop-blur-xl animate-pulse">
          <Loader2 size={32} className="animate-spin text-blue-400" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          INITIALIZING MINING RIG
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">Verifying security clearance...</p>
      </div>
    );
  }

  // Mandatory Subscription Gate
  if (!membershipVerified) {
    return (
      <ForceJoinGate
        userId={currentUserId}
        channels={missingChannels}
        onVerified={() => setMembershipVerified(true)}
      />
    );
  }

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col selection:bg-[#10B981] selection:text-white relative overflow-hidden">
        {/* Ambient Radial Neon-Emerald and Cobalt-Blue Background Light Blurs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/12 blur-[100px]" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-blue-600/14 blur-[110px]" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>

        {/* Sticky Profile Header — Obsidian Glassmorphism */}
        <header className="sticky top-0 z-20 w-full bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 px-4 py-2.5 shadow-2xl shadow-black/80">
          <div className="w-full max-w-md mx-auto flex items-center justify-between gap-2">
            <UserProfileHeader
              user={user}
              livePowerPercentage={livePowerPercentage}
              liveTonBalance={liveTonBalance}
            />
            <div className="flex items-center space-x-1.5 shrink-0">
              <AdCountdownBadge />
              <OnlinePlayersBadge userId={user?.id} />
            </div>
          </div>
        </header>

        {/* Main Content Pages */}
        <main className="flex-1 w-full max-w-md mx-auto relative z-10">
          {activeTab === 'mining' && (
            <MiningDashboard
              user={user}
              mining={mining}
              liveTonBalance={liveTonBalance}
              livePowerPercentage={livePowerPercentage}
              dailyStreak={dailyStatus?.currentStreak || 0}
              canClaimDaily={Boolean(dailyStatus?.canClaim)}
              onOpenDailyModal={() => setDailyModalOpen(true)}
              onRecharge={recharge}
              onNavigate={handleTabChange}
            />
          )}

          {activeTab === 'game' && (
            <GamePage
              onGameFinished={handleGameFinished}
              userId={user?.id || ''}
            />
          )}

          {activeTab === 'missions' && (
            <MissionsPage
              onRewardClaimed={handleRewardClaimed}
              userId={user?.id || ''}
              isAdmin={Boolean(user?.isAdmin)}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsView
              userId={user?.id || ''}
              botUsername={botUsername}
              onBalanceUpdated={() => sync()}
            />
          )}

          {activeTab === 'wallet' && (
            <WalletPage
              tonBalance={liveTonBalance}
              onWithdrawalRequested={sync}
              onPromoRedeemed={sync}
              userId={user?.id || ''}
            />
          )}

          {activeTab === 'admin' && <AdminPage />}
        </main>

        {/* Bottom Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isAdmin={Boolean(user?.isAdmin)}
        />

        {/* 7-Day Roadmap Modal */}
        {dailyModalOpen && dailyStatus && (
          <DailyStreakModal
            userId={user?.id || ''}
            statusData={dailyStatus}
            onClose={() => setDailyModalOpen(false)}
            onClaimSuccess={handleDailyClaimSuccess}
          />
        )}

        {/* Obsidian Glass Full-Screen Ad Overlay Modal (5s Countdown Fallback) */}
        <AdOverlayModal />
      </div>
    </TonConnectUIProvider>
  );
};
