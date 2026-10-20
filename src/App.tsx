import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { CompactBalanceCards } from './components/CompactBalanceCards';
import { ExcelPersonalTable } from './components/ExcelPersonalTable';
import { ExcelProjectTable } from './components/ExcelProjectTable';
import { SimpleChatEntry } from './components/SimpleChatEntry';
import { SettingsModal } from './components/SettingsModal';
import { ReportsDownloadModal } from './components/ReportsDownloadModal';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { OpeningBalancesModal } from './components/OpeningBalancesModal';
import { PartnerManagementModal } from './components/PartnerManagementModal';
import { ProjectsManagerModal } from './components/ProjectsManagerModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { formatINR, calculateProjectBalances, calculatePersonalBalances } from './lib/accountingEngine';
import {
  Settings,
  FileSpreadsheet,
  Menu,
  X,
  LayoutDashboard,
  UserCircle2,
  Building2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
} from 'lucide-react';

const CANONICAL_PROJECT_NAMES = [
  'NATRAJU',
  'BR',
  'BR-2',
  '200 CENTS',
  'SR',
  'SR-2',
  'RK',
  'BABUL REDDY SYTE',
  'BORU RAMASUBBAREDDY',
  '25 CENTS',
  '47 CENTS',
  '49 CENTS',
];

