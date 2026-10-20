import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { exportPersonalLedgerToExcel, exportProjectLedgerToExcel } from '../lib/exportUtils';
import { X, Download, FileSpreadsheet, Calendar, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetAccountType?: 'personal' | 'project';
  targetProjectId?: string;
}

export const ReportsDownloadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  targetAccountType,
  targetProjectId,
}) => {
  const { activeAccount, projects, transactions, personalConfig } = useAccounting();

  const isPersonal = (targetAccountType || activeAccount.type) === 'personal';
  const currentProjectId = targetProjectId || activeAccount.projectId || projects[0]?.id;
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter transactions by date range
  const targetTxs = transactions.filter((t) => {
    if (isPersonal) {
      if (t.accountType !== 'personal') return false;
    } else {
      if (t.accountType !== 'project' || t.projectId !== currentProjectId) return false;
    }

    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;

    return true;
  });

  const handleDownload = () => {
    if (isPersonal) {
      exportPersonalLedgerToExcel(targetTxs, personalConfig);
    } else if (currentProject) {
      exportProjectLedgerToExcel(targetTxs, currentProject);
    }

    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 my-6 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Download Ledger Report</h2>
              <p className="text-[11px] text-slate-400">
                {isPersonal ? 'Personal A/c Excel Account Book' : `${currentProject?.name || 'Project'} Ledger Report`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 mt-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Selected Ledger
            </span>
            <div className="text-sm font-bold text-white mt-0.5">
              {isPersonal ? 'Personal A/c (Cash & 3 Banks)' : currentProject?.name}
            </div>
            <div className="text-[11px] text-cyan-400 mt-1">
              {targetTxs.length} matching transactions ready to export
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Start Date (Optional)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">End Date (Optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          {/* Format selection */}
          <div>
            <label className="text-slate-400 block mb-1">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`py-2 rounded-xl font-bold border transition ${
                  format === 'xlsx'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Excel Spreadsheet (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`py-2 rounded-xl font-bold border transition ${
                  format === 'csv'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                CSV File (.csv)
              </button>
            </div>
          </div>

          {/* Download Action */}
          <div className="flex gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-200" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
