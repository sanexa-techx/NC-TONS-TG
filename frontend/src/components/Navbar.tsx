import React from 'react';
import { Pickaxe, Gamepad2, Target, Wallet, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  activeTab: 'mining' | 'game' | 'missions' | 'wallet' | 'admin';
  setActiveTab: (tab: 'mining' | 'game' | 'missions' | 'wallet' | 'admin') => void;
  isAdmin: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isAdmin }) => {
  const navItems = [
    { id: 'mining', label: 'Mining', icon: Pickaxe },
    { id: 'game', label: 'Arcade', icon: Gamepad2 },
    { id: 'missions', label: 'Missions', icon: Target },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldAlert }] : []),
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-cyber-surface/95 backdrop-blur-md border-t border-cyber-border py-2 px-3">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 ${
                isActive
                  ? 'text-cyber-cyan font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-cyber-cyan/15 shadow-glow-cyan' : ''}`}>
                <Icon size={22} className={isActive ? 'text-cyber-cyan' : 'text-slate-400'} />
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
