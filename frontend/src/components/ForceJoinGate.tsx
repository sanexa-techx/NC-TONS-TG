// src/components/ForceJoinGate.tsx
import { useState } from "react";
import WebApp from "@twa-dev/sdk";
import { ExternalLink, CheckCircle2, RotateCw, ShieldCheck } from "lucide-react";

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
      if (res.ok) {
        const data = await res.json();
        setChannelList(data.channels || []);

        if (data.allJoined || !data.channels || data.channels.length === 0) {
          try {
            if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred("success");
          } catch {}
          onVerified();
          return;
        }
      } else {
        // Fallback in dev or disconnected state
        onVerified();
        return;
      }
      try {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred("error");
      } catch {}
      alert("You must join all required channels and groups to unlock NC TONs.");
    } catch {
      // In dev or offline mode, allow bypass
      onVerified();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between p-6 select-none overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-col items-center text-center space-y-3 pt-6 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white tracking-tight">MEMBERSHIP VERIFICATION</h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Join our official channels and community group to activate your cloud mining rig and dual rewards.
          </p>
        </div>
      </div>

      {/* Mandatory Channels & Groups List */}
      <div className="space-y-2.5 my-auto py-6 max-w-md w-full mx-auto">
        {channelList.map((ch) => (
          <div
            key={ch.id}
            className={`p-4 rounded-2xl border flex items-center justify-between transition shadow-lg ${
              ch.isMember
                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                : "bg-slate-900/80 backdrop-blur-xl border-white/10 text-slate-100"
            }`}
          >
            <div className="space-y-0.5 max-w-[200px] min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{ch.title}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                {ch.chatType === "group" ? "Community Group" : "Announcement Channel"}
              </span>
            </div>

            {ch.isMember ? (
              <div className="flex items-center gap-1 text-emerald-300 text-xs font-bold font-mono px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Joined
              </div>
            ) : (
              <button
                onClick={() => handleOpenLink(ch.inviteLink)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-[0_0_12px_rgba(37,99,235,0.4)] active:scale-95 transition shrink-0 cursor-pointer"
              >
                Join <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Re-Check Button */}
      <div className="space-y-2 pb-2 max-w-md w-full mx-auto">
        <button
          onClick={handleRecheck}
          disabled={checking}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-98 transition disabled:opacity-50 cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking Membership..." : "Verify & Enter App"}
        </button>
        <p className="text-[10px] text-center text-slate-400">
          Official NC TONs community subscription clearance
        </p>
      </div>
    </div>
  );
}
