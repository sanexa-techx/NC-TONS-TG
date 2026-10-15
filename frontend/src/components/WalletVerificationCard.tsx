import React, { useState, useEffect } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { TonIcon } from './icons/index.js';
import { api } from '../services/api.js';
import confetti from 'canvas-confetti';

interface WalletVerificationCardProps {
  userId?: number | string;
  isVerified: boolean;
  onVerificationSuccess: () => void;
  className?: string;
}

export const WalletVerificationCard: React.FC<WalletVerificationCardProps> = ({
  userId,
  isVerified,
  onVerificationSuccess,
  className = '',
}) => {
  const [tonConnectUI] = useTonConnectUI();
  const connectedAddress = useTonAddress();

  const [isPayingFee, setIsPayingFee] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [adminWallet, setAdminWallet] = useState<string>(
    (import.meta as any).env?.VITE_ADMIN_RECEIVER_WALLET ||
      'UQC7H_l-uAuupnB1tplVxMCKeImLbv1vzJhKnVDDJyg9V97v'
  );

  useEffect(() => {
    let isMounted = true;
    api
      .getAccountVerificationStatus(userId)
      .then((res) => {
        if (isMounted) {
          if (res.adminReceiverWallet) {
            setAdminWallet(res.adminReceiverWallet);
          }
          if (res.isVerified && !isVerified) {
            onVerificationSuccess();
          }
        }
      })
      .catch((err) => {
        console.warn('[WalletVerificationCard] config fetch note:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [userId, isVerified, onVerificationSuccess]);

  const handlePayVerificationFee = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Prompt user to connect TON wallet if not yet connected
    if (!connectedAddress) {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('warning');
      }
      tonConnectUI.openModal();
      return;
    }

    setIsPayingFee(true);

    try {
      // 2. Build 50,000,000 nanotons (0.05 TON) transfer request for TON Connect
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 360, // 6 mins validity
        messages: [
          {
            address: adminWallet,
            amount: '50000000', // 50,000,000 nanotons = 0.05 TON
          },
        ],
      };

      console.log('[Verification] Dispatching 0.05 TON tx to:', adminWallet);
      const result = await tonConnectUI.sendTransaction(tx);

      if (!result || !result.boc) {
        throw new Error('Transaction was submitted but no BOC cryptographic proof was returned.');
      }

      console.log('[Verification] Received BOC proof, submitting to backend validation...');

      // 3. Submit BOC proof to backend for PostgreSQL is_verified update
      const verifyRes = await api.verifyAccountWithBoc(
        result.boc,
        connectedAddress,
        userId
      );

      if (verifyRes.success || verifyRes.isVerified) {
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#2563EB', '#10B981', '#38BDF8', '#F59E0B'],
          });
        } catch {}

        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }

        setSuccessMsg(
          verifyRes.message ||
            '0.05 TON fee verified! Withdrawal locks have been permanently removed.'
        );
        onVerificationSuccess();
      } else {
        throw new Error(verifyRes.message || 'Verification failed on backend.');
      }
    } catch (err: any) {
      console.warn('[WalletVerificationCard] Payment error:', err);
      const msg = err?.message || 'Transaction could not be completed';
      if (
        msg.includes('reject') ||
        msg.includes('Reject') ||
        msg.includes('cancel') ||
        msg.includes('User declined')
      ) {
        setErrorMsg('Payment cancelled in wallet. 0.05 TON verification is required to unlock withdrawals.');
      } else {
        setErrorMsg(msg);
      }
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsPayingFee(false);
    }
  };

  return (
    <div
      className={`w-full rounded-2xl transition-all ${
        isVerified
          ? 'bg-emerald-950/45 border border-emerald-500/40 p-3.5 shadow-[0_0_18px_rgba(16,185,129,0.25)] backdrop-blur-xl'
          : 'bg-slate-900/80 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl shadow-lg'
      } ${className}`}
    >
      {/* Line 1: Title "🛡️ Account Verification" + Badge "0.05 TON" / "✓ Verified" */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <ShieldCheck size={16} className={isVerified ? "text-emerald-400" : "text-blue-400"} />
          <span>🛡️ Account Verification</span>
        </h4>

        {isVerified ? (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/80 text-[10px] font-bold font-mono flex items-center space-x-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <CheckCircle2 size={11} className="text-emerald-400" />
            <span>✓ Verified</span>
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/40 text-blue-300 text-[10px] font-bold font-mono flex items-center space-x-1">
            <Lock size={10} className="text-blue-400" />
            <span>0.05 TON</span>
          </span>
        )}
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="mt-2.5 p-2 rounded-xl bg-red-950/60 border border-red-500/40 text-[11px] flex items-center space-x-2 text-red-200">
          <AlertCircle size={14} className="shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center space-x-2 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
          <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Line 2: Button "💎 Verify Wallet (0.05 TON)" */}
      {!isVerified && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={handlePayVerificationFee}
            disabled={isPayingFee}
            className="w-full py-2.5 px-4 rounded-xl btn-cobalt-glass font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
          >
            {isPayingFee ? (
              <>
                <Loader2 size={15} className="animate-spin text-blue-300" />
                <span>Broadcasting &amp; Verifying...</span>
              </>
            ) : (
              <>
                <TonIcon className="w-4 h-4 text-blue-200" />
                <span>💎 Verify Wallet (0.05 TON)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletVerificationCard;
