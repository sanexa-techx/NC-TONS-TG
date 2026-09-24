import React, { useEffect, useState, useCallback } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import { WithdrawalRecord, DailyAdStatusResponse } from '../types/index.js';
import { api } from '../services/api.js';
import { Wallet, ArrowDownRight, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { TonIcon } from '../components/icons/index.js';
import { PromoRedeemCard } from '../components/PromoRedeemCard.js';
import { useAdManager } from '../hooks/useAdManager.js';

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

  const { triggerInterstitial } = useAdManager(userId || '');

  // Auto-fill connected TON address if available
  useEffect(() => {
    if (connectedAddress) {
      setTonAddress(connectedAddress);
    }
  }, [connectedAddress]);

  const fetchAdStatus = useCallback(async () => {
    try {
      const data = await api.getAdStatus(userId);
      setAdStatus(data);
    } catch (e) {
      console.warn('Could not fetch ad status for wallet gate:', e);
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
  }, [fetchHistory, fetchAdStatus]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerInterstitial('withdraw');
    setStatusMessage(null);
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
      onWithdrawalRequested();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: (err as Error).message || 'Withdrawal failed',
      });
      fetchAdStatus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetMax = () => {
    const balNum = parseFloat(tonBalance);
    if (balNum > 0) {
      setTonAmount(balNum.toFixed(4));
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
            className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-3.5 transition-all ${
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
                  Adsgram: {adStatus.adsgram.watched}/8 • Monetag: {adStatus.monetag.watched}/4
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold">
              {adStatus.canWithdraw ? '✅ Verified' : '🔒 Views Req.'}
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
                Amount (Min: 0.01 TON)
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
    </div>
  );
};
