import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import {
  calculatePartnerSummaries,
  calculateProjectBalances,
  formatINR,
} from '../lib/accountingEngine';
import {
  Building2,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
} from 'lucide-react';

interface Props {
  projectId: string;
  projectName: string;
  onOpenNewTx: () => void;
  onSelectPartnerFilter?: (partnerName: string) => void;
  selectedPartnerFilter?: string;
}

export const ProjectDashboard: React.FC<Props> = ({
  projectId,
  projectName,
  onOpenNewTx,
  onSelectPartnerFilter,
  selectedPartnerFilter,
}) => {
  const { transactions } = useAccounting();

  const balances = calculateProjectBalances(transactions, projectId);
  const partnerSummaries = calculatePartnerSummaries(transactions, projectId);

  return (
    <div className="space-y-4">
      {/* Project Header Banner & Main Balances Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/30 p-5 md:p-6 shadow-2xl shadow-cyan-950/30">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Building2 className="w-3 h-3" />
                Project Ledger
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {balances.transactionCount} transactions recorded
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1.5">
              {projectName}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Independent project ledger with verified Total CR, DR, and Net Ledger Balance
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenNewTx}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Project Entry</span>
            </button>
          </div>
        </div>

        {/* 3 Metrics: Total CR, Total DR, Net Ledger Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          {/* Total CR */}
          <div className="rounded-2xl bg-gradient-to-b from-emerald-500/15 to-emerald-950/20 border border-emerald-500/30 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total CR (Inflow)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-400 mt-2">
              {formatINR(balances.totalCr)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Contributions & receipts into project</div>
          </div>

          {/* Total DR */}
          <div className="rounded-2xl bg-gradient-to-b from-rose-500/15 to-rose-950/20 border border-rose-500/30 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total DR (Outflow)</span>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-rose-400 mt-2">
              {formatINR(balances.totalDr)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Project expenses & payouts</div>
          </div>

          {/* Net Ledger Balance */}
          <div className="rounded-2xl bg-gradient-to-b from-cyan-500/20 to-blue-950/40 border border-cyan-400/40 p-4 flex flex-col justify-between shadow-lg shadow-cyan-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Net Ledger Balance</span>
              <Scale className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-white mt-2">
              {formatINR(balances.netLedgerBalance)}
            </div>
            <div className="text-[10px] text-cyan-400/80 mt-1">
              Total CR − Total DR (Preserving ledger convention)
            </div>
          </div>
        </div>
      </div>

      {/* Partner Wise Contribution Summary */}
      {partnerSummaries.length > 0 && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Partner Contributions ({projectName})
              </h2>
            </div>
            {selectedPartnerFilter && onSelectPartnerFilter && (
              <button
                onClick={() => onSelectPartnerFilter('')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Clear filter ({selectedPartnerFilter})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {partnerSummaries.map((p) => {
              const isSelected = selectedPartnerFilter === p.partnerName;
              return (
                <button
                  key={p.partnerName}
                  onClick={() => onSelectPartnerFilter?.(isSelected ? '' : p.partnerName)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-white truncate max-w-[150px]">
                      {p.partnerName}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.transactionCount} entries</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">CR (In)</span>
                      <span className="font-semibold text-emerald-400">{formatINR(p.totalCr)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">DR (Out)</span>
                      <span className="font-semibold text-rose-400">{formatINR(p.totalDr)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
