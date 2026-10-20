import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { calculatePersonalBalances, calculateProjectBalances, formatINR } from '../lib/accountingEngine';
import { Wallet, Landmark, TrendingUp, TrendingDown, Scale } from 'lucide-react';

interface Props {
  isDemoActive?: boolean;
}

export const CompactBalanceCards: React.FC<Props> = ({ isDemoActive }) => {
  const { activeAccount, transactions, personalConfig } = useAccounting();

  if (activeAccount.type === 'personal') {
    const balances = calculatePersonalBalances(transactions, personalConfig);

    const cards = [
      {
        name: 'CASH',
        amount: balances.cash,
        icon: Wallet,
        color: 'text-amber-400',
        bg: 'bg-slate-900/90 hover:bg-slate-800/90',
        border: 'border-slate-800 hover:border-amber-500/40',
      },
      {
        name: 'HDFC',
        amount: balances.hdfc,
        icon: Landmark,
        color: 'text-blue-400',
        bg: 'bg-slate-900/90 hover:bg-slate-800/90',
        border: 'border-slate-800 hover:border-blue-500/40',
      },
      {
        name: 'SBI',
        amount: balances.sbi,
        icon: Landmark,
        color: 'text-cyan-400',
        bg: 'bg-slate-900/90 hover:bg-slate-800/90',
        border: 'border-slate-800 hover:border-cyan-500/40',
      },
      {
        name: 'UNION',
        amount: balances.union,
        icon: Landmark,
        color: 'text-indigo-400',
        bg: 'bg-slate-900/90 hover:bg-slate-800/90',
        border: 'border-slate-800 hover:border-indigo-500/40',
      },
    ];

    return (
      <div className="space-y-2">
        {isDemoActive && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wider uppercase">
            <span>Demo Data Mode Active</span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.name}
                className={`p-3 rounded-xl border ${c.border} ${c.bg} transition-all shadow-sm`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Icon className={`w-3.5 h-3.5 ${c.color}`} />
                  <span>{c.name}</span>
                </div>
                <div className="mt-1 text-base sm:text-lg font-bold text-white tracking-tight tabular-nums">
                  {formatINR(c.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Inside Project Ledgers: Compact Project Cards (Total CR, Total DR, Net Ledger Balance)
  const projectBalances = calculateProjectBalances(transactions, activeAccount.projectId || '');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {/* Total CR */}
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span>Total CR</span>
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-1 text-base sm:text-lg font-bold text-emerald-400 tracking-tight tabular-nums">
          {formatINR(projectBalances.totalCr)}
        </div>
      </div>

      {/* Total DR */}
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span>Total DR</span>
          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div className="mt-1 text-base sm:text-lg font-bold text-rose-400 tracking-tight tabular-nums">
          {formatINR(projectBalances.totalDr)}
        </div>
      </div>

      {/* Net Ledger Balance */}
      <div className="p-3 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 to-cyan-950/40 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
          <span>Net Ledger Balance</span>
          <Scale className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="mt-1 text-base sm:text-lg font-extrabold text-white tracking-tight tabular-nums">
          {formatINR(projectBalances.netLedgerBalance)}
        </div>
      </div>
    </div>
  );
};
