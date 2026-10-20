import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { X, Wallet, Building, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../lib/accountingEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OpeningBalancesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { personalConfig, updatePersonalOpeningBalances } = useAccounting();

  const [cash, setCash] = useState<string>(personalConfig?.cashOpening?.toString() || '0');
  const [hdfc, setHdfc] = useState<string>(personalConfig?.hdfcOpening?.toString() || '0');
  const [sbi, setSbi] = useState<string>(personalConfig?.sbiOpening?.toString() || '0');
  const [union, setUnion] = useState<string>(personalConfig?.unionOpening?.toString() || '0');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const totalOpening = (Number(cash) || 0) + (Number(hdfc) || 0) + (Number(sbi) || 0) + (Number(union) || 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updatePersonalOpeningBalances({
        cashOpening: Number(cash) || 0,
        hdfcOpening: Number(hdfc) || 0,
        sbiOpening: Number(sbi) || 0,
        unionOpening: Number(union) || 0,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Verified Opening Balances</h3>
              <p className="text-xs text-slate-400">Personal A/c Bank & Cash Balances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="space-y-3">
            {/* CASH */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CASH Opening Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* HDFC */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">HDFC Bank Opening</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  value={hdfc}
                  onChange={(e) => setHdfc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* SBI */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">SBI Bank Opening</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  value={sbi}
                  onChange={(e) => setSbi(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* UNION */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">UNION Bank Opening</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  value={union}
                  onChange={(e) => setUnion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Total Preview */}
          <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/20 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Opening Pool:</span>
            <span className="text-base font-bold text-cyan-400">{formatINR(totalOpening)}</span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Saved!</span>
                </>
              ) : isSaving ? (
                <span>Saving...</span>
              ) : (
                <span>Save Balances</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
