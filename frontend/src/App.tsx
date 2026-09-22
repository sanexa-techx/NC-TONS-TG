import React, { useState, useEffect, useCallback } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { UserProfile } from './types/index.js';
import { api } from './services/api.js';
import { useMining } from './hooks/useMining.js';
import { Navbar } from './components/Navbar.js';
import { DevTelegramBar } from './components/DevTelegramBar.js';
import { MiningDashboard } from './pages/MiningDashboard.js';
import { GamePage } from './pages/GamePage.js';
import { MissionsPage } from './pages/MissionsPage.js';
import { WalletPage } from './pages/WalletPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { OnlinePlayersBadge } from './components/OnlinePlayersBadge.js';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mining' | 'game' | 'missions' | 'wallet' | 'admin'>('mining');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const {
    mining,
    liveTonBalance,
    livePowerPercentage,
    recharge,
    sync,
    setMiningState,
  } = useMining();

  const initAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await api.verifyAuth();
      setUser(res.user);
      setMiningState(res.mining);
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

        {/* Sticky Corner Status Header with Real-time Online Players Badge */}
        <header className="sticky top-0 z-20 bg-cyber-bg/85 backdrop-blur-md border-b border-cyber-border/40 py-1.5 px-4 shadow-sm">
          <div className="w-full max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-xs tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-white to-cyber-blue font-mono">
                NC TONs
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-semibold">MINING RIG</span>
            </div>

            {/* Corner Real-time Online Players Badge */}
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
              onRecharge={recharge}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'game' && <GamePage onGameFinished={handleGameFinished} />}

          {activeTab === 'missions' && <MissionsPage onRewardClaimed={handleRewardClaimed} />}

          {activeTab === 'wallet' && (
            <WalletPage
              tonBalance={liveTonBalance}
              onWithdrawalRequested={sync}
              onPromoRedeemed={sync}
            />
          )}

          {activeTab === 'admin' && <AdminPage />}
        </main>

        {/* Bottom Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={Boolean(user?.isAdmin)}
        />
      </div>
    </TonConnectUIProvider>
  );
};
