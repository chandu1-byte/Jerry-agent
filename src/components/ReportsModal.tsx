import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { calculatePartnerSummaries, calculatePersonalBalances, calculateProjectBalances, formatINR, parsePaymentSplits } from '../lib/accountingEngine';
import { X, Download, FileText, Calendar, Filter, Building2, UserCircle2, ArrowDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { activeAccount, transactions, personalConfig, projects } = useAccounting();

  const [reportTarget, setReportTarget] = useState<'current' | 'personal' | string>(
    activeAccount.type === 'personal' ? 'personal' : activeAccount.projectId || 'personal'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  // Filter transactions
  const targetTxs = transactions.filter((tx) => {
    if (reportTarget === 'personal') {
      if (tx.accountType !== 'personal') return false;
    } else {
      if (tx.accountType !== 'project' || tx.projectId !== reportTarget) return false;
    }

    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;

    return true;
  });

  const isPersonal = reportTarget === 'personal';
  const targetProject = projects.find((p) => p.id === reportTarget);

  // Calculations
  const projectBalances = !isPersonal
    ? calculateProjectBalances(targetTxs, reportTarget)
    : null;

  const partnerSummaries = !isPersonal
    ? calculatePartnerSummaries(targetTxs, reportTarget)
    : [];

  const personalBalances = isPersonal
    ? calculatePersonalBalances(targetTxs, personalConfig)
    : null;

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Account Type',
      'Project',
      'Type (DR/CR)',
      'Amount',
      'Particulars',
      'Who / Partner',
      'To / From',
      'Payment Modes',
      'Remarks',
      'Linked Transaction ID',
    ];

    const rows = targetTxs.map((t) => {
      const splits = parsePaymentSplits(t);
      const splitStr = splits.map((s) => `${s.mode}: ${s.amount}`).join('; ');

      return [
        `"${t.date}"`,
        `"${t.accountType}"`,
        `"${projects.find((p) => p.id === t.projectId)?.name || ''}"`,
        `"${t.type}"`,
        t.amount,
        `"${(t.particulars || '').replace(/"/g, '""')}"`,
        `"${(t.who || '').replace(/"/g, '""')}"`,
        `"${(t.toFrom || '').replace(/"/g, '""')}"`,
        `"${splitStr}"`,
        `"${(t.remarks || '').replace(/"/g, '""')}"`,
        `"${t.linkedTxId || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `JERRY_Report_${isPersonal ? 'Personal' : targetProject?.name || 'Project'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-6 text-slate-100 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Financial Reports & Exports</h2>
              <p className="text-xs text-slate-400">Verified accounting ledgers from persistent records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Select Account / Ledger</label>
            <select
              value={reportTarget}
              onChange={(e) => setReportTarget(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            >
              <option value="personal">Personal A/c</option>
              <optgroup label="Project Ledgers">
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
        </div>

        {/* Report Summary Card */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-sm text-cyan-300">
              {isPersonal ? 'Personal A/c Summary' : `${targetProject?.name || 'Project'} Ledger Summary`}
            </span>
            <span className="text-xs text-slate-400">{targetTxs.length} Transactions</span>
          </div>

          {isPersonal && personalBalances ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CASH</span>
                <span className="font-bold text-amber-400">{formatINR(personalBalances.cash)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">HDFC</span>
                <span className="font-bold text-blue-400">{formatINR(personalBalances.hdfc)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">SBI</span>
                <span className="font-bold text-cyan-400">{formatINR(personalBalances.sbi)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">UNION</span>
                <span className="font-bold text-indigo-400">{formatINR(personalBalances.union)}</span>
              </div>
            </div>
          ) : projectBalances ? (
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total CR (Inflow)</span>
                <span className="font-bold text-emerald-400">{formatINR(projectBalances.totalCr)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total DR (Outflow)</span>
                <span className="font-bold text-rose-400">{formatINR(projectBalances.totalDr)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                <span className="text-[10px] text-cyan-300 block">Net Ledger Balance</span>
                <span className="font-extrabold text-white text-sm">{formatINR(projectBalances.netLedgerBalance)}</span>
              </div>
            </div>
          ) : null}

          {/* Partner wise table if project */}
          {!isPersonal && partnerSummaries.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Partner Contribution Breakdown
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {partnerSummaries.map((ps) => (
                  <div key={ps.partnerName} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                    <span className="font-medium text-white">{ps.partnerName}</span>
                    <div className="text-right">
                      <span className="text-emerald-400 font-semibold block">CR: {formatINR(ps.totalCr)}</span>
                      <span className="text-rose-400 font-semibold block">DR: {formatINR(ps.totalDr)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Export Button */}
        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Validated against {targetTxs.length} underlying records
          </span>
          <button
            onClick={handleExportCSV}
            disabled={targetTxs.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-40 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV Spreadsheet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
