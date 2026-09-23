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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-5 text-white space-y-4 relative shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-base font-bold pr-6">{mission.title}</h3>
          <div className="flex items-center gap-3 mt-1.5 font-mono text-xs">
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              <NcIcon className="w-3.5 h-3.5" /> +{ncReward} NC
            </span>
            <span className="text-blue-400 font-bold flex items-center gap-1">
              <TonIcon className="w-3.5 h-3.5" /> +{parseFloat(tonReward).toFixed(6)} TON
            </span>
          </div>
        </div>

        {/* Step 1: Open Social Media Link */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-semibold uppercase">Step 1</span>
            <p className="text-xs font-medium">Follow or Subscribe</p>
          </div>
          <button
            onClick={handleOpenLink}
            type="button"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              visited
                ? "bg-neutral-800 text-emerald-400 border border-emerald-500/30"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {visited ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
            {visited ? "Opened" : "Open Link"}
          </button>
        </div>

        {/* Step 2: Upload Screenshot */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400 font-semibold uppercase">Step 2: Upload Screenshot Proof</span>
            <p className="text-[11px] text-neutral-400">
              {instructions || "Take a screenshot showing you followed/subscribed and upload it below:"}
            </p>
          </div>

          <label className="border-2 border-dashed border-neutral-700 hover:border-yellow-500/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-950/60 transition min-h-[120px]">
            {preview ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden">
                <img src={preview} alt="Proof preview" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] px-2 py-0.5 rounded text-white font-mono">
                  Change photo
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-neutral-400">
                <Camera className="w-7 h-7 text-neutral-500" />
                <span className="text-xs font-medium">Choose Screenshot</span>
                <span className="text-[10px] text-neutral-500">PNG, JPG up to 5MB</span>
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
                ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20"
                : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50"
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
