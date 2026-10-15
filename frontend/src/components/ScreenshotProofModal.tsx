import React, { useState } from "react";
import WebApp from "@twa-dev/sdk";
import { Camera, Check, ExternalLink, Upload, X } from "lucide-react";
import TonIcon from "./icons/TonIcon.js";
import NcIcon from "./icons/NcIcon.js";

interface ScreenshotModalProps {
  mission: {
    id: number;
    title: string;
    action_url?: string;
    actionUrl?: string;
    nc_reward?: number;
    ncReward?: number;
    ton_reward?: string;
    tonReward?: string;
    proof_instructions?: string;
    proofInstructions?: string;
  };
  userId: number | string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ScreenshotProofModal({
  mission,
  userId,
  onClose,
  onSubmitted,
}: ScreenshotModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visited, setVisited] = useState(false);
  const [loading, setLoading] = useState(false);

  const actionUrl = mission.action_url || mission.actionUrl || "#";
  const ncReward = mission.nc_reward ?? mission.ncReward ?? 0;
  const tonReward = mission.ton_reward || mission.tonReward || "0";
  const instructions = mission.proof_instructions || mission.proofInstructions;

  const handleOpenLink = () => {
    try {
      if (WebApp && typeof WebApp.openLink === "function") {
        WebApp.openLink(actionUrl);
      } else {
        window.open(actionUrl, "_blank");
      }
    } catch (e) {
      window.open(actionUrl, "_blank");
    }
    setVisited(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5MB");
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("userId", userId.toString());
    formData.append("missionId", mission.id.toString());
    formData.append("proofImage", file);

    try {
      const res = await fetch("/api/proof/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        try {
          if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred("success");
        } catch (e) {
          // Ignore outside telegram
        }
        alert("Screenshot submitted! Rewards will be credited once verified by admin.");
        onSubmitted();
        onClose();
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Network error while uploading proof");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl w-full max-w-sm p-5 text-slate-100 space-y-4 relative shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-base font-bold text-white pr-6">{mission.title}</h3>
          <div className="flex items-center gap-3 mt-1.5 font-mono text-xs">
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-emerald-500/30">
              <NcIcon className="w-3.5 h-3.5" /> +{ncReward} NC
            </span>
            <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-blue-500/30">
              <TonIcon className="w-3.5 h-3.5" /> +{parseFloat(tonReward).toFixed(6)} TON
            </span>
          </div>
        </div>

        {/* Step 1: Open Social Media Link */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Step 1</span>
            <p className="text-xs font-bold text-white">Follow or Subscribe</p>
          </div>
          <button
            onClick={handleOpenLink}
            type="button"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              visited
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            }`}
          >
            {visited ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
            {visited ? "Opened" : "Open Link"}
          </button>
        </div>

        {/* Step 2: Upload Screenshot */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Step 2: Upload Screenshot Proof</span>
            <p className="text-[11px] text-slate-400">
              {instructions || "Take a screenshot showing you followed/subscribed and upload it below:"}
            </p>
          </div>

          <label className="border-2 border-dashed border-white/20 hover:border-blue-500/60 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-950/70 hover:bg-slate-950 transition min-h-[120px]">
            {preview ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10">
                <img src={preview} alt="Proof preview" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-slate-900/90 text-[9px] px-2 py-0.5 rounded text-white font-mono">
                  Change photo
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-slate-400">
                <Camera className="w-7 h-7 text-slate-400" />
                <span className="text-xs font-bold text-slate-200">Choose Screenshot</span>
                <span className="text-[10px] text-slate-500">PNG, JPG up to 5MB</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>

          <button
            type="submit"
            disabled={!file || loading}
            className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 ${
              file && !loading
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "bg-slate-800/80 text-slate-500 cursor-not-allowed border border-white/10"
            }`}
          >
            <Upload className="w-4 h-4" />
            {loading ? "Uploading to Verification..." : "Submit Proof for Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
