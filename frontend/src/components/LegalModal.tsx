import React, { useState, useEffect } from 'react';
import { X, FileText, ShieldCheck, ExternalLink } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'terms' | 'privacy';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-lg p-5 text-slate-800 flex flex-col max-h-[85vh] shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <h3 className="font-extrabold text-sm tracking-wide text-slate-900">NC TONs Legal & Compliance</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 my-3 p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'terms'
                ? 'bg-[#EFF6FF] text-[#2563EB] border border-blue-200 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'privacy'
                ? 'bg-[#ECFDF5] text-[#059669] border border-emerald-200 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs text-slate-600 leading-relaxed font-sans">
          {activeTab === 'terms' ? (
            <>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900">
                <strong>Notice:</strong> By interacting with the NC TONs Telegram Mini App, you agree to these operational terms and fair-play regulations.
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">1. Acceptance & Eligibility</h4>
                <p className="text-slate-600">
                  Users must be at least 18 years old or legal age of majority in their jurisdiction. By using this Mini App, you confirm compliance with applicable local regulations regarding online entertainment and digital tokens.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">2. In-Game Economy & TON Mining</h4>
                <p className="text-slate-600 mb-1.5">
                  • <strong className="text-slate-800">NC Coins:</strong> Digital utility fuel units for recharging mining rig power, unlocking rig tiers, and participating in platform features.
                </p>
                <p className="text-slate-600 mb-1.5">
                  • <strong className="text-slate-800">TON Rewards:</strong> Real Toncoin rewards minting based on battery uptime, completed missions, and referral crew activity.
                </p>
                <p className="text-slate-600">
                  • <strong className="text-slate-800">Battery Power:</strong> Hashrate continues as long as battery percentage is above 0%. Power can be recharged with NC coins or sponsored ad views.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">3. Arcade Games & Anti-Cheat</h4>
                <p className="text-slate-600">
                  Arcade games (Memory Matrix, 2048, Cyber Car Race, Color Tube Sort) are protected by anti-cheat timing checks. The use of bots, macros, automation scripts, or tampering with client payloads is strictly prohibited and results in immediate forfeiture.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">4. Non-Custodial Withdrawals</h4>
                <p className="text-slate-600">
                  Withdrawals are sent directly to your specified TON wallet via TonConnect or manual input. You are solely responsible for providing an accurate destination address. Daily ad missions must be completed to unlock the withdrawal gate.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">5. Anti-Fraud & Account Integrity</h4>
                <p className="text-slate-600">
                  Operating multi-accounts, fake referral farms, or fraudulent screenshot proofs will trigger automated and manual account termination.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-[11px] text-emerald-900">
                <strong>Non-Custodial & Secure:</strong> We never collect private keys, seed phrases, passwords, or credit card details. Your wallet remains under your exclusive control.
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">1. Information We Collect</h4>
                <p className="text-slate-600 mb-1.5">
                  • <strong className="text-slate-800">Telegram Profile:</strong> Telegram User ID, first name, username, language code, and public avatar URL transmitted via official Telegram WebApp SDK.
                </p>
                <p className="text-slate-600 mb-1.5">
                  • <strong className="text-slate-800">Public TON Address:</strong> Recorded strictly when you connect your non-custodial wallet for payouts.
                </p>
                <p className="text-slate-600">
                  • <strong className="text-slate-800">Game Telemetry:</strong> In-game balances, mining battery level, task completion history, and streak counters.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">2. How Data Is Used</h4>
                <p className="text-slate-600">
                  Data is used solely to maintain user account balances, synchronize mining state, distribute legitimate referral bonuses, process blockchain payouts, and prevent bot abuse.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">3. Third-Party Integrations</h4>
                <p className="text-slate-600">
                  The Mini App interacts with Telegram WebApp API, TON Blockchain nodes, and verified ad networks (Adsgram, Monetag) using anonymous IDs to deliver rewards.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">4. Data Retention & Control</h4>
                <p className="text-slate-600">
                  You can disconnect your TON wallet at any time in the Wallet tab. Accounts and progress data can be deleted upon request by contacting support.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 mt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
          <a
            href={activeTab === 'terms' ? '/terms' : '/privacy'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-[#2563EB] hover:text-[#1D4ED8] font-bold font-mono transition-colors"
          >
            <span>Open standalone page</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-[#E2E8F0] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
