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
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB]">
            <Wallet size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Wallet & Payouts</h2>
            <p className="text-[11px] text-slate-500">Withdraw mined TON to your wallet</p>
          </div>
        </div>

        {/* TON Connect Button */}
        <div>
          <TonConnectButton className="scale-90" />
        </div>
      </div>

      {/* Dual Balance Display: "+0.050M NC" in mint & "23.374 TON" in cobalt */}
      <div className="grid grid-cols-2 gap-2.5 w-full mb-4">
        {/* NC Fuel Balance */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#10B981]/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <NcIcon className="w-4 h-4" />
            <span className="font-bold tracking-wide uppercase text-[10px] text-emerald-600">NC Coins</span>
          </div>
          <div className="text-xl font-black font-mono text-[#10B981] tracking-tight truncate flex items-center space-x-1">
            <span>+0.050M</span>
            <span className="text-xs text-emerald-600/70 ml-1">NC</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Mining Fuel Supply</span>
        </div>

        {/* TON Withdrawable Balance */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#2563EB]/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <TonIcon className="w-4 h-4" />
            <span className="font-bold tracking-wide uppercase text-[10px] text-[#2563EB]">TON Coin</span>
          </div>
          <div className="text-xl font-black font-mono text-[#2563EB] tracking-tight truncate flex items-center space-x-1">
            <span>{parseFloat(tonBalance) > 0 ? tonBalance : '23.374'}</span>
            <span className="text-xs text-[#2563EB]/70 ml-1">TON</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Withdrawable Real TON</span>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="w-full bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs mb-6">
        <h3 className="text-xs font-bold font-mono uppercase text-slate-700 mb-3 flex items-center space-x-1.5">
          <ArrowDownRight size={16} className="text-[#2563EB]" />
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
            className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-3 transition-all ${
              adStatus.canWithdraw
                ? 'bg-[#ECFDF5] border-emerald-200 text-[#059669]'
                : 'bg-[#FFFBEB] border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {adStatus.canWithdraw ? (
                <ShieldCheck size={18} className="text-[#10B981] shrink-0" />
              ) : (
                <Lock size={18} className="text-amber-500 shrink-0" />
              )}
              <div>
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <span>Daily Withdrawal Gate</span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-white border border-current font-semibold">
                    {adStatus.canWithdraw ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5 font-mono">
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
            className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-3.5 transition-all ${
              levelStatus.canWithdrawOverHalfTon
                ? 'bg-[#EFF6FF] border-blue-200 text-[#2563EB]'
                : 'bg-[#FFFBEB] border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {levelStatus.canWithdrawOverHalfTon ? (
                <ShieldCheck size={18} className="text-[#2563EB] shrink-0" />
              ) : (
                <Lock size={18} className="text-amber-500 shrink-0" />
              )}
              <div>
                <div className="font-bold text-[11px] flex items-center gap-1.5">
                  <span>Rig Level {levelStatus.currentLevel} Payout Tier</span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-white border border-current font-semibold">
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
              <label className="text-[11px] font-mono text-slate-600 font-semibold uppercase">
                TON Wallet Address
              </label>
              {connectedAddress && (
                <span className="text-[10px] text-[#2563EB] font-mono font-bold">Connected</span>
              )}
            </div>
            <input
              type="text"
              value={tonAddress}
              onChange={(e) => setTonAddress(e.target.value)}
              placeholder="UQD..."
              required
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono text-slate-600 font-semibold uppercase">
                Amount (Min: 0.01 TON • {levelStatus?.canWithdrawOverHalfTon ? 'Max: Unlimited' : 'Tier 1 Max: 0.5 TON'})
              </label>
              <button
                type="button"
                onClick={handleSetMax}
                className="text-[10px] text-[#2563EB] font-bold font-mono hover:underline"
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
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#2563EB] pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400 flex items-center space-x-1">
                <TonIcon className="w-3.5 h-3.5" />
                <span className="text-slate-600 font-semibold">TON</span>
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
            className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-sm active:scale-98 transition-all flex items-center justify-center space-x-2 ${
              !isAccountVerified
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300/80 shadow-none'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer shadow-md'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
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
        <h3 className="text-xs font-bold font-mono uppercase text-slate-600 mb-2 px-1">
          Recent Payout Requests
        </h3>

        {loadingHistory ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] text-center text-xs text-slate-500 shadow-xs">
            No withdrawal requests yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((record) => (
              <div
                key={record.id}
                className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-slate-900 flex items-center space-x-1.5">
                    <TonIcon className="w-3.5 h-3.5" />
                    <span>{record.tonAmount} TON</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      #{record.id}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[180px]">
                    {record.tonAddress}
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {record.status === 'APPROVED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-emerald-200 text-[10px] font-bold font-mono flex items-center space-x-1">
                      <CheckCircle2 size={10} />
                      <span>APPROVED</span>
                    </span>
                  ) : record.status === 'REJECTED' ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-red-200 text-[10px] font-bold font-mono flex items-center space-x-1">
                      <XCircle size={10} />
                      <span>REFUNDED</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] text-amber-700 border border-amber-200 text-[10px] font-bold font-mono flex items-center space-x-1">
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
      <div className="w-full mt-6 mb-2 pt-4 border-t border-[#E2E8F0] flex items-center justify-center gap-3 text-[11px] font-mono text-slate-500">
        <button
          onClick={() => setLegalModalTab('terms')}
          className="hover:text-[#2563EB] underline underline-offset-4 transition-colors"
        >
          Terms & Conditions
        </button>
        <span>•</span>
        <button
          onClick={() => setLegalModalTab('privacy')}
          className="hover:text-[#2563EB] underline underline-offset-4 transition-colors"
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
