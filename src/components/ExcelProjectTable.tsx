import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../types/accounting';
import { calculateProjectBalances, formatINR } from '../lib/accountingEngine';
import { Edit2, Trash2, X } from 'lucide-react';

interface Props {
  projectId: string;
  projectName: string;
  onOpenNewTx: () => void;
}

export const ExcelProjectTable: React.FC<Props> = ({ projectId, projectName, onOpenNewTx }) => {
  const { transactions, updateTransaction, deleteTransaction } = useAccounting();
  const { isAdmin } = useAuth();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [partnerFilter, setPartnerFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Transactions for this project only
  const projectTxs = transactions.filter(
    (t) => t.accountType === 'project' && t.projectId === projectId
  );

  // Filtered transactions
  const filteredTxs = projectTxs.filter((t) => {
    if (partnerFilter && !((t.who || t.toFrom || '').toLowerCase().includes(partnerFilter.toLowerCase()))) {
      return false;
    }
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  const balances = calculateProjectBalances(filteredTxs, projectId);

  const handleDelete = async (tx: Transaction) => {
    if (window.confirm(`Delete entry of ₹${tx.amount} (${tx.particulars || ''})?`)) {
      await deleteTransaction(tx.id, 'User deleted entry');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    await updateTransaction(editingTx.id, {
      date: editingTx.date,
      particulars: editingTx.particulars,
      who: editingTx.who,
      type: editingTx.type,
      amount: Number(editingTx.amount),
      remarks: editingTx.remarks,
    });
    setEditingTx(null);
  };

  return (
    <div className="space-y-3">
      {/* Filter and Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            placeholder="Filter partner / person..."
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-400 w-44 sm:w-52"
          />

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none"
              title="Start Date"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none"
              title="End Date"
            />
          </div>

          {(partnerFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setPartnerFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] text-cyan-400 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <button
          onClick={onOpenNewTx}
          className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
        >
          + Record Entry
        </button>
      </div>

      {/* Project Ledger Excel Table */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b-2 border-slate-600 text-slate-200 font-bold uppercase tracking-wider text-[11px] select-none">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-700/80 w-12 text-center">Sl.No</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-24">Date</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 min-w-[200px]">Particulars / Purpose</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-28 text-right text-emerald-300">CR Amount</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-28 text-right text-rose-300">DR Amount</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-36">Who</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 min-w-[180px]">Remarks</th>
                <th className="py-2.5 px-2 w-14 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No transactions found in {projectName}. Enter via JERRY AI Chat or tap &quot;+ Record Entry&quot;.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx, idx) => {
                  const isCR = tx.type === 'CR';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-900/80 transition-colors odd:bg-slate-950 even:bg-slate-900/30"
                    >
                      <td className="py-2 px-2 border-r border-slate-800 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                        {tx.date}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 font-medium text-white truncate max-w-[220px]">
                        {tx.particulars || '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-emerald-400 font-mono font-medium">
                        {isCR ? formatINR(tx.amount) : '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-rose-400 font-mono font-medium">
                        {!isCR ? formatINR(tx.amount) : '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-cyan-300 font-medium truncate max-w-[140px]">
                        {tx.who || tx.toFrom || '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-[11px] text-slate-300 truncate max-w-[220px]" title={tx.remarks}>
                        {tx.remarks || '—'}
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingTx(tx)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(tx)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* TOTALS & NET LEDGER BALANCE FOOTER ROW */}
            <tfoot className="sticky bottom-0 z-10 bg-slate-900 border-t-2 border-slate-600 font-bold text-white text-xs select-none">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 border-r border-slate-700 text-right uppercase tracking-wider text-[11px] text-cyan-300">
                  TOTALS & NET LEDGER BALANCE:
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 text-right tabular-nums text-emerald-400 font-mono font-bold text-sm">
                  {formatINR(balances.totalCr)}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 text-right tabular-nums text-rose-400 font-mono font-bold text-sm">
                  {formatINR(balances.totalDr)}
                </td>
                <td colSpan={3} className="py-2.5 px-3 text-right">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider mr-2 font-semibold">
                    Net Ledger Balance:
                  </span>
                  <span className="text-sm font-extrabold text-cyan-300 font-mono">
                    {formatINR(balances.netLedgerBalance)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* QUICK INLINE EDIT MODAL FOR PROJECT LEDGER */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 shadow-2xl text-slate-100 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Edit {projectName} Ledger Entry</h3>
              <button onClick={() => setEditingTx(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">CR / DR</label>
                  <select
                    value={editingTx.type}
                    onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="CR">CR (Inflow Contribution)</option>
                    <option value="DR">DR (Outflow Expense)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={editingTx.amount}
                  onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Particulars / Purpose</label>
                <input
                  type="text"
                  value={editingTx.particulars || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, particulars: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Who (Partner / Person)</label>
                <input
                  type="text"
                  value={editingTx.who || editingTx.toFrom || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, who: e.target.value, toFrom: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingTx.remarks || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, remarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
