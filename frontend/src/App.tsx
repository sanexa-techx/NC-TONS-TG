import React, { useState, useEffect, useCallback } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { UserProfile } from './types/index.js';
import { api } from './services/api.js';
import { useMining } from './hooks/useMining.js';
import { Navbar, NavTab } from './components/Navbar.js';
import { DevTelegramBar } from './components/DevTelegramBar.js';
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
import { useAdManager } from './hooks/useAdManager.js';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('mining');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [dailyStatus, setDailyStatus] = useState<DailyStreakStatusResponse | null>(null);
  const [dailyModalOpen, setDailyModalOpen] = useState<boolean>(false);

  const {
    mining,
    liveTonBalance,
    livePowerPercentage,
    recharge,
    sync,
    setMiningState,
  } = useMining();

  const { triggerInterstitial } = useAdManager(user?.id || '9990001');

  const handleTabChange = (newTab: NavTab) => {
    if (newTab !== activeTab) {
      triggerInterstitial('nav');
      setActiveTab(newTab);
    }
  };

  const initAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await api.verifyAuth();
      setUser(res.user);
      setMiningState(res.mining);

      // Fetch daily streak status and auto-popup if ready
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
  }, [initAuth]);

  const handleGameFinished = (_ncAwarded: number, _tonAwarded: string) => {
    // Refresh state after game round
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan mb-4 shadow-glow-cyan animate-pulse">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">INITIALIZING MINING RIG</h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">Connecting to NC TONs nodes...</p>
      </div>
    );
  }

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <div className="min-h-screen bg-cyber-bg text-slate-100 flex flex-col">
        {/* Dev Mode Banner for testing in standard desktop browser */}
        <DevTelegramBar
          currentUserId={user?.id || '9990001'}
          isAdmin={Boolean(user?.isAdmin)}
          onUserChanged={initAuth}
          onSync={sync}
        />

        {/* Sticky Profile Header — spec: bg-neutral-900/80, full-width, profile left, online badge right */}
        <header className="sticky top-0 z-20 w-full bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800/80 px-4 py-2.5 shadow-sm">
          <div className="w-full max-w-md mx-auto flex items-center justify-between gap-3">
            {/* Real Telegram Profile Bar */}
            <UserProfileHeader
              user={user}
              livePowerPercentage={livePowerPercentage}
              liveTonBalance={liveTonBalance}
            />

            {/* Real-time Online Players Beacon */}
            <OnlinePlayersBadge userId={user?.id} />
          </div>
        </header>

        {/* Main Content Pages */}
        <main className="flex-1 w-full max-w-md mx-auto">
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
              userId={user?.id || '9990001'}
            />
          )}

          {activeTab === 'missions' && (
            <MissionsPage
              onRewardClaimed={handleRewardClaimed}
              userId={user?.id || '9990001'}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsView
              userId={user?.id || '9990001'}
              onBalanceUpdated={() => sync()}
            />
          )}

          {activeTab === 'wallet' && (
            <WalletPage
              tonBalance={liveTonBalance}
              onWithdrawalRequested={sync}
              onPromoRedeemed={sync}
              userId={user?.id || '9990001'}
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
            userId={user?.id || '9990001'}
            statusData={dailyStatus}
            onClose={() => setDailyModalOpen(false)}
            onClaimSuccess={handleDailyClaimSuccess}
          />
        )}
      </div>
    </TonConnectUIProvider>
  );
};
