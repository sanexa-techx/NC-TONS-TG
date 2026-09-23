import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, Loader2, Camera } from 'lucide-react';
import { TonIcon, NcIcon } from './icons/index.js';
import { api } from '../services/api.js';

interface AdminCreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMissionCreated?: () => void;
}

export const AdminCreateMissionModal: React.FC<AdminCreateMissionModalProps> = ({
  isOpen,
  onClose,
  onMissionCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<'telegram_join' | 'screenshot_social' | 'visit_url' | 'bot_launch'>('screenshot_social');
  const [category, setCategory] = useState('social');
  const [actionUrl, setActionUrl] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [proofInstructions, setProofInstructions] = useState('Upload a screenshot showing you followed or subscribed');
  const [ncReward, setNcReward] = useState('500');
  const [tonReward, setTonReward] = useState('0.0005');
  const [targetUsers, setTargetUsers] = useState('1000');
  const [priority, setPriority] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!title || !description || !actionUrl) {
        throw new Error('Please fill in title, description, and action URL');
      }

      const isScreenshot = taskType === 'screenshot_social';
      const selectedCategory = isScreenshot
        ? 'social'
        : taskType === 'telegram_join'
        ? 'telegram'
        : taskType === 'bot_launch'
        ? 'partner'
        : category;

      await api.createAdminMission({
        title,
        description,
        category: selectedCategory,
        taskType,
        actionUrl,
        telegramChatId: taskType === 'telegram_join' ? telegramChatId : null,
        ncReward: Number(ncReward),
        tonReward: Number(tonReward),
        targetUsers: targetUsers ? Number(targetUsers) : null,
        priority: Number(priority),
        requiresProof: isScreenshot,
        proofInstructions: isScreenshot ? proofInstructions : null,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onMissionCreated?.();
        onClose();
      }, 1200);
    } catch (err) {
      setError((err as Error).message || 'Failed to create mission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-md rounded-3xl p-5 border border-cyber-cyan/30 shadow-glow-cyan relative my-8 text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-2 text-cyber-cyan mb-1">
          <Sparkles size={22} />
          <h3 className="text-lg font-bold">Create Dynamic Mission</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Publish a priority verified campaign or external social proof mission.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-cyber-red/15 border border-cyber-red/30 text-xs text-cyber-red flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={48} className="text-cyber-green mb-3 animate-bounce" />
            <h4 className="text-lg font-bold text-white mb-1">Mission Published!</h4>
            <p className="text-xs text-slate-300">Campaign is now live in the mission marketplace.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                Task Verification Type
              </label>
              <select
                value={taskType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setTaskType(val);
                  if (val === 'screenshot_social') setCategory('social');
                  else if (val === 'telegram_join') setCategory('telegram');
                  else if (val === 'bot_launch') setCategory('partner');
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-cyber-cyan"
              >
                <option value="telegram_join">Telegram Channel (Auto-Verify via Bot)</option>
                <option value="screenshot_social">Social Follow / YouTube Subscribe (Screenshot Proof)</option>
                <option value="visit_url">Simple Link Visit</option>
                <option value="bot_launch">Partner Bot Launch</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Subscribe to NC TONs YouTube Channel"
                required
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions for miners..."
                rows={2}
                required
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                Action / Channel URL *
              </label>
              <input
                type="url"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="https://youtube.com/@channel or https://instagram.com/profile"
                required
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan"
              />
            </div>

            {taskType === 'telegram_join' && (
              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                  Telegram Username or Chat ID (for bot verification)
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="@your_channel"
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan"
                />
              </div>
            )}

            {taskType === 'screenshot_social' && (
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-yellow-400 text-xs font-semibold">
                  <Camera size={14} />
                  <span>Screenshot Proof Settings</span>
                </div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase">
                  Proof Instructions for Miner
                </label>
                <input
                  type="text"
                  value={proofInstructions}
                  onChange={(e) => setProofInstructions(e.target.value)}
                  placeholder="Upload screenshot showing you followed/subscribed"
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
                <p className="text-[10px] text-slate-400">
                  Screenshots are streamed directly to your Telegram Admin Channel for 1-tap review.
                </p>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="flex items-center space-x-1 text-[10px] font-mono text-slate-300 uppercase mb-1">
                  <NcIcon className="w-3.5 h-3.5" />
                  <span>NC</span>
                </label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={ncReward}
                  onChange={(e) => setNcReward(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyber-gold"
                />
              </div>
              <div>
                <label className="flex items-center space-x-1 text-[10px] font-mono text-slate-300 uppercase mb-1">
                  <TonIcon className="w-3.5 h-3.5" />
                  <span>TON</span>
                </label>
                <input
                  type="text"
                  value={tonReward}
                  onChange={(e) => setTonReward(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyber-cyan"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1">
                  Target
                </label>
                <input
                  type="number"
                  min="10"
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyber-cyan"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyber-cyan"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-cyber-cyan hover:bg-cyber-cyan/90 text-black font-bold text-xs uppercase tracking-wide active:scale-98 transition-all flex items-center justify-center space-x-1.5 mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Publish Mission</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminCreateMissionModal;
