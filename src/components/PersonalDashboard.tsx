import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { calculatePersonalBalances, formatINR } from '../lib/accountingEngine';
import { OpeningBalancesModal } from './OpeningBalancesModal';
import { Wallet, Landmark, AlertCircle, PlusCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const PersonalDashboard: React.FC<{ onOpenNewTx: () => void }> = ({ onOpenNewTx }) => {
  const { transactions, personalConfig } = useAccounting();
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);

  const balances = calculatePersonalBalances(transactions, personalConfig);

  const bankCards = [
    {
      name: 'CASH',
      amount: balances.cash,
      opening: balances.openingCash,
      icon: Wallet,
      color: 'from-amber-500/20 to-amber-900/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    {
      name: 'HDFC BANK',
      amount: balances.hdfc,
      opening: balances.openingHdfc,
      icon: Landmark,
      color: 'from-blue-600/20 to-blue-900/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
    },
    {
      name: 'SBI BANK',
      amount: balances.sbi,
      opening: balances.openingSbi,
      icon: Landmark,
      color: 'from-cyan-500/20 to-cyan-900/10',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
    },
    {
      name: 'UNION BANK',
      amount: balances.union,
      opening: balances.openingUnion,
      icon: Landmark,
      color: 'from-indigo-500/20 to-indigo-900/10',
      border: 'border-indigo-500/30',
      text: 'text-indigo-400',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Opening Balance configuration prompt if not configured */}
      {!balances.isOpeningConfigured && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-900/10 to-transparent border border-amber-500/30 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Opening Balances Not Configured
              </div>
              <div className="text-xs text-slate-300">
                Set verified opening amounts for Cash, HDFC, SBI, and UNION to ensure accurate running balances.
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpeningModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shrink-0 shadow-md"
          >
            Configure Balances
          </button>
        </div>
      )}

      {/* Main Total Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-cyan-500/30 p-5 md:p-6 shadow-2xl shadow-cyan-950/30">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Personal Account
              </span>
              <button
                onClick={() => setIsOpeningModalOpen(true)}
                className="text-xs text-slate-400 hover:text-cyan-300 underline underline-offset-2 transition"
              >
                Edit Opening Balances
              </button>
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-2">
              Total Verified Personal Balance
            </div>
            <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
              {formatINR(balances.total)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewTx}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {/* 4 Bank / Cash Balances Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mt-5">
          {bankCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.name}
                className={`rounded-2xl bg-gradient-to-b ${card.color} border ${card.border} p-3.5 flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400">{card.name}</span>
                  <Icon className={`w-3.5 h-3.5 ${card.text}`} />
                </div>
                <div className="mt-2">
                  <div className={`text-base md:text-lg font-bold tracking-tight ${card.text}`}>
                    {formatINR(card.amount)}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    Open: {formatINR(card.opening)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <OpeningBalancesModal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
      />
    </div>
  );
};
