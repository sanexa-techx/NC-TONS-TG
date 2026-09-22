import React, { useEffect, useState, useCallback } from 'react';
import { RewardConfig, Mission } from '../types/index.js';
import { api } from '../services/api.js';
import { Shield, Sliders, PlusCircle, CheckCircle2, AlertCircle, Loader2, Power } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [configs, setConfigs] = useState<RewardConfig[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [stats, setStats] = useState<{ totalUsers: number; activeMissionsCount: number; pendingWithdrawalsCount: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New mission form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newChatId, setNewChatId] = useState('');
  const [newNc, setNewNc] = useState('500');
  const [newTon, setNewTon] = useState('0.0005');
  const [newTarget, setNewTarget] = useState('1000');
  const [newPriority, setNewPriority] = useState('10');
  const [creatingMission, setCreatingMission] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, msnRes, statsRes] = await Promise.all([
        api.getRewardConfigs(),
        api.getAvailableMissions(),
        api.getAdminStats(),
      ]);
      setConfigs(cfgRes.configs);
      setMissions(msnRes.missions);
      setStats(statsRes);
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message || 'Failed to load admin data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateReward = async (config: RewardConfig) => {
    setSavingConfig(config.actionType);
    setFeedback(null);
    try {
      await api.updateRewardConfig({
        actionType: config.actionType,
        ncReward: Number(config.ncReward),
        tonReward: Number(config.tonReward),
        displayName: config.displayName,
      });
      setFeedback({ type: 'success', text: `Saved rates for ${config.displayName}` });
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message || 'Failed to update reward' });
    } finally {
      setSavingConfig(null);
    }
  };

  const handleToggleMission = async (missionId: number, currentActive: boolean) => {
    try {
      await api.updateAdminMission(missionId, { isActive: !currentActive });
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? { ...m, isCompleted: !currentActive } : m))
      );
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message });
    }
  };

  const handleCreateAdminMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingMission(true);
    setFeedback(null);
    try {
      await api.createAdminMission({
        title: newTitle,
        description: newDesc,
        actionUrl: newUrl,
        telegramChatId: newChatId || null,
        category: 'telegram',
        taskType: 'telegram_join',
        ncReward: Number(newNc),
        tonReward: Number(newTon),
        targetUsers: Number(newTarget),
        priority: Number(newPriority),
      });
      setFeedback({ type: 'success', text: 'Admin priority mission published!' });
      setNewTitle('');
      setNewDesc('');
      setNewUrl('');
      setNewChatId('');
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message });
    } finally {
      setCreatingMission(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-2">
        <Loader2 size={28} className="animate-spin text-cyber-cyan" />
        <span className="text-xs">Loading Admin Panel...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      {/* Header */}
      <div className="w-full flex items-center justify-between py-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-cyber-red/20 flex items-center justify-center text-cyber-red shadow-glow-red/20">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Admin Command Center</h2>
            <p className="text-[11px] text-slate-400">Live economic adjustments & moderations</p>
          </div>
        </div>

        <div className="px-2 py-0.5 rounded-lg bg-cyber-red/20 border border-cyber-red/40 text-[10px] font-mono font-bold text-cyber-red uppercase">
          ROOT
        </div>
      </div>

      {feedback && (
        <div
          className={`w-full p-3 mb-4 rounded-xl text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-cyber-green/15 text-cyber-green border border-cyber-green/40'
              : 'bg-cyber-red/15 text-cyber-red border border-cyber-red/40'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="w-full grid grid-cols-3 gap-2 mb-4">
          <div className="glass-panel p-2.5 rounded-xl border border-cyber-border text-center">
            <div className="text-[10px] text-slate-400 font-mono">USERS</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">{stats.totalUsers}</div>
          </div>
          <div className="glass-panel p-2.5 rounded-xl border border-cyber-border text-center">
            <div className="text-[10px] text-slate-400 font-mono">MISSIONS</div>
            <div className="text-base font-bold font-mono text-cyber-cyan mt-0.5">
              {stats.activeMissionsCount}
            </div>
          </div>
          <div className="glass-panel p-2.5 rounded-xl border border-cyber-border text-center">
            <div className="text-[10px] text-slate-400 font-mono">PENDING WD</div>
            <div className="text-base font-bold font-mono text-cyber-gold mt-0.5">
              {stats.pendingWithdrawalsCount}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Reward Multipliers */}
      <div className="w-full glass-panel p-4 rounded-2xl border border-cyber-border mb-4">
        <h3 className="text-xs font-bold font-mono uppercase text-slate-300 mb-3 flex items-center space-x-1.5">
          <Sliders size={16} className="text-cyber-cyan" />
          <span>Live Reward Multipliers</span>
        </h3>

        <div className="space-y-3">
          {configs.map((cfg) => (
            <div key={cfg.actionType} className="p-3 rounded-xl bg-cyber-bg border border-cyber-border">
              <div className="text-xs font-bold text-white mb-2">{cfg.displayName}</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                    NC Reward
                  </label>
                  <input
                    type="number"
                    value={cfg.ncReward}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.actionType === cfg.actionType ? { ...c, ncReward: val } : c
                        )
                      );
                    }}
                    className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-2.5 py-1.5 text-xs text-cyber-gold font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                    TON Reward
                  </label>
                  <input
                    type="text"
                    value={cfg.tonReward}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfigs((prev) =>
                        prev.map((c) =>
                          c.actionType === cfg.actionType ? { ...c, tonReward: val } : c
                        )
                      );
                    }}
                    className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-2.5 py-1.5 text-xs text-cyber-cyan font-mono font-bold"
                  />
                </div>
              </div>
              <button
                onClick={() => handleUpdateReward(cfg)}
                disabled={savingConfig === cfg.actionType}
                className="w-full py-1.5 rounded-lg bg-cyber-card hover:bg-cyber-surface border border-cyber-cyan/40 text-cyber-cyan text-xs font-bold transition-all active:scale-98 flex items-center justify-center space-x-1"
              >
                {savingConfig === cfg.actionType ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <span>Update Rates</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Priority Mission Form */}
      <div className="w-full glass-panel p-4 rounded-2xl border border-cyber-border mb-4">
        <h3 className="text-xs font-bold font-mono uppercase text-slate-300 mb-3 flex items-center space-x-1.5">
          <PlusCircle size={16} className="text-cyber-gold" />
          <span>Add Priority Mission</span>
        </h3>

        <form onSubmit={handleCreateAdminMission} className="space-y-2.5">
          <input
            type="text"
            placeholder="Mission Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white"
          />
          <textarea
            placeholder="Mission Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            required
            className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white"
          />
          <input
            type="url"
            placeholder="Action URL (e.g. https://t.me/channel)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            required
            className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white"
          />
          <input
            type="text"
            placeholder="Telegram Chat ID (e.g. @channel)"
            value={newChatId}
            onChange={(e) => setNewChatId(e.target.value)}
            className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white"
          />

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-mono text-slate-400">NC Bounty</label>
              <input
                type="number"
                value={newNc}
                onChange={(e) => setNewNc(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2 py-1.5 text-xs text-cyber-gold font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400">TON Bounty</label>
              <input
                type="text"
                value={newTon}
                onChange={(e) => setNewTon(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2 py-1.5 text-xs text-cyber-cyan font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400">Target Users</label>
              <input
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400">Priority</label>
              <input
                type="number"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-2 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creatingMission}
            className="w-full py-2.5 rounded-xl bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan font-bold text-xs uppercase tracking-wide active:scale-98 transition-all flex items-center justify-center space-x-1 mt-2"
          >
            {creatingMission ? <Loader2 size={14} className="animate-spin" /> : <span>Publish Priority Mission</span>}
          </button>
        </form>
      </div>

      {/* Manage Missions List */}
      <div className="w-full glass-panel p-4 rounded-2xl border border-cyber-border mb-4">
        <h3 className="text-xs font-bold font-mono uppercase text-slate-300 mb-3 flex items-center space-x-1.5">
          <Power size={16} className="text-cyber-green" />
          <span>Active Mission Controls</span>
        </h3>

        <div className="space-y-2">
          {missions.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-cyber-bg border border-cyber-border flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-white">{m.title}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  ID: #{m.id} • {m.completedCount} claims
                </div>
              </div>

              <button
                onClick={() => handleToggleMission(m.id, !m.isCompleted)}
                className="p-2 rounded-xl bg-cyber-surface hover:bg-cyber-card border border-cyber-border text-cyber-cyan flex items-center space-x-1"
                title="Toggle Active State"
              >
                <Power size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
