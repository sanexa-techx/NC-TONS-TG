import React, { useState } from 'react';
import { X, Sparkles, Send, Globe, Bot, CheckCircle2, AlertCircle, Loader2, Camera } from 'lucide-react';
import { TonIcon, NcIcon } from './icons/index.js';
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
  const [taskType, setTaskType] = useState<'telegram_join' | 'visit_url' | 'bot_launch' | 'screenshot_social'>('telegram_join');
  const [proofInstructions, setProofInstructions] = useState('Upload a screenshot showing you followed/subscribed');
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

      const isScreenshot = taskType === 'screenshot_social';

      await api.createMission({
        title,
        description,
        category: isScreenshot ? 'social' : category,
        taskType,
        actionUrl,
        telegramChatId: taskType === 'telegram_join' ? telegramChatId : null,
        ncReward: Number(ncReward),
        tonReward: Number(tonReward),
        targetUsers: Number(targetUsers),
        requiresProof: isScreenshot,
        proofInstructions: isScreenshot ? proofInstructions : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 border border-[#E2E8F0] shadow-xl relative my-8 text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center space-x-2 text-[#2563EB] mb-1">
          <Sparkles size={20} />
          <h3 className="text-base font-bold text-slate-900">Promote Your Community</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Launch a sponsored mission for real NC TONs miners. Pay via Telegram Stars or TON.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={48} className="text-[#10B981] mb-3 animate-bounce" />
            <h4 className="text-base font-bold text-slate-900 mb-1">Mission Published!</h4>
            <p className="text-xs text-slate-500">Your campaign is now live for all miners.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Join Ton Alpha Group"
                required
                className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief instructions for miners..."
                rows={2}
                required
                className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTaskType('telegram_join');
                  setCategory('telegram');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  taskType === 'telegram_join'
                    ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] shadow-2xs'
                    : 'bg-slate-50 border-[#E2E8F0] text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Send size={15} />
                <span>TG Channel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTaskType('screenshot_social');
                  setCategory('social');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  taskType === 'screenshot_social'
                    ? 'bg-[#ECFDF5] border-[#10B981] text-[#059669] shadow-2xs'
                    : 'bg-slate-50 border-[#E2E8F0] text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Camera size={15} />
                <span>Screenshot Proof</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTaskType('visit_url');
                  setCategory('social');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  taskType === 'visit_url'
                    ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] shadow-2xs'
                    : 'bg-slate-50 border-[#E2E8F0] text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe size={15} />
                <span>Visit Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTaskType('bot_launch');
                  setCategory('partner');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  taskType === 'bot_launch'
                    ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] shadow-2xs'
                    : 'bg-slate-50 border-[#E2E8F0] text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bot size={15} />
                <span>Start Bot</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Destination URL *
              </label>
              <input
                type="url"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder={taskType === 'screenshot_social' ? 'https://youtube.com/@channel or instagram' : 'https://t.me/your_channel or website'}
                required
                className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] focus:bg-white transition"
              />
            </div>

            {taskType === 'screenshot_social' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Screenshot Proof Instructions
                </label>
                <input
                  type="text"
                  value={proofInstructions}
                  onChange={(e) => setProofInstructions(e.target.value)}
                  placeholder="Upload a screenshot showing you followed/subscribed"
                  className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] focus:bg-white transition"
                />
              </div>
            )}

            {taskType === 'telegram_join' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telegram Username or Chat ID (for automated verification)
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="@your_channel"
                  className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] focus:bg-white transition"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="flex items-center space-x-1 text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <NcIcon className="w-3.5 h-3.5" />
                  <span>NC / User</span>
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={ncReward}
                  onChange={(e) => setNcReward(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#10B981] focus:bg-white font-mono"
                />
              </div>
              <div>
                <label className="flex items-center space-x-1 text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <TonIcon className="w-3.5 h-3.5" />
                  <span>TON / User</span>
                </label>
                <input
                  type="text"
                  value={tonReward}
                  onChange={(e) => setTonReward(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] focus:bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Miners
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] focus:bg-white font-mono"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Funding Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stars')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === 'stars'
                      ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs'
                      : 'bg-slate-50 border-[#E2E8F0] text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ⭐ Telegram Stars (XTR)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ton')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === 'ton'
                      ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] shadow-2xs'
                      : 'bg-slate-50 border-[#E2E8F0] text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center justify-center space-x-1.5">
                    <TonIcon className="w-4 h-4" />
                    <span>TON Connect</span>
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 mt-4"
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
