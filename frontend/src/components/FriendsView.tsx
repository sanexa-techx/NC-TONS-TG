import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Users, Copy, Share2, Sparkles, Check, Loader2 } from 'lucide-react';
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
  botUsername = 'NCTONs_bot',
  onBalanceUpdated,
}: FriendsViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [effectiveBot, setEffectiveBot] = useState<string>(botUsername);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);

  const inviteLink = `https://t.me/${effectiveBot}?start=ref_${userId}`;

  const fetchReferrals = async () => {
    try {
      const data = await api.getFriendStats(userId);
      if (data?.stats) {
        setStats(data.stats);
        setFriends(data.friends || []);
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

  const pendingNc = stats ? parseInt(stats.unclaimed_referral_nc || '0', 10) : 0;
  const pendingTon = stats ? parseFloat(stats.unclaimed_referral_ton || '0') : 0;
  const hasClaimable = pendingNc > 0 || pendingTon > 0;

  return (
    <div className="w-full max-w-sm mx-auto p-4 space-y-4 text-white pb-24 select-none">
      {/* Header Banner */}
      <div className="text-center py-2">
        <h2 className="text-2xl font-black tracking-tight text-white uppercase flex items-center justify-center gap-2">
          <Users className="w-6 h-6 text-cyber-cyan" />
          INVITE FRIENDS
        </h2>
        <p className="text-xs text-neutral-400 mt-1">Earn NC fuel and real TON for every active referral</p>
      </div>

      {/* Bonus Explanation Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex flex-col justify-between hover:border-neutral-700 transition">
          <span className="text-[11px] text-neutral-400 font-semibold">Standard Friend</span>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-yellow-400">
              <NcIcon className="w-3.5 h-3.5" /> +1,000 NC
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-400">
              <TonIcon className="w-3.5 h-3.5" /> +0.00008 TON
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-950/50 to-neutral-900 border border-indigo-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-[0_0_15px_rgba(99,102,241,0.1)]">
          <span className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> TG Premium
          </span>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-yellow-400">
              <NcIcon className="w-3.5 h-3.5" /> +2,500 NC
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-400">
              <TonIcon className="w-3.5 h-3.5" /> +0.00020 TON
            </div>
          </div>
        </div>
      </div>

      {/* Claim Pending Earnings HUD */}
      {hasClaimable && (
        <div className="bg-neutral-900 border border-yellow-500/40 rounded-2xl p-4 space-y-3 shadow-[0_0_20px_rgba(234,179,8,0.1)] animate-in fade-in duration-300">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400">Pending Invite Earnings</span>
            <span className="font-mono text-neutral-300 font-semibold">Ready to collect</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono font-bold text-yellow-400 text-sm">
              <NcIcon className="w-4 h-4" /> +{pendingNc.toLocaleString()} NC
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-blue-400 text-sm">
              <TonIcon className="w-4 h-4" /> +{pendingTon.toFixed(6)} TON
            </div>
          </div>
          <button
            onClick={handleClaimRewards}
            disabled={claiming}
            className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 active:scale-98 text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
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

      {/* Share / Invite Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleShareLink}
          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-98 transition"
        >
          <Share2 className="w-4 h-4" /> Invite Friends
        </button>
        <button
          onClick={handleCopyLink}
          title="Copy personal invite link"
          className="p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl flex items-center justify-center text-neutral-300 active:scale-95 transition"
        >
          {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      {/* Friends List */}
      <div className="space-y-2 pt-2">
        <div className="flex justify-between items-center text-xs text-neutral-400 px-1">
          <span>Your Referrals ({stats?.referral_count || 0})</span>
          <span>Earned Bounty</span>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-neutral-900/50 border border-neutral-800/80 rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-500 mx-auto mb-2" />
            <p className="text-xs text-neutral-400 font-mono">Loading referrals...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/50 border border-neutral-800/80 rounded-2xl space-y-1.5">
            <Users className="w-8 h-8 text-neutral-600 mx-auto mb-1" />
            <p className="text-xs text-neutral-300 font-semibold">No friends invited yet</p>
            <p className="text-[11px] text-neutral-500">Share your link above to start earning passive bonuses</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {friends.map((f, i) => (
              <div
                key={i}
                className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-300">
                    {(f.first_name && f.first_name[0]) || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{f.first_name}</span>
                      {f.is_premium && (
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold tracking-wider">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {f.username ? `@${f.username}` : 'Anonymous'}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs space-y-0.5">
                  <div className="text-yellow-400 font-bold">+{Number(f.bonus_nc).toLocaleString()} NC</div>
                  <div className="text-blue-400 text-[10px]">+{parseFloat(f.bonus_ton).toFixed(6)} TON</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
