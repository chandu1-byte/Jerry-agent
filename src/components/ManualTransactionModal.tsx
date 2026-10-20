import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { AccountType, PaymentMode, PaymentSplit, TransactionType } from '../types/accounting';
import { PAYMENT_MODES } from '../lib/constants';
import { formatINR } from '../lib/accountingEngine';
import { X, Plus, Trash2, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualTransactionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    activeAccount,
    projects,
    partners,
    addTransaction,
    addLinkedInvestment,
  } = useAccounting();

  // Mode: standard or linked personal-to-project investment
  const [isLinkedMode, setIsLinkedMode] = useState(false);

  // Form Fields
  const [accountType, setAccountType] = useState<AccountType>(activeAccount.type);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeAccount.projectId || (projects[0]?.id || ''));
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('DR');
  const [amount, setAmount] = useState<string>('');
  const [particulars, setParticulars] = useState('');
  const [toFrom, setToFrom] = useState('');
  const [who, setWho] = useState('');
  const [remarks, setRemarks] = useState('');
  const [classification, setClassification] = useState('expense');

  // Split Payment Modes for Personal A/c
  const [useSplitMode, setUseSplitMode] = useState(false);
  const [singleMode, setSingleMode] = useState<PaymentMode>('CASH');
  const [splits, setSplits] = useState<PaymentSplit[]>([
    { mode: 'CASH', amount: 0 },
  ]);

  // Linked Investment fields
  const [destProjectId, setDestProjectId] = useState<string>(projects[0]?.id || '');
  const [linkedModeSource, setLinkedModeSource] = useState<PaymentMode>('HDFC');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSplitsTotal = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  const addSplitRow = () => {
    const existingModes = splits.map((s) => s.mode);
    const nextMode = PAYMENT_MODES.find((m) => !existingModes.includes(m)) || 'CASH';
    setSplits([...splits, { mode: nextMode, amount: 0 }]);
  };

  const removeSplitRow = (idx: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== idx));
    }
  };

  const updateSplit = (idx: number, mode: PaymentMode, val: number) => {
    const updated = [...splits];
    updated[idx] = { mode, amount: val };
    setSplits(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = isLinkedMode
      ? Number(amount)
      : useSplitMode && accountType === 'personal'
      ? currentSplitsTotal
      : Number(amount);

    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Please enter a valid positive amount.');
      return;
    }

    if (!date) {
      setErrorMessage('Please select a valid date.');
      return;
    }

    if (useSplitMode && accountType === 'personal') {
      if (currentSplitsTotal <= 0) {
        setErrorMessage('Sum of split payments must be greater than zero.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isLinkedMode) {
        // Linked Personal-to-Project Investment
        await addLinkedInvestment({
          amount: numAmount,
          sourcePaymentMode: linkedModeSource,
          destinationProjectId: destProjectId,
          who: who || 'Owner',
          date,
          remarks,
          classification: 'investment',
        });
      } else if (accountType === 'personal') {
        const paymentModesList = useSplitMode
          ? splits.filter((s) => s.amount > 0)
          : [{ mode: singleMode, amount: numAmount }];

        await addTransaction({
          accountType: 'personal',
          date,
          type,
          amount: numAmount,
          particulars: particulars || (type === 'DR' ? 'Personal Expense' : 'Personal Receipt'),
          toFrom,
          paymentMode: paymentModesList[0]?.mode || 'CASH',
          paymentModesJson: JSON.stringify(paymentModesList),
          remarks,
          classification,
        });
      } else {
        // Project A/c Ledger Entry
        await addTransaction({
          accountType: 'project',
          projectId: selectedProjectId,
          date,
          type,
          amount: numAmount,
          particulars: particulars || (type === 'CR' ? 'Project Contribution' : 'Project Expense'),
          who: who || 'Partner / Person',
          toFrom,
          remarks,
          classification,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-6 text-slate-100 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Manual Transaction Entry</h2>
            <p className="text-xs text-slate-400">
              {isLinkedMode
                ? 'Linked Personal → Project Transfer'
                : accountType === 'personal'
                ? 'Personal Account Ledger Entry'
                : 'Project Ledger Entry'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tab */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setIsLinkedMode(false)}
            className={`py-1.5 rounded-lg font-semibold transition ${
              !isLinkedMode
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Direct Entry
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLinkedMode(true);
              setAccountType('personal');
            }}
            className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
              isLinkedMode
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Linked Project Investment</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* LINKED MODE SECTION */}
          {isLinkedMode ? (
            <div className="space-y-3 p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30">
              <div className="text-xs font-semibold text-cyan-300">
                Source: Personal A/c Bank Outflow
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Source Payment Mode</label>
                  <select
                    value={linkedModeSource}
                    onChange={(e) => setLinkedModeSource(e.target.value as PaymentMode)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Transfer Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 100000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="text-xs font-semibold text-cyan-300 pt-2 border-t border-slate-800">
                Destination: Project Contribution (CR)
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Destination Project</label>
                <select
                  value={destProjectId}
                  onChange={(e) => setDestProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Partner / Person Name</label>
                <input
                  type="text"
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  placeholder="e.g. Owner or Partner Name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
          ) : (
            /* STANDARD DIRECT ENTRY */
            <>
              {/* Account Selection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Target Account</label>
                  <select
                    value={accountType === 'personal' ? 'personal' : selectedProjectId}
                    onChange={(e) => {
                      if (e.target.value === 'personal') {
                        setAccountType('personal');
                      } else {
                        setAccountType('project');
                        setSelectedProjectId(e.target.value);
                      }
                    }}
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
                  <label className="text-slate-300 block mb-1">Transaction Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setType('DR')}
                      className={`flex-1 py-2 rounded-xl font-bold transition ${
                        type === 'DR'
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}
                    >
                      DR (Payment/Out)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('CR')}
                      className={`flex-1 py-2 rounded-xl font-bold transition ${
                        type === 'CR'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}
                    >
                      CR (Receipt/In)
                    </button>
                  </div>
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Amount (₹) {useSplitMode && accountType === 'personal' && '(Calculated from splits)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    disabled={useSplitMode && accountType === 'personal'}
                    value={useSplitMode && accountType === 'personal' ? currentSplitsTotal : amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white disabled:opacity-75"
                    required={!useSplitMode}
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              {/* Payment Mode for Personal A/c */}
              {accountType === 'personal' && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">Payment Mode</label>
                    <button
                      type="button"
                      onClick={() => setUseSplitMode(!useSplitMode)}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      {useSplitMode ? 'Switch to Single Mode' : 'Split Across Multiple Banks'}
                    </button>
                  </div>

                  {!useSplitMode ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {PAYMENT_MODES.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSingleMode(mode)}
                          className={`py-1.5 rounded-lg font-bold text-center transition ${
                            singleMode === mode
                              ? 'bg-cyan-500 text-slate-950 shadow-md'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* SPLIT AMOUNTS CALCULATOR */
                    <div className="space-y-2">
                      {splits.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={s.mode}
                            onChange={(e) => updateSplit(idx, e.target.value as PaymentMode, s.amount)}
                            className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                          >
                            {PAYMENT_MODES.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="any"
                            value={s.amount || ''}
                            onChange={(e) => updateSplit(idx, s.mode, Number(e.target.value) || 0)}
                            placeholder="Amount"
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeSplitRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={addSplitRow}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bank Split</span>
                        </button>
                        <span className="font-bold text-cyan-400">
                          Total: {formatINR(currentSplitsTotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Particulars & Person */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">
                    {accountType === 'personal' ? 'To / From' : 'Who (Partner / Person)'}
                  </label>
                  <input
                    type="text"
                    value={accountType === 'personal' ? toFrom : who}
                    onChange={(e) =>
                      accountType === 'personal' ? setToFrom(e.target.value) : setWho(e.target.value)
                    }
                    placeholder="e.g. Ramesh, Contractor, Self"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Classification</label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income / Receipt</option>
                    <option value="investment">Project Investment</option>
                    <option value="advance">Advance</option>
                    <option value="loan">Loan</option>
                    <option value="supplier">Supplier / Contractor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Particulars / Purpose</label>
                <input
                  type="text"
                  value={particulars}
                  onChange={(e) => setParticulars(e.target.value)}
                  placeholder="e.g. Soil purchase, electricity bill, partner share"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
            </>
          )}

          {/* Remarks */}
          <div>
            <label className="text-slate-300 block mb-1">Remarks (Optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. PhonePe transaction ID, cheque number, notes"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
