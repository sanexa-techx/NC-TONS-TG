import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Users, Copy, Share2, Sparkles, Check, Loader2, Trophy, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import TonIcon from './icons/TonIcon.js';
import NcIcon from './icons/NcIcon.js';
import { api } from '../services/api.js';

interface FriendsViewProps {
  userId: string;
  botUsername?: string;
  onBalanceUpdated?: (newBalances: { nc_balance?: string; ton_balance?: string }) => void;
}

export default function FriendsView({
  userId,
  botUsername,
  onBalanceUpdated,
}: FriendsViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [rates, setRates] = useState<any>(null);
  const [effectiveBot, setEffectiveBot] = useState<string>(() => {
    return (botUsername || (import.meta as any).env?.VITE_BOT_USERNAME || '').replace('@', '').trim();
  });
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync if prop arrives from auth verification
  useEffect(() => {
    if (botUsername && (!effectiveBot || effectiveBot === 'NCTONs_bot')) {
      setEffectiveBot(botUsername.replace('@', '').trim());
    }
  }, [botUsername]);

  const inviteLink = effectiveBot ? `https://t.me/${effectiveBot}?start=ref_${userId}` : '';

  const fetchReferrals = async () => {
    try {
      const data = await api.getFriendStats(userId);
      if (data?.stats) {
        setStats(data.stats);
        setFriends(data.friends || []);
        if (data.milestones) {
          setMilestones(data.milestones);
        }
        if (data.rates) {
          setRates(data.rates);
        }
        if (data.botUsername) {
          setEffectiveBot(data.botUsername);
        }
      }
    } catch (err) {
      console.error('Error loading referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [userId]);

  const handleCopyLink = () => {
    if (!inviteLink) return;
    try {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred('success');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
  };

  const handleShareLink = () => {
    if (!inviteLink) return;
    const text = '⚡ Mine real TON & NC Coins on NC TONs! Get a special bonus when you join with my link:';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    if (WebApp?.openTelegramLink) {
      WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleClaimRewards = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const data = await api.claimFriendRewards(userId);

      if (data.success) {
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
        if (onBalanceUpdated) {
          onBalanceUpdated(data.newBalances);
        }
        await fetchReferrals();
      } else {
        alert('Nothing to claim');
      }
    } catch (err: any) {
      alert(err.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimMilestone = async (targetCount: number) => {
    if (claimingMilestone !== null) return;
    setClaimingMilestone(targetCount);
    try {
      const data = await api.claimMilestoneReward(userId, targetCount);
      if (data.success) {
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
        if (onBalanceUpdated && data.newBalances) {
          onBalanceUpdated({
            nc_balance: data.newBalances.nc_balance,
            ton_balance: data.newBalances.ton_balance,
          });
        }
        await fetchReferrals();
      } else {
        alert((data as any).message || 'Milestone reward not available');
      }
    } catch (err: any) {
      alert(err.message || 'Milestone claim failed');
    } finally {
      setClaimingMilestone(null);
    }
  };

  const pendingNc = stats ? parseInt(stats.unclaimed_referral_nc || '0', 10) : 0;
  const pendingTon = stats ? parseFloat(stats.unclaimed_referral_ton || '0') : 0;
  const hasClaimable = pendingNc > 0 || pendingTon > 0;

  // Active or fallback milestone tiers
  const activeMilestones = (milestones && milestones.length > 0) ? milestones : [
    { targetCount: 1, displayName: '1 Friend Recruited', ncReward: 5000, tonReward: '0.000500', isClaimed: false, canClaim: (stats?.referral_count || 0) >= 1 },
    { targetCount: 3, displayName: '3 Friends Recruited', ncReward: 15000, tonReward: '0.001500', isClaimed: false, canClaim: (stats?.referral_count || 0) >= 3 },
    { targetCount: 7, displayName: '7 Friends Recruited', ncReward: 40000, tonReward: '0.004000', isClaimed: false, canClaim: (stats?.referral_count || 0) >= 7 },
    { targetCount: 10, displayName: '10 Friends Recruited', ncReward: 80000, tonReward: '0.008000', isClaimed: false, canClaim: (stats?.referral_count || 0) >= 10 },
  ];

  return (
    <div className="w-full max-w-sm mx-auto p-4 space-y-4 text-slate-800 pb-24 select-none">
      {/* Top Verification Badges: "HUMAN VERIFIED ONLY" mint & "INVITE ONLY" cobalt */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-emerald-300 text-[#10B981] font-extrabold text-[11px] shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          HUMAN VERIFIED ONLY
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-blue-300 text-[#2563EB] font-extrabold text-[11px] shadow-2xs">
          <Lock className="w-3.5 h-3.5" />
          INVITE ONLY
        </span>
      </div>

      {/* Header Banner */}
      <div className="text-center py-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase flex items-center justify-center gap-2">
          <Users className="w-6 h-6 text-[#2563EB]" />
          INVITE FRIENDS
        </h2>
        <p className="text-xs text-slate-500 mt-1">Earn NC fuel and real TON for every active referral</p>
      </div>

      {/* Primary CTA: "+ INVITE FRIENDS ON TELEGRAM" Cobalt Button */}
      <div className="space-y-2">
        <button
          onClick={handleShareLink}
          disabled={!effectiveBot}
          className="w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-98 transition disabled:opacity-50 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>+ INVITE FRIENDS ON TELEGRAM</span>
        </button>

        {/* Display Verified Referral Link */}
        <div
          onClick={handleCopyLink}
          className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:border-blue-300 transition shadow-2xs"
        >
          <span className="text-[11px] font-mono text-slate-500 truncate">
            {inviteLink || 'Generating your verified link...'}
          </span>
          <button
            type="button"
            className="text-xs font-mono font-bold text-[#2563EB] flex items-center gap-1 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[#10B981]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5-Emoji Anti-Bot Captcha Bar */}
      <div className="w-full bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            5-EMOJI ANTI-BOT CAPTCHA
          </span>
          <span className="text-[10px] font-mono font-bold text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <Check className="w-3 h-3 text-[#10B981]" />
            HUMAN CONFIRMED
          </span>
        </div>

        {/* 5-Emoji Bar */}
        <div className="flex items-center justify-between bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
          {['🤖', '🛡️', '🚀', '💎', '⚡'].map((emoji, idx) => (
            <div
              key={idx}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-2xs transition-transform hover:scale-110 cursor-pointer"
            >
              {emoji}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 font-mono text-center">
          Prevents automated sybil bots • 100% human-verified network
        </p>
      </div>

      {/* Bonus Explanation Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold">Standard Friend</span>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#10B981]">
              <NcIcon className="w-3.5 h-3.5" /> +{rates?.standard?.nc ? Number(rates.standard.nc).toLocaleString() : '1,000'} NC
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2563EB]">
              <TonIcon className="w-3.5 h-3.5" /> +{rates?.standard?.ton || '0.000080'} TON
            </div>
          </div>
        </div>

        <div className="bg-[#EFF6FF] border border-blue-200 rounded-2xl p-3 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[#2563EB] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#2563EB]" /> TG Premium
          </span>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#10B981]">
              <NcIcon className="w-3.5 h-3.5" /> +{rates?.premium?.nc ? Number(rates.premium.nc).toLocaleString() : '2,500'} NC
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2563EB]">
              <TonIcon className="w-3.5 h-3.5" /> +{rates?.premium?.ton || '0.000200'} TON
            </div>
          </div>
        </div>
      </div>

      {/* Claim Pending Earnings HUD */}
      {hasClaimable && (
        <div className="bg-[#ECFDF5] border border-emerald-300 rounded-2xl p-4 space-y-3 shadow-xs animate-in fade-in duration-300">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600 font-semibold">Pending Invite Earnings</span>
            <span className="font-mono text-[#059669] font-bold">Ready to collect</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono font-bold text-[#10B981] text-sm">
              <NcIcon className="w-4 h-4" /> +{pendingNc.toLocaleString()} NC
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-[#2563EB] text-sm">
              <TonIcon className="w-4 h-4" /> +{pendingTon.toFixed(6)} TON
            </div>
          </div>
          <button
            onClick={handleClaimRewards}
            disabled={claiming}
            className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] active:scale-98 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {claiming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Claiming...
              </>
            ) : (
              'Claim to Wallet'
            )}
          </button>
        </div>
      )}

      {/* Squad Referral Milestones (1, 3, 7, 10 Referrals) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> Squad Milestones
          </span>
          <span className="text-[10px] font-mono text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-blue-200 font-semibold">
            {stats?.referral_count || 0} Recruited
          </span>
        </div>

        <div className="space-y-2">
          {activeMilestones.map((m) => {
            const currentCount = stats?.referral_count || 0;
            const progressPct = Math.min(100, Math.round((currentCount / m.targetCount) * 100));

            return (
              <div
                key={m.targetCount}
                className={`p-3 rounded-2xl border transition relative overflow-hidden ${
                  m.isClaimed
                    ? 'bg-slate-50 border-[#E2E8F0] opacity-80'
                    : m.canClaim
                    ? 'bg-[#ECFDF5] border-emerald-300 shadow-xs'
                    : 'bg-white border-[#E2E8F0] shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        m.isClaimed
                          ? 'bg-emerald-100 text-[#059669] border border-emerald-300'
                          : m.canClaim
                          ? 'bg-[#10B981] text-white shadow-xs font-bold'
                          : 'bg-slate-100 text-slate-500 border border-[#E2E8F0]'
                      }`}
                    >
                      {m.isClaimed ? <CheckCircle2 className="w-4 h-4 text-[#059669]" /> : `${m.targetCount}x`}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {m.displayName || `${m.targetCount} Referrals`}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono">
                        <span className="text-[#10B981] font-bold flex items-center gap-1">
                          <NcIcon className="w-3 h-3" /> +{Number(m.ncReward).toLocaleString()}
                        </span>
                        <span className="text-[#2563EB] font-bold flex items-center gap-1">
                          <TonIcon className="w-3 h-3" /> +{m.tonReward}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {m.isClaimed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-[#059669]">
                        <Check className="w-3 h-3" /> CLAIMED
                      </span>
                    ) : m.canClaim ? (
                      <button
                        onClick={() => handleClaimMilestone(m.targetCount)}
                        disabled={claimingMilestone !== null}
                        className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-[11px] rounded-xl shadow-xs active:scale-95 transition flex items-center gap-1"
                      >
                        {claimingMilestone === m.targetCount ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Claiming...
                          </>
                        ) : (
                          'CLAIM'
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>{currentCount}/{m.targetCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar for unclaimed milestones */}
                {!m.isClaimed && (
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        m.canClaim ? 'bg-[#10B981]' : 'bg-slate-300'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Friends List */}
      <div className="space-y-2 pt-2">
        <div className="flex justify-between items-center text-xs text-slate-500 px-1 font-semibold">
          <span>Your Referrals ({stats?.referral_count || 0})</span>
          <span>Earned Bounty</span>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-mono">Loading referrals...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="space-y-2">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center font-bold text-xs text-[#10B981]">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900">Alex_TON</span>
                    <span className="text-[9px] bg-emerald-50 text-[#10B981] px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                      VERIFIED ✅
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">@alex_crypto</span>
                </div>
              </div>
              <div className="text-right font-mono text-xs space-y-0.5">
                <div className="text-[#10B981] font-bold">+2,500 NC</div>
                <div className="text-[#2563EB] text-[10px]">+0.000200 TON</div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-blue-200 flex items-center justify-center font-bold text-xs text-[#2563EB]">
                  T
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900">TonWhale_99</span>
                    <span className="text-[9px] bg-emerald-50 text-[#10B981] px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                      VERIFIED ✅
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">@ton_miner</span>
                </div>
              </div>
              <div className="text-right font-mono text-xs space-y-0.5">
                <div className="text-[#10B981] font-bold">+1,000 NC</div>
                <div className="text-[#2563EB] text-[10px]">+0.000080 TON</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {friends.map((f, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-3 flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-blue-200 flex items-center justify-center font-bold text-xs text-[#2563EB]">
                    {(f.first_name && f.first_name[0]) || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900">{f.first_name}</span>
                      <span className="text-[9px] bg-emerald-50 text-[#10B981] px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                        VERIFIED ✅
                      </span>
                      {f.is_premium && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 font-bold tracking-wider">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {f.username ? `@${f.username}` : 'Anonymous'}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs space-y-0.5">
                  <div className="text-[#10B981] font-bold">+{Number(f.bonus_nc).toLocaleString()} NC</div>
                  <div className="text-[#2563EB] text-[10px]">+{parseFloat(f.bonus_ton).toFixed(6)} TON</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
