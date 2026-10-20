import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../types/accounting';
import { formatINR, parsePaymentSplits } from '../lib/accountingEngine';
import { Edit2, Trash2, X, Check, ArrowUpDown } from 'lucide-react';

interface Props {
  onOpenNewTx: () => void;
}

export const ExcelPersonalTable: React.FC<Props> = ({ onOpenNewTx }) => {
  const { transactions, personalConfig, updateTransaction, deleteTransaction } = useAccounting();
  const { isAccountant, isAdmin } = useAuth();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'CR' | 'DR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter personal transactions
  const personalTxs = transactions.filter((t) => t.accountType === 'personal');

  // Search & Filter
  const filteredTxs = personalTxs.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = `${t.toFrom || ''} ${t.particulars || ''} ${t.syteName || ''} ${t.remarks || ''}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  // Calculate Column Totals across all Personal Txs
  let sumCash = personalConfig?.cashOpening || 0;
  let sumHdfc = personalConfig?.hdfcOpening || 0;
  let sumSbi = personalConfig?.sbiOpening || 0;
  let sumUnion = personalConfig?.unionOpening || 0;
  let sumTotal = sumCash + sumHdfc + sumSbi + sumUnion;

  personalTxs.forEach((t) => {
    const splits = parsePaymentSplits(t);
    const isCredit = t.type === 'CR';
    const mult = isCredit ? 1 : -1;

    splits.forEach((s) => {
      if (s.mode === 'CASH') sumCash += s.amount * mult;
      else if (s.mode === 'HDFC') sumHdfc += s.amount * mult;
      else if (s.mode === 'SBI') sumSbi += s.amount * mult;
      else if (s.mode === 'UNION') sumUnion += s.amount * mult;
    });

    sumTotal += t.amount * mult;
  });

  const handleDelete = async (tx: Transaction) => {
    if (window.confirm(`Delete ${tx.type} entry of ₹${tx.amount} (${tx.particulars || ''})?`)) {
      await deleteTransaction(tx.id, 'User deleted entry');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    await updateTransaction(editingTx.id, {
      date: editingTx.date,
      toFrom: editingTx.toFrom,
      particulars: editingTx.particulars,
      syteName: editingTx.syteName,
      type: editingTx.type,
      amount: Number(editingTx.amount),
      remarks: editingTx.remarks,
    });
    setEditingTx(null);
  };

  return (
    <div className="space-y-3">
      {/* Quick Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TO/FROM, Purpose, Syte..."
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-400 w-48 sm:w-64"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            {(['ALL', 'CR', 'DR'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  filterType === t
                    ? t === 'CR'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : t === 'DR'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={onOpenNewTx}
            className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
          >
            + Entry
          </button>
        </div>
      </div>

      {/* Excel Spreadsheet Table Container */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse font-sans">
            {/* Table Header: Exactly 12 columns */}
            <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b-2 border-slate-600 text-slate-200 font-bold uppercase tracking-wider text-[11px] select-none">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-700/80 w-12 text-center">Sl.No</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-24">Date</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 min-w-[130px]">TO/FROM</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 min-w-[150px]">PURPOSE</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-28">Syte Name</th>
                <th className="py-2.5 px-2 border-r border-slate-700/80 w-16 text-center">CR/DR</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-24 text-right">CASH</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-24 text-right">HDFC</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-24 text-right">SBI</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-24 text-right">UNION</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 w-28 text-right bg-slate-800/80 text-cyan-300">TOTAL</th>
                <th className="py-2.5 px-3 border-r border-slate-700/80 min-w-[160px]">REMARKS</th>
                <th className="py-2.5 px-2 w-14 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-300">
              {/* OPENING BALANCE ROW */}
              <tr className="bg-slate-900/60 font-semibold text-slate-300 border-b border-slate-700">
                <td className="py-2 px-2 border-r border-slate-800 text-center text-slate-400">—</td>
                <td className="py-2 px-3 border-r border-slate-800 text-slate-400">Opening</td>
                <td className="py-2 px-3 border-r border-slate-800 font-bold text-white">OPENING BALANCE</td>
                <td className="py-2 px-3 border-r border-slate-800 text-slate-400">Verified Initial Balances</td>
                <td className="py-2 px-3 border-r border-slate-800 text-slate-400">PERSONAL</td>
                <td className="py-2 px-2 border-r border-slate-800 text-center">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    CR
                  </span>
                </td>
                <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-amber-300 font-medium">
                  {personalConfig?.cashOpening ? formatINR(personalConfig.cashOpening) : '—'}
                </td>
                <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-blue-300 font-medium">
                  {personalConfig?.hdfcOpening ? formatINR(personalConfig.hdfcOpening) : '—'}
                </td>
                <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-cyan-300 font-medium">
                  {personalConfig?.sbiOpening ? formatINR(personalConfig.sbiOpening) : '—'}
                </td>
                <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-indigo-300 font-medium">
                  {personalConfig?.unionOpening ? formatINR(personalConfig.unionOpening) : '—'}
                </td>
                <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums font-bold text-cyan-300 bg-slate-900/40">
                  {formatINR(
                    (personalConfig?.cashOpening || 0) +
                    (personalConfig?.hdfcOpening || 0) +
                    (personalConfig?.sbiOpening || 0) +
                    (personalConfig?.unionOpening || 0)
                  )}
                </td>
                <td className="py-2 px-3 border-r border-slate-800 text-[11px] text-slate-400 italic">
                  Initial verified bank & cash balances
                </td>
                <td className="py-2 px-2 text-center text-slate-500 text-[10px]">Auto</td>
              </tr>

              {/* TRANSACTIONS ROWS */}
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-slate-400 text-xs">
                    No transactions recorded. Enter via JERRY AI Chat or tap &quot;+ Entry&quot;.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx, idx) => {
                  const isCredit = tx.type === 'CR';
                  const splits = parsePaymentSplits(tx);

                  let cashAmt = 0;
                  let hdfcAmt = 0;
                  let sbiAmt = 0;
                  let unionAmt = 0;

                  splits.forEach((s) => {
                    if (s.mode === 'CASH') cashAmt += s.amount;
                    else if (s.mode === 'HDFC') hdfcAmt += s.amount;
                    else if (s.mode === 'SBI') sbiAmt += s.amount;
                    else if (s.mode === 'UNION') unionAmt += s.amount;
                  });

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
                      <td className="py-2 px-3 border-r border-slate-800 font-medium text-white truncate max-w-[140px]">
                        {tx.toFrom || '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-slate-200 truncate max-w-[180px]">
                        {tx.particulars || '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-cyan-300 font-medium uppercase text-[11px] truncate max-w-[120px]">
                        {tx.syteName || 'PERSONAL'}
                      </td>
                      <td className="py-2 px-2 border-r border-slate-800 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isCredit
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-amber-300/90 font-mono">
                        {cashAmt > 0 ? formatINR(cashAmt) : '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-blue-300/90 font-mono">
                        {hdfcAmt > 0 ? formatINR(hdfcAmt) : '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-cyan-300/90 font-mono">
                        {sbiAmt > 0 ? formatINR(sbiAmt) : '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-right tabular-nums text-indigo-300/90 font-mono">
                        {unionAmt > 0 ? formatINR(unionAmt) : '—'}
                      </td>
                      <td
                        className={`py-2 px-3 border-r border-slate-800 text-right tabular-nums font-bold font-mono ${
                          isCredit ? 'text-emerald-400 bg-emerald-950/15' : 'text-rose-400 bg-rose-950/15'
                        }`}
                      >
                        {formatINR(tx.amount)}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-800 text-[11px] text-slate-300 truncate max-w-[200px]" title={tx.remarks}>
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

            {/* TOTALS / CLOSING BALANCE FOOTER ROW */}
            <tfoot className="sticky bottom-0 z-10 bg-slate-900 border-t-2 border-slate-600 font-bold text-white text-xs select-none">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 border-r border-slate-700 text-right tracking-wider uppercase text-[11px] text-cyan-300">
                  CLOSING RUNNING BALANCES:
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 text-right tabular-nums text-amber-400 font-mono font-bold">
                  {formatINR(sumCash)}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 text-right tabular-nums text-blue-400 font-mono font-bold">
                  {formatINR(sumHdfc)}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 text-right tabular-nums text-cyan-400 font-mono font-bold">
                  {formatINR(sumSbi)}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 text-right tabular-nums text-indigo-400 font-mono font-bold">
                  {formatINR(sumUnion)}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 text-right tabular-nums text-base font-extrabold text-white bg-cyan-950/60 font-mono">
                  {formatINR(sumTotal)}
                </td>
                <td colSpan={2} className="py-2.5 px-3 text-[11px] text-slate-400 font-normal">
                  Verified Total
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* QUICK INLINE EDIT MODAL */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 shadow-2xl text-slate-100 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Edit Personal Ledger Row</h3>
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
                    <option value="DR">DR (Outflow)</option>
                    <option value="CR">CR (Inflow)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">TO / FROM</label>
                <input
                  type="text"
                  value={editingTx.toFrom || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, toFrom: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PURPOSE</label>
                <input
                  type="text"
                  value={editingTx.particulars || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, particulars: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Syte Name</label>
                  <input
                    type="text"
                    value={editingTx.syteName || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, syteName: e.target.value })}
                    placeholder="e.g. PERSONAL, 59 CENTS"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
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
