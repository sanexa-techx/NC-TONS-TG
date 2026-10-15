import React, { useState, useEffect } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { ShieldCheck, ShieldAlert, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
      'UQD-1VqX4bF-8VfR8zL4wR9Yv9_6xK7uP4bT2hQ9wY7eN8mK'
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
          ? 'bg-[#ECFDF5] border border-emerald-200 p-3.5 shadow-2xs'
          : 'bg-gradient-to-br from-[#EFF6FF] via-white to-[#F0FDF4] border-2 border-blue-200 p-4 shadow-sm'
      } ${className}`}
    >
      {/* Top Bar: Title & Account Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              isVerified
                ? 'bg-emerald-100 text-[#059669]'
                : 'bg-blue-100 text-[#2563EB]'
            }`}
          >
            {isVerified ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              {isVerified ? 'Account Verified' : 'Account Verification Gate'}
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              {isVerified ? 'Withdrawals unlocked' : 'Anti-bot security clearance'}
            </p>
          </div>
        </div>

        {/* Account Status Badge: "Verified" vs "0.05 TON Fee" */}
        {isVerified ? (
          <span className="px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#059669] border border-emerald-300 text-[10px] font-extrabold font-mono flex items-center space-x-1 shadow-2xs">
            <CheckCircle2 size={11} className="text-[#059669]" />
            <span>Verified</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-extrabold font-mono flex items-center space-x-1 shadow-2xs">
            <Lock size={10} className="text-amber-600" />
            <span>0.05 TON Fee</span>
          </span>
        )}
      </div>

      {/* Anti-Bot Fee Notice */}
      {isVerified ? (
        <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center space-x-2 text-[11px] text-[#059669]">
          <CheckCircle2 size={14} className="shrink-0 text-[#10B981]" />
          <span className="font-medium">
            Your wallet is verified! All withdrawal locks are permanently removed.
          </span>
        </div>
      ) : (
        <div className="mt-2.5 pt-2.5 border-t border-blue-100/80">
          <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
            <span className="font-semibold text-slate-800">Anti-Bot Notice:</span> To prevent bot syndicates and authenticate non-custodial wallet ownership, a one-time network fee of{' '}
            <strong className="text-[#2563EB] font-bold">0.05 TON (50,000,000 nanotons)</strong> is required to unlock your payout wallet.
          </p>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-[#FEF2F2] border border-red-200 text-[#DC2626] text-[11px] flex items-center space-x-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-[#059669] text-[11px] flex items-center space-x-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Solid Cobalt Blue Payment Button */}
          <button
            type="button"
            onClick={handlePayVerificationFee}
            disabled={isPayingFee}
            className="w-full py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
          >
            {isPayingFee ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Broadcasting & Verifying...</span>
              </>
            ) : (
              <>
                <TonIcon className="w-4 h-4 text-white" />
                <span>Pay 0.05 TON &amp; Unlock Wallet</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletVerificationCard;
