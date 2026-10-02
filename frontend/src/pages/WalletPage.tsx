import React, { useEffect, useState, useCallback } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import { WithdrawalRecord, DailyAdStatusResponse, LevelStatusResponse, WithdrawalStatusResponse } from '../types/index.js';
import { api } from '../services/api.js';
import { Wallet, ArrowDownRight, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, ShieldCheck, Lock, Sparkles, Play } from 'lucide-react';
import { TonIcon } from '../components/icons/index.js';
import { PromoRedeemCard } from '../components/PromoRedeemCard.js';
import { useAdManager } from '../hooks/useAdManager.js';
import { LegalModal } from '../components/LegalModal.js';

interface WalletPageProps {
  tonBalance: string;
  onWithdrawalRequested: () => void;
  onPromoRedeemed?: () => void;
  userId?: number | string;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  tonBalance,
  onWithdrawalRequested,
  onPromoRedeemed,
  userId,
}) => {
  const connectedAddress = useTonAddress();
  const [tonAddress, setTonAddress] = useState<string>('');
  const [tonAmount, setTonAmount] = useState<string>('');
  const [history, setHistory] = useState<WithdrawalRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adStatus, setAdStatus] = useState<DailyAdStatusResponse | null>(null);
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatusResponse | null>(null);
  const [loadingLimitAd, setLoadingLimitAd] = useState<boolean>(false);
  const [limitAdCooldown, setLimitAdCooldown] = useState<number>(0);
  const [levelStatus, setLevelStatus] = useState<LevelStatusResponse | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | null>(null);

  const fetchWithdrawalStatus = useCallback(async () => {
    try {
      const data = await api.getWithdrawalStatus(userId);
      setWithdrawalStatus(data);
    } catch (e) {
      console.warn('Could not fetch withdrawal limits status:', e);
    }
  }, [userId]);

  const fetchAdStatus = useCallback(async () => {
    try {
      const data = await api.getAdStatus(userId);
      setAdStatus(data);
    } catch (e) {
      console.warn('Could not fetch ad status for wallet gate:', e);
    }
  }, [userId]);

  const { triggerInterstitial, showWithdrawalLimitAd } = useAdManager(
    userId || '',
    () => {
      fetchWithdrawalStatus();
      fetchAdStatus();
      setLimitAdCooldown(10);
    }
  );

  // Auto-fill connected TON address if available
  useEffect(() => {
    if (connectedAddress) {
      setTonAddress(connectedAddress);
    }
  }, [connectedAddress]);

  useEffect(() => {
    if (limitAdCooldown <= 0) return;
    const timer = setInterval(() => {
      setLimitAdCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [limitAdCooldown]);

  const fetchLevelStatus = useCallback(async () => {
    try {
      const data = await api.getLevelStatus(userId);
      setLevelStatus(data);
    } catch (e) {
      console.warn('Could not fetch level status for wallet:', e);
    }
  }, [userId]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.getWithdrawalHistory();
      setHistory(res.history);
    } catch (err) {
      console.warn('Could not load withdrawal history:', (err as Error).message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchAdStatus();
    fetchWithdrawalStatus();
    fetchLevelStatus();
  }, [fetchHistory, fetchAdStatus, fetchWithdrawalStatus, fetchLevelStatus]);

  const handleWatchLimitAd = async () => {
    if (limitAdCooldown > 0 || loadingLimitAd) return;
    setLoadingLimitAd(true);
    setStatusMessage(null);
    try {
      const res = await showWithdrawalLimitAd();
      if (res?.success) {
        setStatusMessage({
          type: 'success',
          text: `Ad verified! +1 added to daily & weekly limit passes (+${res.reward?.nc || 200} NC, +${res.reward?.ton || '0.00025'} TON).`,
        });
        setLimitAdCooldown(10);
        await fetchWithdrawalStatus();
        await fetchAdStatus();
      }
    } catch (err: any) {
      console.warn('Watch limit ad error:', err);
    } finally {
      setLoadingLimitAd(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerInterstitial('withdraw');
    setStatusMessage(null);

    const amountNum = parseFloat(tonAmount);
    if (levelStatus && !levelStatus.canWithdrawOverHalfTon && amountNum > 0.5) {
      setStatusMessage({
        type: 'error',
        text: 'Level 2 required to withdraw more than 0.5 TON! Watch 50 ads today in Missions to level up.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.requestWithdrawal(tonAddress, tonAmount);
      setStatusMessage({
        type: 'success',
        text: `Withdrawal request #${res.withdrawal.id} dispatched to Admin Channel for review.`,
      });
      setTonAmount('');
      fetchHistory();
      fetchAdStatus();
      fetchWithdrawalStatus();
      fetchLevelStatus();
      onWithdrawalRequested();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: (err as Error).message || 'Withdrawal failed',
      });
      fetchAdStatus();
      fetchWithdrawalStatus();
      fetchLevelStatus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetMax = () => {
    const balNum = parseFloat(tonBalance);
    if (balNum > 0) {
      // If Level 1, limit MAX to 0.5 TON
      if (levelStatus && !levelStatus.canWithdrawOverHalfTon && balNum > 0.5) {
        setTonAmount('0.5000');
        setStatusMessage({
          type: 'error',
          text: 'Notice: Level 1 payout cap is 0.5 TON. Amount set to 0.5000 TON. Level up to Level 2 to withdraw your entire balance!',
        });
      } else {
        setTonAmount(balNum.toFixed(4));
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      {/* Header */}
      <div className="w-full flex items-center justify-between py-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan">
            <Wallet size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Wallet & Payouts</h2>
            <p className="text-[11px] text-slate-400">Withdraw mined TON to your wallet</p>
          </div>
        </div>

        {/* TON Connect Button */}
        <div>
          <TonConnectButton className="scale-90" />
        </div>
      </div>

      {/* Available Balance Card */}
      <div className="w-full glass-panel-glow p-4 rounded-2xl border border-cyber-cyan/30 mb-4 relative overflow-hidden">
        <div className="text-xs text-slate-400 uppercase font-mono mb-1">Withdrawable Balance</div>
        <div className="text-3xl font-black font-mono text-cyber-cyan tracking-tight flex items-center space-x-2">
          <TonIcon className="w-8 h-8 drop-shadow-md" />
          <span>{tonBalance}</span>
          <span className="text-base text-cyber-cyan/70">TON</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
          <Clock size={12} className="text-cyber-cyan" />
          <span>Admin-verified channel payout workflow enabled</span>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="w-full glass-panel p-4 rounded-2xl border border-cyber-border mb-6">
        <h3 className="text-xs font-bold font-mono uppercase text-slate-300 mb-3 flex items-center space-x-1.5">
          <ArrowDownRight size={16} className="text-cyber-cyan" />
          <span>Request TON Payout</span>
        </h3>

        {statusMessage && (
          <div
            className={`p-3 mb-4 rounded-xl text-xs flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-cyber-green/15 text-cyber-green border border-cyber-green/40'
                : 'bg-cyber-red/15 text-cyber-red border border-cyber-red/40'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Daily Ad Withdrawal Gatekeeper HUD */}
        {adStatus && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-3 transition-all ${
              adStatus.canWithdraw
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {adStatus.canWithdraw ? (
                <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              ) : (
                <Lock size={18} className="text-amber-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <span>Daily Withdrawal Gate</span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/40 border border-current">
                    {adStatus.canWithdraw ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  Monetag (Main): {adStatus.monetag.watched}/4 • Adsgram (Missions): {adStatus.adsgram.watched}/8
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold">
              {adStatus.canWithdraw ? '✅ Verified' : '🔒 Views Req.'}
            </span>
          </div>
        )}

        {/* Withdrawal Quotas & Unlock Pass HUD (Daily 1 time / 30 ads & Weekly 5 times / 100 ads) */}
        {withdrawalStatus && (
          <div className="w-full glass-panel p-3.5 rounded-2xl border border-cyan-500/30 mb-3 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/30 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-cyber-cyan/20 text-cyber-cyan flex items-center justify-center">
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Withdrawal Quotas & Passes</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30">
                      Separate from Gate
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Daily max 1 time (30 ads) • Weekly max 5 times (100 ads)
                  </p>
                </div>
              </div>
            </div>

            {/* Daily & Weekly Cards Grid */}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              {/* Daily Limit Card */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-300">Daily Quota</span>
                    <span
                      className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        withdrawalStatus.daily.isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {withdrawalStatus.daily.isUnlocked ? 'PASS ACTIVE ✅' : '30 ADS REQ 🔒'}
                    </span>
                  </div>
                  <div className="text-xs font-bold font-mono text-white mb-0.5">
                    {withdrawalStatus.daily.used} / {withdrawalStatus.daily.limit} Today
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono mb-1.5 flex justify-between">
                    <span>Ads: {withdrawalStatus.daily.adsWatched}/{withdrawalStatus.daily.adsRequired}</span>
                    <span className="text-cyber-cyan font-bold">
                      {Math.min(100, Math.round((withdrawalStatus.daily.adsWatched / withdrawalStatus.daily.adsRequired) * 100))}%
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        withdrawalStatus.daily.isUnlocked ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((withdrawalStatus.daily.adsWatched / withdrawalStatus.daily.adsRequired) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[8.5px] text-slate-500 font-mono mt-1.5 block">
                  Refreshes daily (00:00 UTC)
                </span>
              </div>

              {/* Weekly Limit Card */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-300">Weekly Quota</span>
                    <span
                      className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        withdrawalStatus.weekly.isUnlocked
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {withdrawalStatus.weekly.isUnlocked ? 'PASS ACTIVE ✅' : '100 ADS REQ 🔒'}
                    </span>
                  </div>
                  <div className="text-xs font-bold font-mono text-white mb-0.5">
                    {withdrawalStatus.weekly.used} / {withdrawalStatus.weekly.limit} This Week
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono mb-1.5 flex justify-between">
                    <span>Ads: {withdrawalStatus.weekly.adsWatched}/{withdrawalStatus.weekly.adsRequired}</span>
                    <span className="text-cyan-400 font-bold">
                      {Math.min(100, Math.round((withdrawalStatus.weekly.adsWatched / withdrawalStatus.weekly.adsRequired) * 100))}%
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        withdrawalStatus.weekly.isUnlocked ? 'bg-cyan-400' : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((withdrawalStatus.weekly.adsWatched / withdrawalStatus.weekly.adsRequired) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[8.5px] text-slate-500 font-mono mt-1.5 block">
                  Resets every Monday (UTC)
                </span>
              </div>
            </div>

            {/* Interactive "Watch Ad" Action for Limit Pass */}
            <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <Sparkles size={13} className="text-cyber-cyan shrink-0" />
                  <span className="truncate">Watch Ad to Unlock Limit</span>
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                  +1 Daily & Weekly • <span className="text-yellow-400 font-bold">+200 NC</span> • <span className="text-blue-400 font-bold">+0.00025 TON</span>
                </div>
                <div className="text-[8.5px] text-amber-400/90 font-mono mt-0.5">
                  * Does not count towards the 8 Adsgram / 4 Monetag gate
                </div>
              </div>
              <button
                type="button"
                onClick={handleWatchLimitAd}
                disabled={loadingLimitAd || limitAdCooldown > 0}
                className="px-3 py-2 bg-gradient-to-r from-cyber-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-extrabold text-xs rounded-xl shadow-glow-cyan active:scale-95 transition flex items-center gap-1.5 shrink-0"
              >
                {loadingLimitAd ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : limitAdCooldown > 0 ? (
                  <span>Wait ({limitAdCooldown}s)</span>
                ) : (
                  <>
                    <Play size={12} fill="currentColor" />
                    <span>Watch Ad</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Miner Level Payout Tier HUD */}
        {levelStatus && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-3.5 transition-all ${
              levelStatus.canWithdrawOverHalfTon
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {levelStatus.canWithdrawOverHalfTon ? (
                <ShieldCheck size={18} className="text-cyan-400 shrink-0" />
              ) : (
                <Lock size={18} className="text-amber-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <span>Rig Level {levelStatus.currentLevel} Payout Tier</span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/40 border border-current">
                    {levelStatus.canWithdrawOverHalfTon ? 'UNLIMITED' : 'MAX 0.5 TON'}
                  </span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {levelStatus.canWithdrawOverHalfTon
                    ? 'High-Roller VIP unlocked: Withdraw any amount over 0.5 TON'
                    : `Level 1 payout limit: 0.5 TON max (${levelStatus.adsWatchedToday}/50 ads today to unlock Level 2)`}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold">
              {levelStatus.canWithdrawOverHalfTon ? '⚡ VIP' : 'Tier 1'}
            </span>
          </div>
        )}

        <form onSubmit={handleWithdraw} className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">
                TON Wallet Address
              </label>
              {connectedAddress && (
                <span className="text-[10px] text-cyber-cyan font-mono">Connected</span>
              )}
            </div>
            <input
              type="text"
              value={tonAddress}
              onChange={(e) => setTonAddress(e.target.value)}
              placeholder="UQD..."
              required
              className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyber-cyan"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">
                Amount (Min: 0.01 TON • {levelStatus?.canWithdrawOverHalfTon ? 'Max: Unlimited' : 'Tier 1 Max: 0.5 TON'})
              </label>
              <button
                type="button"
                onClick={handleSetMax}
                className="text-[10px] text-cyber-gold font-bold font-mono hover:underline"
              >
                MAX
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0.01"
                value={tonAmount}
                onChange={(e) => setTonAmount(e.target.value)}
                placeholder="0.0500"
                required
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyber-cyan pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400 flex items-center space-x-1">
                <TonIcon className="w-3.5 h-3.5" />
                <span>TON</span>
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-blue text-cyber-bg font-extrabold text-xs uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Request...</span>
              </>
            ) : (
              <span>Submit Withdrawal Request</span>
            )}
          </button>
        </form>
      </div>

      {/* Dynamic Promo Code Redeem Card */}
      <PromoRedeemCard
        onRedeemSuccess={() => {
          if (onPromoRedeemed) {
            onPromoRedeemed();
          } else {
            onWithdrawalRequested();
          }
        }}
        className="mb-6"
      />

      {/* Payout History */}
      <div className="w-full">
        <h3 className="text-xs font-bold font-mono uppercase text-slate-400 mb-2 px-1">
          Recent Payout Requests
        </h3>

        {loadingHistory ? (
          <div className="py-6 text-center text-xs text-slate-500">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="glass-panel p-4 rounded-2xl border border-cyber-border text-center text-xs text-slate-500">
            No withdrawal requests yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((record) => (
              <div
                key={record.id}
                className="glass-panel p-3 rounded-xl border border-cyber-border flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-white flex items-center space-x-1.5">
                    <TonIcon className="w-3.5 h-3.5" />
                    <span>{record.tonAmount} TON</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      #{record.id}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[180px]">
                    {record.tonAddress}
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {record.status === 'APPROVED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-cyber-green/15 text-cyber-green text-[10px] font-bold font-mono flex items-center space-x-1">
                      <CheckCircle2 size={10} />
                      <span>APPROVED</span>
                    </span>
                  ) : record.status === 'REJECTED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-cyber-red/15 text-cyber-red text-[10px] font-bold font-mono flex items-center space-x-1">
                      <XCircle size={10} />
                      <span>REFUNDED</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-cyber-gold/15 text-cyber-gold text-[10px] font-bold font-mono flex items-center space-x-1">
                      <Clock size={10} />
                      <span>PENDING</span>
                    </span>
                  )}
                  <span className="text-[9px] text-slate-500 font-mono mt-1">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legal & Compliance Footer Links */}
      <div className="w-full mt-6 mb-2 pt-4 border-t border-cyber-border/40 flex items-center justify-center gap-3 text-[11px] font-mono text-slate-500">
        <button
          onClick={() => setLegalModalTab('terms')}
          className="hover:text-cyber-cyan underline underline-offset-4 transition-colors"
        >
          Terms & Conditions
        </button>
        <span>•</span>
        <button
          onClick={() => setLegalModalTab('privacy')}
          className="hover:text-cyber-cyan underline underline-offset-4 transition-colors"
        >
          Privacy Policy
        </button>
      </div>

      {/* Embedded Legal Modal */}
      <LegalModal
        isOpen={legalModalTab !== null}
        initialTab={legalModalTab || 'terms'}
        onClose={() => setLegalModalTab(null)}
      />
    </div>
  );
};
