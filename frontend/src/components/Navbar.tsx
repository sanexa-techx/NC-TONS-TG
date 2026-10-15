import React from 'react';
import { Pickaxe, Gamepad2, Target, Users, Wallet, ShieldAlert } from 'lucide-react';

export type NavTab = 'mining' | 'game' | 'missions' | 'friends' | 'wallet' | 'admin';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isAdmin: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isAdmin }) => {
  const navItems = [
    { id: 'mining', label: 'Mining', icon: Pickaxe },
    { id: 'game', label: 'Arcade', icon: Gamepad2 },
    { id: 'missions', label: 'Tasks', icon: Target },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldAlert }] : []),
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-2xl border-t border-white/10 py-1.5 px-3 shadow-2xl shadow-black/90">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-emerald-300 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-transparent border border-transparent'
                }`}
              >
                <Icon
                  size={19}
                  className={
                    isActive
                      ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                      : 'text-slate-400'
                  }
                />
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight font-medium ${
                  isActive ? 'text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
