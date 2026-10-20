import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useAuth } from '../context/AuthContext';
import { X, Settings, Wallet, Database, Globe, Users, Building2, LogIn, LogOut, Check, AlertCircle } from 'lucide-react';
import { DEMO_TRANSACTIONS } from '../lib/demoData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenOpeningBalances: () => void;
  onOpenPartners: () => void;
  onOpenProjects: () => void;
  isDemoActive: boolean;
  setIsDemoActive: (active: boolean) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onOpenOpeningBalances,
  onOpenPartners,
  onOpenProjects,
  isDemoActive,
  setIsDemoActive,
}) => {
  const { transactions, personalConfig } = useAccounting();
  const { currentUser, appUser, isAdmin, loginWithGoogle, logout } = useAuth();

  const [language, setLanguage] = useState<'te' | 'en' | 'hi'>('en');
  const [theme, setTheme] = useState<'navy' | 'slate' | 'midnight'>('navy');

  if (!isOpen) return null;

  const handleToggleDemo = () => {
    setIsDemoActive(!isDemoActive);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 my-6 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Application Settings</h2>
              <p className="text-[11px] text-slate-400">Configure preferences, balances, and system options</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {/* User Account & Cloud Sync */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-white block">User Account & Cloud Sync</span>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-200">
                  {currentUser ? (currentUser.displayName || currentUser.email) : 'Local Storage Mode'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentUser ? `Role: ${appUser?.role || 'Owner/Admin'} • Connected to Firebase Firestore` : 'Sign in to synchronize with cloud database across web & Android'}
                </div>
              </div>
              {currentUser ? (
                <button
                  onClick={logout}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Google Login</span>
                </button>
              )}
            </div>
          </div>

          {/* Verified Opening Balances Shortcut */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Personal A/c Opening Balances</span>
              <p className="text-[11px] text-slate-400">
                Verified opening balances for CASH, HDFC, SBI, and UNION banks
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenOpeningBalances();
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 font-semibold"
            >
              Configure
            </button>
          </div>

          {/* Demo Data Mode (Clearly Separated) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Excel Demo Dataset</span>
                <p className="text-[11px] text-slate-400">
                  Load sample transactions from the reference Excel sheet (JRR Expenses, Plot Sale 59 Cents, Hotel, Interest, EMI)
                </p>
              </div>
              <button
                onClick={handleToggleDemo}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  isDemoActive
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isDemoActive ? 'Active (Demo ON)' : 'Load Demo'}
              </button>
            </div>
            {isDemoActive && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Demo data is isolated. Real transactions are safely preserved and can be viewed anytime by toggling Demo off.
                </span>
              </div>
            )}
          </div>

          {/* Language Preference */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Accounting Assistant Language</span>
              <p className="text-[11px] text-slate-400">JERRY responds in your preferred language</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white"
            >
              <option value="en">English</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>

          {/* Navigation to Management Modals */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenPartners();
              }}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left"
            >
              <div className="flex items-center gap-2 font-bold text-white">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Partners</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Manage project partners</p>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenProjects();
              }}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left"
            >
              <div className="flex items-center gap-2 font-bold text-white">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>12 Projects</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Directory & aliases</p>
            </button>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