const MainLayout: React.FC = () => {
  const {
    activeAccount,
    selectPersonalAccount,
    selectProjectAccount,
    projects,
    transactions,
    personalConfig,
    isDemoActive,
    setIsDemoActive,
    syncStatus,
  } = useAccounting();

  // Active view: 'personal' | 'dashboard' | string (project ID)
  const [currentView, setCurrentView] = useState<'dashboard' | 'personal' | string>('personal');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isManualTxOpen, setIsManualTxOpen] = useState(false);
  const [isOpeningBalancesOpen, setIsOpeningBalancesOpen] = useState(false);
  const [isPartnersOpen, setIsPartnersOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  // Handle Account Selection from Left List
  const handleSelectNav = (key: 'dashboard' | 'personal' | string) => {
    setCurrentView(key);
    setIsMobileMenuOpen(false);

    if (key === 'personal') {
      selectPersonalAccount();
    } else if (key !== 'dashboard') {
      selectProjectAccount(key);
    }
  };

  const selectedProject = projects.find((p) => p.id === currentView);
  const personalBalances = calculatePersonalBalances(transactions, personalConfig);

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* TOP HEADER: BRAND ON LEFT, ONLY SETTINGS & REPORTS ON RIGHT */}
      <header className="sticky top-0 z-40 bg-[#070d18]/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Clean App Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-cyan-500/20">
              J
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                JERRY
              </span>
              <span className="text-xs font-semibold text-cyan-400">
                AI Accountant
              </span>
            </div>
          </div>
        </div>

        {/* TOP RIGHT CORNER: DISPLAY ONLY REPORTS & SETTINGS ICONS */}
        <div className="flex items-center gap-2">
          {isDemoActive && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              DEMO DATA
            </span>
          )}

          {/* Reports Download Icon */}
          <button
            onClick={() => setIsReportsOpen(true)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition shadow-sm"
            title="Download Excel / CSV Ledger Report"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Settings Icon */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition shadow-sm"
            title="Settings & Preferences"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </header>

      {/* THREE-PART LAYOUT */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative overflow-hidden">
        {/* LEFT SIDE: DASHBOARD & 12 PROJECT LIST (Desktop Sticky Sidebar / Mobile Drawer) */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-30 w-64 bg-slate-950 md:bg-transparent border-r border-slate-800/80 p-3 flex flex-col transition-transform duration-200 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0 top-12' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Ledger Navigation
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar pr-1">
            {/* 1. Dashboard */}
            <button
              onClick={() => handleSelectNav('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition ${
                currentView === 'dashboard'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* 2. Personal A/c */}
            <button
              onClick={() => handleSelectNav('personal')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition ${
                currentView === 'personal'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserCircle2 className="w-4 h-4 shrink-0" />
                <span>Personal A/c</span>
              </div>
              {currentView === 'personal' && <span className="text-[10px] font-extrabold">•</span>}
            </button>

            <div className="pt-2 pb-1 px-2 border-t border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              12 Project Ledgers
            </div>

            {/* The 12 Canonical Projects */}
            {CANONICAL_PROJECT_NAMES.map((canonicalName) => {
              const proj = projects.find(
                (p) => p.name.toUpperCase() === canonicalName.toUpperCase()
              );
              const projId = proj ? proj.id : `proj_${canonicalName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
              const isSelected = currentView === projId;

              return (
                <button
                  key={canonicalName}
                  onClick={() => handleSelectNav(projId)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span className="truncate">{canonicalName}</span>
                  </div>
                  {isSelected && <span className="text-[10px] font-extrabold">•</span>}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
          />
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col p-3 sm:p-5 md:p-6 overflow-x-hidden space-y-4">
          {/* VIEW: DASHBOARD OVERVIEW */}
          {currentView === 'dashboard' ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Financial Dashboard
                  </h1>
                  <p className="text-xs text-slate-400">
                    Consolidated overview of Personal A/c and all 12 Real-Estate Project Ledgers
                  </p>
                </div>
                <button
                  onClick={() => handleSelectNav('personal')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Open Personal A/c
                </button>
              </div>

              {/* Personal A/c Cards */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Personal A/c Balances
                </div>
                <CompactBalanceCards isDemoActive={isDemoActive} />
              </div>

              {/* 12 Projects Net Ledger Balance Grid */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    All 12 Project Ledgers Status
                  </div>
                  <span className="text-[11px] text-slate-400">Click any project to open ledger</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {CANONICAL_PROJECT_NAMES.map((name) => {
                    const proj = projects.find((p) => p.name.toUpperCase() === name.toUpperCase());
                    const projId = proj ? proj.id : `proj_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                    const b = calculateProjectBalances(transactions, projId);

                    return (
                      <button
                        key={name}
                        onClick={() => handleSelectNav(projId)}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left transition-all hover:-translate-y-0.5 shadow-sm group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white group-hover:text-cyan-300 truncate">
                            {name}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-xs">
                          <span className="text-slate-400 text-[11px]">Net Ledger Balance:</span>
                          <span className="font-bold font-mono text-cyan-300">
                            {formatINR(b.netLedgerBalance)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : currentView === 'personal' ? (
            /* VIEW: PERSONAL A/C (MATCHING UPLOADED EXCEL SCREENSHOT) */
            <div className="space-y-4">
              {/* 1. Account Name Heading */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Personal A/c
                  </h1>
                  <p className="text-xs text-slate-400">
                    Excel account book matching verified cash & bank balances
                  </p>
                </div>
                <button
                  onClick={() => setIsReportsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>

              {/* 2. Four Compact Balance Cards */}
              <CompactBalanceCards isDemoActive={isDemoActive} />

              {/* 3. Excel-style Transaction Table */}
              <ExcelPersonalTable onOpenNewTx={() => setIsManualTxOpen(true)} />

              {/* 4. Simple Transaction-Entry / Chat Area */}
              <div className="pt-2">
                <SimpleChatEntry onOpenManualModal={() => setIsManualTxOpen(true)} />
              </div>
            </div>
          ) : (
            /* VIEW: PROJECT LEDGER TABLE */
            <div className="space-y-4">
              {/* 1. Project Name Heading */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {selectedProject ? selectedProject.name : 'Project Ledger'}
                  </h1>
                  <p className="text-xs text-slate-400">
                    Independent project ledger • Sl.No, Date, Particulars, CR, DR, Who, Remarks
                  </p>
                </div>
                <button
                  onClick={() => setIsReportsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Project Excel</span>
                </button>
              </div>

              {/* 2. Compact Project Cards (Total CR, Total DR, Net Ledger Balance) */}
              <CompactBalanceCards isDemoActive={isDemoActive} />

              {/* 3. Project Ledger Table */}
              <ExcelProjectTable
                projectId={currentView}
                projectName={selectedProject ? selectedProject.name : 'Project'}
                onOpenNewTx={() => setIsManualTxOpen(true)}
              />

              {/* 4. Simple Transaction-Entry / Chat Area */}
              <div className="pt-2">
                <SimpleChatEntry onOpenManualModal={() => setIsManualTxOpen(true)} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ALL MODALS (SETTINGS, REPORTS, ENTRY, BALANCES, PARTNERS, PROJECTS) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenOpeningBalances={() => setIsOpeningBalancesOpen(true)}
        onOpenPartners={() => setIsPartnersOpen(true)}
        onOpenProjects={() => setIsProjectsOpen(true)}
        isDemoActive={isDemoActive}
        setIsDemoActive={setIsDemoActive}
      />

      <ReportsDownloadModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        targetAccountType={currentView === 'personal' || currentView === 'dashboard' ? 'personal' : 'project'}
        targetProjectId={currentView !== 'personal' && currentView !== 'dashboard' ? currentView : undefined}
      />

      <ManualTransactionModal
        isOpen={isManualTxOpen}
        onClose={() => setIsManualTxOpen(false)}
      />

      <OpeningBalancesModal
        isOpen={isOpeningBalancesOpen}
        onClose={() => setIsOpeningBalancesOpen(false)}
      />

      <PartnerManagementModal
        isOpen={isPartnersOpen}
        onClose={() => setIsPartnersOpen(false)}
      />

      <ProjectsManagerModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
      />

      <OfflineIndicator syncStatus={syncStatus} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AccountingProvider>
        <MainLayout />
      </AccountingProvider>
    </AuthProvider>
  );
}
