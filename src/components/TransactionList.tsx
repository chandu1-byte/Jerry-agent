import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useAuth } from '../context/AuthContext';
import { Transaction, PaymentMode } from '../types/accounting';
import { formatINR, parsePaymentSplits } from '../lib/accountingEngine';
import {
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit2,
  Eye,
  X,
  Building2,
  User,
  CreditCard,
  History,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  selectedPartnerFilter?: string;
}

export const TransactionList: React.FC<Props> = ({ selectedPartnerFilter }) => {
  const { activeAccount, transactions, updateTransaction, deleteTransaction, projects } = useAccounting();
  const { isAccountant, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CR' | 'DR'>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Transaction for Detail Modal / Edit Modal
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editReason, setEditReason] = useState('');

  // Filter transactions for currently active account
  const accountTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeAccount.type === 'personal') {
        return tx.accountType === 'personal';
      }
      return tx.accountType === 'project' && tx.projectId === activeAccount.projectId;
    });
  }, [transactions, activeAccount]);

  // Apply filters
  const filteredList = useMemo(() => {
    return accountTransactions.filter((tx) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${tx.particulars || ''} ${tx.toFrom || ''} ${tx.who || ''} ${tx.remarks || ''} ${tx.amount}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // Partner filter
      if (selectedPartnerFilter) {
        const who = (tx.who || tx.toFrom || '').toLowerCase();
        if (!who.includes(selectedPartnerFilter.toLowerCase())) return false;
      }

      // CR / DR filter
      if (filterType !== 'ALL' && tx.type !== filterType) return false;

      // Payment Mode filter
      if (filterMode !== 'ALL') {
        const splits = parsePaymentSplits(tx);
        const hasMode = splits.some((s) => s.mode === filterMode) || tx.paymentMode === filterMode;
        if (!hasMode) return false;
      }

      // Date range filter
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      return true;
    });
  }, [accountTransactions, searchQuery, selectedPartnerFilter, filterType, filterMode, startDate, endDate]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    await updateTransaction(
      editingTx.id,
      {
        amount: Number(editingTx.amount),
        particulars: editingTx.particulars,
        toFrom: editingTx.toFrom,
        who: editingTx.who,
        date: editingTx.date,
        remarks: editingTx.remarks,
      },
      editReason || 'User edited transaction'
    );
    setEditingTx(null);
    setDetailTx(null);
  };

  const handleDelete = async (tx: Transaction) => {
    if (window.confirm(`Are you sure you want to delete this ${tx.type} entry of ₹${tx.amount}? An audit record will be logged.`)) {
      await deleteTransaction(tx.id, 'User deleted entry');
      setDetailTx(null);
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 md:p-6 shadow-xl space-y-4">
      {/* Header and Search Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Transaction Ledger</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-semibold">
              {filteredList.length} records
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            {activeAccount.type === 'personal'
              ? 'Personal A/c Receipts & Payments'
              : `${activeAccount.name} Ledger History`}
          </p>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search person, purpose, remarks..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* CR / DR Toggle */}
        <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
          {(['ALL', 'CR', 'DR'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                filterType === t
                  ? t === 'CR'
                    ? 'bg-emerald-500 text-slate-950'
                    : t === 'DR'
                    ? 'bg-rose-500 text-white'
                    : 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'ALL' ? 'All Types' : t === 'CR' ? 'CR Only' : 'DR Only'}
            </button>
          ))}
        </div>

        {/* Payment mode filter (for Personal A/c) */}
        {activeAccount.type === 'personal' && (
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">CASH</option>
            <option value="HDFC">HDFC</option>
            <option value="SBI">SBI</option>
            <option value="UNION">UNION</option>
          </select>
        )}

        {/* Date pickers */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
            title="Start Date"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
            title="End Date"
          />
        </div>

        {(startDate || endDate || filterType !== 'ALL' || filterMode !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setFilterType('ALL');
              setFilterMode('ALL');
              setSearchQuery('');
            }}
            className="text-[11px] text-cyan-400 hover:underline px-1"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Transactions Table / Cards */}
      {filteredList.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <h3 className="text-sm font-semibold text-slate-300">No Transactions Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {accountTransactions.length === 0
              ? 'No records in this ledger yet. Use the JERRY AI Chat or the Add Transaction button to record your first entry.'
              : 'No transactions match the selected search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredList.map((tx) => {
            const isCredit = tx.type === 'CR';
            const splits = parsePaymentSplits(tx);

            return (
              <div
                key={tx.id}
                onClick={() => setDetailTx(tx)}
                className="group p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/30 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                {/* Left icon & Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCredit
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isCredit ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white truncate">
                        {tx.particulars || 'Accounting Entry'}
                      </span>
                      {tx.linkedTxId && (
                        <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                          Linked
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{tx.date}</span>
                      {(tx.who || tx.toFrom) && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300">{tx.who || tx.toFrom}</span>
                        </>
                      )}
                      {splits.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400 font-medium">
                            {splits.map((s) => `${s.mode}: ₹${s.amount}`).join(', ')}
                          </span>
                        </>
                      )}
                      {tx.classification && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
                          {tx.classification}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-base font-bold tracking-tight ${
                      isCredit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isCredit ? '+' : '-'}{formatINR(tx.amount)}
                  </div>
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                    {tx.type}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                    detailTx.type === 'CR'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {detailTx.type} Entry
                </span>
                <span className="text-sm font-bold text-white">Transaction Details</span>
              </div>
              <button
                onClick={() => setDetailTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 my-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Amount</span>
                <span className="text-lg font-extrabold text-cyan-400">
                  {formatINR(detailTx.amount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block">Date</span>
                  <span className="font-semibold text-white">{detailTx.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account</span>
                  <span className="font-semibold text-white">
                    {detailTx.accountType === 'personal'
                      ? 'Personal A/c'
                      : projects.find((p) => p.id === detailTx.projectId)?.name || 'Project'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Who / Partner</span>
                  <span className="font-semibold text-white">{detailTx.who || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">To / From</span>
                  <span className="font-semibold text-white">{detailTx.toFrom || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block">Particulars / Purpose</span>
                <span className="font-medium text-slate-200">{detailTx.particulars || '—'}</span>
              </div>

              {detailTx.paymentModesJson || detailTx.paymentMode ? (
                <div>
                  <span className="text-slate-400 block">Payment Mode(s)</span>
                  <span className="font-semibold text-cyan-300">
                    {parsePaymentSplits(detailTx).map((s) => `${s.mode}: ₹${s.amount}`).join(', ')}
                  </span>
                </div>
              ) : null}

              {detailTx.remarks && (
                <div>
                  <span className="text-slate-400 block">Remarks</span>
                  <span className="text-slate-300 italic">{detailTx.remarks}</span>
                </div>
              )}

              {detailTx.linkedTxId && (
                <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-200 text-[11px]">
                  Linked Transaction Reference: <code>{detailTx.linkedTxId}</code>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Created by: {detailTx.createdByName || detailTx.createdBy}</span>
                <span>ID: {detailTx.id}</span>
              </div>
            </div>

            {/* Actions: Edit, Delete */}
            {isAccountant && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setEditingTx(detailTx)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Record</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(detailTx)}
                    className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-6 text-slate-100">
            <h3 className="text-sm font-bold text-white mb-3">Edit Transaction (Audited)</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Amount</label>
                <input
                  type="number"
                  value={editingTx.amount}
                  onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={editingTx.date}
                  onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Particulars / Purpose</label>
                <input
                  type="text"
                  value={editingTx.particulars || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, particulars: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Who / Partner / To-From</label>
                <input
                  type="text"
                  value={editingTx.who || editingTx.toFrom || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, who: e.target.value, toFrom: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Audit Reason for Edit</label>
                <input
                  type="text"
                  placeholder="Why is this change being made?"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-400"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
