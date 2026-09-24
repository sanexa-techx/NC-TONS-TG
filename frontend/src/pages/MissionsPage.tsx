import React, { useEffect, useState, useCallback } from 'react';
import { Mission } from '../types/index.js';
import { api } from '../services/api.js';
import { MissionCard } from '../components/MissionCard.js';
import { CreateMissionModal } from '../components/CreateMissionModal.js';
import { AdMissionsSection } from '../components/AdMissionsSection.js';
import { Target, PlusCircle, RefreshCw, Loader2 } from 'lucide-react';

interface MissionsPageProps {
  onRewardClaimed: (ncAwarded: number, tonAwarded: string) => void;
  userId?: number | string;
}

export const MissionsPage: React.FC<MissionsPageProps> = ({ onRewardClaimed, userId }) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAvailableMissions();
      setMissions(res.missions);
    } catch (err) {
      setError((err as Error).message || 'Failed to load missions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleClaim = async (missionId: number) => {
    const res = await api.claimMission(missionId);
    // Update local mission state
    setMissions((prev) =>
      prev.map((m) =>
        m.id === missionId ? { ...m, isCompleted: true, completedCount: m.completedCount + 1 } : m
      )
    );
    onRewardClaimed(res.ncAwarded, res.tonAwarded);
    return res;
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'social', label: 'Social' },
    { id: 'partner', label: 'Partners' },
  ];

  const filteredMissions =
    category === 'all' ? missions : missions.filter((m) => m.category === category);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      {/* Header */}
      <div className="w-full flex items-center justify-between py-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-cyber-gold/20 flex items-center justify-center text-cyber-gold">
            <Target size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Missions Marketplace</h2>
            <p className="text-[11px] text-slate-400">Complete tasks or promote channels</p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyber-gold/20 to-cyber-gold/10 border border-cyber-gold/40 text-cyber-gold text-xs font-bold flex items-center space-x-1.5 active:scale-95 transition-all shadow-glow-gold/10"
        >
          <PlusCircle size={14} />
          <span>Promote</span>
        </button>
      </div>

      {/* Rewarded Ad Networks & Withdrawal Gatekeeper HUD */}
      <div className="w-full mb-3">
        <AdMissionsSection
          userId={userId || ''}
          onRewardClaimed={() => {
            fetchMissions();
            onRewardClaimed(200, '0.000300');
          }}
        />
      </div>

      {/* Category Tabs */}
      <div className="w-full flex space-x-1.5 p-1 rounded-xl bg-cyber-surface border border-cyber-border mb-4">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              category === c.id
                ? 'bg-cyber-card text-cyber-cyan border border-cyber-cyan/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Mission List */}
      <div className="w-full">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Loader2 size={24} className="animate-spin text-cyber-cyan" />
            <span className="text-xs">Loading available missions...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-cyber-red/10 border border-cyber-red/30 text-center text-xs text-cyber-red">
            <p>{error}</p>
            <button
              onClick={fetchMissions}
              className="mt-2 py-1 px-3 rounded-lg bg-cyber-surface border border-cyber-border text-white text-[11px] flex items-center space-x-1 mx-auto"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No active missions in this category. Check back soon!
          </div>
        ) : (
          filteredMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClaim={handleClaim}
              userId={userId}
              onProofSubmitted={fetchMissions}
            />
          ))
        )}
      </div>

      {/* Create Mission Modal */}
      <CreateMissionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onMissionCreated={fetchMissions}
      />
    </div>
  );
};
