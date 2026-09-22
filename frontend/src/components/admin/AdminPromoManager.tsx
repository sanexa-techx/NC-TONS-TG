import React, { useState, useEffect, useCallback } from 'react';
import { PromoCode } from '../../types/index.js';
import { api } from '../../services/api.js';
import { Ticket, PlusCircle, Power, Trash2, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { TonIcon, NcIcon } from '../icons/index.js';

export const AdminPromoManager: React.FC = () => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [newCode, setNewCode] = useState('');
  const [newNcReward, setNewNcReward] = useState('500');
  const [newTonReward, setNewTonReward] = useState('0.000050');
  const [newMaxClaims, setNewMaxClaims] = useState('100');

  const fetchPromos = useCallback(async () => {
    try {
      const res = await api.getAdminPromos();
      setPromos(res.promos);
    } catch (err: any) {
      console.error('Failed to load admin promos:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch promo codes' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim().toUpperCase();
    if (!code) return;

    setCreating(true);
    setMessage(null);

    try {
      await api.createAdminPromo({
        code,
        ncReward: Number(newNcReward) || 0,
        tonReward: Number(newTonReward) || 0,
        maxClaims: newMaxClaims.trim() === '' ? null : Number(newMaxClaims),
      });

      setMessage({ type: 'success', text: `Promo code "${code}" deployed successfully!` });
      setNewCode('');
      setNewNcReward('500');
      setNewTonReward('0.000050');
      setNewMaxClaims('100');
      fetchPromos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create promo code' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: number) => {
    setTogglingId(id);
    setMessage(null);
    try {
      const res = await api.toggleAdminPromo(id);
      setPromos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: res.is_active } : p))
      );
      setMessage({
        type: 'success',
        text: `Promo code status updated to ${res.is_active ? 'ACTIVE' : 'PAUSED'}.`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to toggle promo code' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number, code: string) => {
    if (!window.confirm(`Are you sure you want to delete promo code "${code}"?`)) {
      return;
    }

    setDeletingId(id);
    setMessage(null);
    try {
      await api.deleteAdminPromo(id);
      setPromos((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: 'success', text: `Promo code "${code}" deleted.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete promo code' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Creation Card */}
      <div className="w-full glass-panel p-4 rounded-2xl border border-cyber-border relative overflow-hidden">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-cyber-gold/20 flex items-center justify-center text-cyber-gold border border-cyber-gold/30">
            <PlusCircle size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wide flex items-center gap-1.5">
              <span>Create Dynamic Promo Code</span>
              <Sparkles size={12} className="text-cyber-gold" />
            </h3>
            <p className="text-[10px] text-slate-400">Generate dual-currency bounties with redemption caps</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-2.5 mb-3 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn ${
              message.type === 'success'
                ? 'bg-cyber-green/15 text-cyber-green border border-cyber-green/40'
                : 'bg-cyber-red/15 text-cyber-red border border-cyber-red/40'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span className="leading-tight">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleCreatePromo} className="space-y-3">
          {/* Code text input */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 block">
              Promo Code String (Upper)
            </label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="e.g. BOOST2026"
              required
              className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-cyber-gold"
            />
          </div>

          {/* Dual-Reward Configuration */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 flex items-center space-x-1">
                <NcIcon className="w-3.5 h-3.5" />
                <span>NC Coin Reward</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={newNcReward}
                onChange={(e) => setNewNcReward(e.target.value)}
                required
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-gold"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 flex items-center space-x-1">
                <TonIcon className="w-3.5 h-3.5" />
                <span>TON Reward</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.000001"
                value={newTonReward}
                onChange={(e) => setNewTonReward(e.target.value)}
                required
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          {/* Max Claims Cap */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase mb-1 flex items-center justify-between">
              <span>Max Claims Cap</span>
              <span className="text-[9px] text-slate-500 lowercase">(leave blank for unlimited)</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={newMaxClaims}
              onChange={(e) => setNewMaxClaims(e.target.value)}
              placeholder="e.g. 100 or leave empty"
              className="w-full bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyber-cyan"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyber-gold to-yellow-500 text-cyber-bg font-extrabold text-xs uppercase tracking-wider shadow-glow-gold active:scale-98 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Deploying Code...</span>
              </>
            ) : (
              <>
                <Ticket size={14} />
                <span>Deploy Promo Code</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Active Codes List */}
      <div className="w-full glass-panel p-4 rounded-2xl border border-cyber-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Ticket size={16} className="text-cyber-cyan" />
            <h3 className="text-xs font-bold font-mono uppercase text-slate-300">
              Active Promo Codes ({promos.length})
            </h3>
          </div>
          <button
            onClick={fetchPromos}
            disabled={loading}
            className="text-[10px] text-cyber-cyan font-mono hover:underline disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <Loader2 size={16} className="animate-spin text-cyber-cyan" />
            <span>Loading promo registry...</span>
          </div>
        ) : promos.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">
            No promo codes deployed yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {promos.map((p) => {
              const maxNum = p.max_claims;
              const isExhausted = maxNum !== null && p.claimed_count >= maxNum;
              const percent = maxNum !== null ? Math.min(100, Math.round((p.claimed_count / maxNum) * 100)) : null;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition-all ${
                    p.is_active && !isExhausted
                      ? 'bg-cyber-bg/90 border-cyber-border hover:border-cyber-border-glow'
                      : 'bg-cyber-bg/40 border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-white tracking-wider">
                        {p.code}
                      </span>
                      {p.is_active ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyber-green/15 text-cyber-green border border-cyber-green/30">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyber-red/15 text-cyber-red border border-cyber-red/30">
                          PAUSED
                        </span>
                      )}
                      {isExhausted && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/30">
                          MAX REACHED
                        </span>
                      )}
                    </div>

                    {/* Actions: Toggle & Delete */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleToggle(p.id)}
                        disabled={togglingId === p.id}
                        title={p.is_active ? 'Pause promo code' : 'Activate promo code'}
                        className={`p-1.5 rounded-lg border text-xs font-mono transition-all ${
                          p.is_active
                            ? 'bg-cyber-green/10 border-cyber-green/40 text-cyber-green hover:bg-cyber-green/20'
                            : 'bg-cyber-card border-cyber-border text-slate-400 hover:text-white'
                        }`}
                      >
                        {togglingId === p.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Power size={13} />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(p.id, p.code)}
                        disabled={deletingId === p.id}
                        title="Delete promo code"
                        className="p-1.5 rounded-lg bg-cyber-red/10 border border-cyber-red/30 text-cyber-red hover:bg-cyber-red/20 transition-all"
                      >
                        {deletingId === p.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Rewards display */}
                  <div className="flex items-center gap-3 text-xs mb-2">
                    <span className="flex items-center space-x-1 text-cyber-gold font-mono font-bold">
                      <NcIcon className="w-3.5 h-3.5" />
                      <span>+{p.nc_reward.toLocaleString()} NC</span>
                    </span>
                    <span className="flex items-center space-x-1 text-cyber-cyan font-mono font-bold">
                      <TonIcon className="w-3.5 h-3.5" />
                      <span>+{p.ton_reward} TON</span>
                    </span>
                  </div>

                  {/* Claims progress bar */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                      <span>Redemptions:</span>
                      <span className="text-white font-bold">
                        {p.claimed_count} / {maxNum !== null ? maxNum : '∞'} Claimed
                        {percent !== null && ` (${percent}%)`}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-cyber-card rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isExhausted
                            ? 'bg-cyber-red'
                            : 'bg-gradient-to-r from-cyber-cyan to-cyber-green'
                        }`}
                        style={{
                          width: maxNum !== null ? `${Math.min(100, (p.claimed_count / maxNum) * 100)}%` : '100%',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
