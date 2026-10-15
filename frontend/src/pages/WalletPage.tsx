import React, { useEffect, useState, useCallback } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import { WithdrawalRecord, DailyAdStatusResponse, LevelStatusResponse } from '../types/index.js';
import { api } from '../services/api.js';
import { Wallet, ArrowDownRight, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { TonIcon, NcIcon } from '../components/icons/index.js';
import { PromoRedeemCard } from '../components/PromoRedeemCard.js';
import { useAdManager } from '../hooks/useAdManager.js';
import { LegalModal } from '../components/LegalModal.js';
import WithdrawalLimitsCard from '../components/WithdrawalLimitsCard.js';
import { WalletVerificationCard } from '../components/WalletVerificationCard.js';

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
  const [limitsRefreshKey, setLimitsRefreshKey] = useState<number>(0);
  const [levelStatus, setLevelStatus] = useState<LevelStatusResponse | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | null>(null);
  const [isAccountVerified, setIsAccountVerified] = useState<boolean>(false);

  const fetchVerification = useCallback(async () => {
    try {
      const data = await api.getAccountVerificationStatus(userId);
      setIsAccountVerified(Boolean(data.isVerified));
    } catch (e) {
      console.warn('Could not fetch account verification status:', e);
    }
  }, [userId]);

  const fetchWithdrawalStatus = useCallback(() => {
    setLimitsRefreshKey((k) => k + 1);
  }, []);

  const fetchAdStatus = useCallback(async () => {
    try {
      const data = await api.getAdStatus(userId);
      setAdStatus(data);
    } catch (e) {
      console.warn('Could not fetch ad status for wallet gate:', e);
    }
  }, [userId]);

  const { triggerInterstitial } = useAdManager(
    userId || '',
    () => {
      fetchWithdrawalStatus();
      fetchAdStatus();
    }
  );

  // Auto-fill connected TON address if available
  useEffect(() => {
    if (connectedAddress) {
      setTonAddress(connectedAddress);
    }
  }, [connectedAddress]);

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
    fetchVerification();
  }, [fetchHistory, fetchAdStatus, fetchWithdrawalStatus, fetchLevelStatus, fetchVerification]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerInterstitial('withdraw');
    setStatusMessage(null);

    if (!isAccountVerified) {
      setStatusMessage({
        type: 'error',
        text: 'Account verification required! Please pay the one-time 0.05 TON anti-bot fee above to unlock withdrawals.',
      });
      return;
    }

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
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <Wallet size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Wallet &amp; Payouts</h2>
            <p className="text-[11px] text-slate-400">Withdraw mined TON to your wallet</p>
          </div>
        </div>

        {/* TON Connect Button */}
        <div>
          <TonConnectButton className="scale-90" />
        </div>
      </div>

      {/* Top Full-Width Glowing Amber Gold Bar ("+0.050M NC") */}
      <div className="w-full btn-amber-glass rounded-2xl p-3.5 border border-amber-400/70 shadow-[0_0_18px_rgba(245,158,11,0.3)] backdrop-blur-md flex items-center justify-between mb-2.5">
        <div>
          <p className="text-[9px] uppercase font-bold text-amber-300 tracking-wider">Mining Fuel Supply</p>
          <div className="text-xl font-black font-mono text-amber-100 tracking-tight mt-0.5 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">
            +0.050M <span className="text-xs text-amber-300">NC</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
          <NcIcon className="w-4 h-4" />
        </div>
      </div>

      {/* Stacked Above Glowing Cobalt Blue Bar ("23.374 TON") with 3D Blue Diamond Accent */}
      <div className="w-full btn-cobalt-glass rounded-2xl p-3.5 border border-blue-400/80 shadow-[0_0_20px_rgba(37,99,235,0.4)] backdrop-blur-md flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">Withdrawable Real TON</p>
          <div className="text-xl font-black font-mono text-blue-100 tracking-tight mt-0.5 drop-shadow-[0_0_12px_rgba(37,99,235,0.7)] flex items-center gap-1.5">
            <span>{parseFloat(tonBalance) > 0 ? tonBalance : '23.374'}</span>
            <span className="text-xs text-blue-300">TON</span>
          </div>
        </div>
        {/* 3D Blue Diamond Accent */}
        <div className="w-9 h-9 rounded-2xl bg-blue-600/30 border border-blue-400 flex items-center justify-center shadow-[0_0_16px_rgba(37,99,235,0.6)] animate-pulse">
          <span className="text-lg">💎</span>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="w-full obsidian-card p-4 rounded-2xl border border-white/10 shadow-2xl shadow-black/80 mb-6">
        <h3 className="text-xs font-black font-mono uppercase text-white mb-3 flex items-center space-x-1.5">
          <ArrowDownRight size={16} className="text-blue-400" />
          <span>Request TON Payout</span>
        </h3>

        {statusMessage && (
          <div
            className={`p-3 mb-4 rounded-xl text-xs flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-[#ECFDF5] text-[#059669] border border-emerald-200'
                : 'bg-[#FEF2F2] text-[#DC2626] border border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Daily Ad Withdrawal Gatekeeper HUD */}
        {adStatus && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-3 transition-all backdrop-blur-xl ${
              adStatus.canWithdraw
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
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
                  <span className="text-white">Daily Withdrawal Gate</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-950/70 border border-white/10 text-white font-semibold">
                    {adStatus.canWithdraw ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5 font-mono text-slate-300">
                  Monetag (Main): {adStatus.monetag.watched}/4 • Adsgram (Missions): {adStatus.adsgram.watched}/8
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold">
              {adStatus.canWithdraw ? '✅ Verified' : '🔒 Views Req.'}
            </span>
          </div>
        )}

        {/* Withdrawal Quotas & Limit Breaker Engine */}
        {userId && (
          <WithdrawalLimitsCard
            key={limitsRefreshKey}
            userId={userId}
            onLimitUnlocked={() => {
              fetchWithdrawalStatus();
              fetchAdStatus();
            }}
          />
        )}

        {/* Miner Level Payout Tier HUD */}
        {levelStatus && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-3.5 transition-all backdrop-blur-xl ${
              levelStatus.canWithdrawOverHalfTon
                ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {levelStatus.canWithdrawOverHalfTon ? (
                <ShieldCheck size={18} className="text-blue-400 shrink-0" />
              ) : (
                <Lock size={18} className="text-amber-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <span className="text-white">Rig Level {levelStatus.currentLevel} Payout Tier</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-950/70 border border-white/10 text-white font-semibold">
                    {levelStatus.canWithdrawOverHalfTon ? 'UNLIMITED' : 'MAX 0.5 TON'}
                  </span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5 text-slate-300">
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
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase">
                TON Wallet Address
              </label>
              {connectedAddress && (
                <span className="text-[10px] text-blue-400 font-mono font-bold">Connected</span>
              )}
            </div>
            <input
              type="text"
              value={tonAddress}
              onChange={(e) => setTonAddress(e.target.value)}
              placeholder="UQD..."
              required
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase">
                Amount (Min: 0.01 TON • {levelStatus?.canWithdrawOverHalfTon ? 'Max: Unlimited' : 'Tier 1 Max: 0.5 TON'})
              </label>
              <button
                type="button"
                onClick={handleSetMax}
                className="text-[10px] text-blue-400 font-bold font-mono hover:underline cursor-pointer"
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
                className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-400 pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400 flex items-center space-x-1">
                <TonIcon className="w-3.5 h-3.5" />
                <span className="text-slate-300 font-semibold">TON</span>
              </span>
            </div>
          </div>

          {/* Wallet Verification Card: 0.05 TON Anti-Bot Fee & Unlock Gate */}
          <WalletVerificationCard
            userId={userId}
            isVerified={isAccountVerified}
            onVerificationSuccess={() => {
              setIsAccountVerified(true);
              fetchVerification();
              fetchWithdrawalStatus();
              onWithdrawalRequested();
            }}
            className="my-3"
          />

          <button
            type="submit"
            disabled={submitting || !isAccountVerified}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
              !isAccountVerified
                ? 'btn-smoked-glass text-slate-400 cursor-not-allowed border border-white/10'
                : 'btn-cobalt-glass cursor-pointer text-blue-100 shadow-[0_0_20px_rgba(37,99,235,0.4)]'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-blue-300" />
                <span>Processing Request...</span>
              </>
            ) : !isAccountVerified ? (
              <>
                <Lock size={15} />
                <span>Locked • Complete 0.05 TON Verification</span>
              </>
            ) : (
              <span>Withdraw TON Now</span>
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
          <div className="py-6 text-center text-xs text-slate-400">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center text-xs text-slate-400 shadow-lg">
            No withdrawal requests yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((record) => (
              <div
                key={record.id}
                className="obsidian-card-sm p-3 rounded-xl border border-white/10 shadow-md flex items-center justify-between text-xs backdrop-blur-md"
              >
                <div>
                  <div className="font-mono font-bold text-white flex items-center space-x-1.5">
                    <TonIcon className="w-3.5 h-3.5" />
                    <span>{record.tonAmount} TON</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      #{record.id}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[180px]">
                    {record.tonAddress}
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {record.status === 'APPROVED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold font-mono flex items-center space-x-1">
                      <CheckCircle2 size={10} />
                      <span>APPROVED</span>
                    </span>
                  ) : record.status === 'REJECTED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-500/40 text-[10px] font-bold font-mono flex items-center space-x-1">
                      <XCircle size={10} />
                      <span>REFUNDED</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold font-mono flex items-center space-x-1">
                      <Clock size={10} />
                      <span>PENDING</span>
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400 font-mono mt-1">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legal & Compliance Footer Links */}
      <div className="w-full mt-6 mb-2 pt-4 border-t border-white/10 flex items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
        <button
          onClick={() => setLegalModalTab('terms')}
          className="hover:text-blue-400 underline underline-offset-4 transition-colors cursor-pointer"
        >
          Terms &amp; Conditions
        </button>
        <span>•</span>
        <button
          onClick={() => setLegalModalTab('privacy')}
          className="hover:text-blue-400 underline underline-offset-4 transition-colors cursor-pointer"
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
