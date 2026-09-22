import React, { useState } from 'react';
import { X, Sparkles, Send, Globe, Bot, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';

interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMissionCreated?: () => void;
}

export const CreateMissionModal: React.FC<CreateMissionModalProps> = ({
  isOpen,
  onClose,
  onMissionCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('telegram');
  const [taskType, setTaskType] = useState<'telegram_join' | 'visit_url' | 'bot_launch'>('telegram_join');
  const [actionUrl, setActionUrl] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [ncReward, setNcReward] = useState('500');
  const [tonReward, setTonReward] = useState('0.0005');
  const [targetUsers, setTargetUsers] = useState('100');
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'ton'>('stars');
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
        throw new Error('Please fill in all required fields');
      }

      await api.createMission({
        title,
        description,
        category,
        taskType,
        actionUrl,
        telegramChatId: taskType === 'telegram_join' ? telegramChatId : null,
        ncReward: Number(ncReward),
        tonReward: Number(tonReward),
        targetUsers: Number(targetUsers),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onMissionCreated?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError((err as Error).message || 'Failed to create mission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-md rounded-3xl p-5 border border-cyber-cyan/30 shadow-glow-cyan relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-2 text-cyber-cyan mb-1">
          <Sparkles size={22} />
          <h3 className="text-lg font-bold">Promote Your Community</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Launch a sponsored mission for real NC TONs miners. Pay via Telegram Stars or TON.
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
            <p className="text-xs text-slate-300">Your campaign is now live for all miners.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Join Ton Alpha Group"
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
                placeholder="Brief instructions for miners..."
                rows={2}
                required
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTaskType('telegram_join');
                  setCategory('telegram');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center border transition-all ${
                  taskType === 'telegram_join'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan'
                    : 'bg-cyber-surface border-cyber-border text-slate-400'
                }`}
              >
                <Send size={16} className="mb-1" />
                <span>TG Channel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTaskType('visit_url');
                  setCategory('social');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center border transition-all ${
                  taskType === 'visit_url'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan'
                    : 'bg-cyber-surface border-cyber-border text-slate-400'
                }`}
              >
                <Globe size={16} className="mb-1" />
                <span>Visit Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTaskType('bot_launch');
                  setCategory('partner');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center border transition-all ${
                  taskType === 'bot_launch'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan'
                    : 'bg-cyber-surface border-cyber-border text-slate-400'
                }`}
              >
                <Bot size={16} className="mb-1" />
                <span>Start Bot</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                Destination URL *
              </label>
              <input
                type="url"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="https://t.me/your_channel or website"
                required
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan"
              />
            </div>

            {taskType === 'telegram_join' && (
              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                  Telegram Username or Chat ID (for automated verification)
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

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1">
                  NC / User
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={ncReward}
                  onChange={(e) => setNcReward(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyber-gold font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1">
                  TON / User
                </label>
                <input
                  type="text"
                  value={tonReward}
                  onChange={(e) => setTonReward(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-300 uppercase mb-1">
                  Target Miners
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan font-mono"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2">
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1.5">
                Funding Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stars')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === 'stars'
                      ? 'bg-cyber-gold/20 border-cyber-gold text-cyber-gold'
                      : 'bg-cyber-surface border-cyber-border text-slate-400'
                  }`}
                >
                  ⭐ Telegram Stars (XTR)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ton')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === 'ton'
                      ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan'
                      : 'bg-cyber-surface border-cyber-border text-slate-400'
                  }`}
                >
                  💎 TON Connect
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyber-cyan to-cyber-blue text-cyber-bg font-extrabold text-xs uppercase tracking-wider shadow-glow-cyan active:scale-95 transition-all flex items-center justify-center space-x-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Publishing Campaign...</span>
                </>
              ) : (
                <span>Launch Campaign</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
