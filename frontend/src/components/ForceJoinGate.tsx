// src/components/ForceJoinGate.tsx
import { useState } from "react";
import WebApp from "@twa-dev/sdk";
import { ExternalLink, CheckCircle2, RotateCw, Lock } from "lucide-react";

export interface ChannelItem {
  id: number;
  chatId: string;
  title: string;
  inviteLink: string;
  chatType: string;
  isMember: boolean;
}

interface ForceJoinGateProps {
  channels: ChannelItem[];
  onVerified: () => void;
  userId: number | string;
}

export default function ForceJoinGate({ channels, onVerified, userId }: ForceJoinGateProps) {
  const [checking, setChecking] = useState(false);
  const [channelList, setChannelList] = useState<ChannelItem[]>(channels);

  const handleOpenLink = (url: string) => {
    try {
      if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
        WebApp.openTelegramLink(url);
      } else if ((window as any).Telegram?.WebApp?.openTelegramLink) {
        (window as any).Telegram.WebApp.openTelegramLink(url);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleRecheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/membership/status?userId=${userId}`);
      const data = await res.json();

      setChannelList(data.channels || []);

      if (data.allJoined) {
        try {
          if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred("success");
        } catch {}
        onVerified();
      } else {
        try {
          if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred("error");
        } catch {}
        alert("You must join all required channels and groups to unlock NC TONs.");
      }
    } catch (e) {
      alert("Verification failed. Please check your connection.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between p-6 select-none overflow-y-auto">
      {/* Top Warning Banner */}
      <div className="flex flex-col items-center text-center space-y-3 pt-6">
        <div className="w-16 h-16 rounded-3xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white tracking-tight">MEMBERSHIP REQUIRED</h2>
          <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
            Join our official channels and community group to activate mining and unlock your account.
          </p>
        </div>
      </div>

      {/* Mandatory Channels & Groups List */}
      <div className="space-y-2.5 my-auto py-6">
        {channelList.map((ch) => (
          <div
            key={ch.id}
            className={`p-4 rounded-2xl border flex items-center justify-between transition ${
              ch.isMember
                ? "bg-neutral-900/60 border-emerald-500/40"
                : "bg-neutral-900 border-neutral-800"
            }`}
          >
            <div className="space-y-0.5 max-w-[200px]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{ch.title}</span>
              </div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
                {ch.chatType === "group" ? "Community Group" : "Announcement Channel"}
              </span>
            </div>

            {ch.isMember ? (
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold font-mono px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" /> Joined
              </div>
            ) : (
              <button
                onClick={() => handleOpenLink(ch.inviteLink)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition"
              >
                Join <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Re-Check Button */}
      <div className="space-y-2 pb-2">
        <button
          onClick={handleRecheck}
          disabled={checking}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-98 transition disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking Membership..." : "Verify & Enter App"}
        </button>
        <p className="text-[10px] text-center text-neutral-500">
          Leaving required channels will lock access to withdrawals and mining rewards.
        </p>
      </div>
    </div>
  );
}
