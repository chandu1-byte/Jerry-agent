import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { JerryAIDraft, PaymentMode } from '../types/accounting';
import { resolveProjectAlias, PAYMENT_MODES } from '../lib/constants';
import { formatINR } from '../lib/accountingEngine';
import { Send, Sparkles, CheckCircle2, XCircle, Edit3, Bot, AlertTriangle, ArrowRightLeft } from 'lucide-react';

interface Props {
  onOpenManualModal: () => void;
}

export const SimpleChatEntry: React.FC<Props> = ({ onOpenManualModal }) => {
  const { activeAccount, projects, addTransaction, addLinkedInvestment, selectProjectAccount } = useAccounting();

  const [inputMessage, setInputMessage] = useState('');
  const [activeDraft, setActiveDraft] = useState<JerryAIDraft | null>(null);
  const [jerryResponseText, setJerryResponseText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setJerryResponseText(null);

    try {
      const todayDate = new Date().toISOString().split('T')[0];

      const res = await fetch('/api/jerry-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentAccountType: activeAccount.type,
          currentProjectId: activeAccount.projectId,
          currentProjectName: activeAccount.name,
          activeDraft,
          todayDate,
        }),
      });

      if (!res.ok) throw new Error('Failed to process message');
      const data = await res.json();

      let draft: JerryAIDraft | undefined = data.draft;

      // Check project alias resolution (Babul -> BABUL REDDY SYTE)
      if (draft?.projectName) {
        const resolved = resolveProjectAlias(draft.projectName, projects);
        if (resolved) {
          draft.projectId = resolved.id;
          draft.projectName = resolved.name;
        }
      }

      // Check linked investment destination
      if (draft?.linkedDestinationProjectName) {
        const resolvedDest = resolveProjectAlias(draft.linkedDestinationProjectName, projects);
        if (resolvedDest) {
          draft.linkedDestinationProjectId = resolvedDest.id;
          draft.linkedDestinationProjectName = resolvedDest.name;
          draft.isLinkedInvestment = true;
        }
      }

      // Safeguard: Check if it was an amount-only entry (e.g. "25000")
      const isOnlyNumber = /^\s*₹?\s*\d+(\.\d+)?\s*$/.test(text);
      if (isOnlyNumber && draft) {
        draft.isReady = false;
        draft.amount = Number(text.replace(/[^0-9.]/g, ''));
        draft.missingFields = ['particulars', 'toFrom', 'paymentMode'];
      }

      setJerryResponseText(data.messageText);
      if (draft) {
        setActiveDraft(draft);
      }
    } catch (err: any) {
      console.warn('Backend chat API failed, using fallback heuristic:', err);
      fallbackHeuristic(text);
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  const fallbackHeuristic = (text: string) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const lower = text.toLowerCase();

    const amtMatch = text.match(/₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
    const amountVal = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;
    const isOnlyNumber = /^\s*₹?\s*\d+(\.\d+)?\s*$/.test(text);

    if (isOnlyNumber || !amountVal) {
      setJerryResponseText(
        amountVal
          ? `Noted ₹${amountVal}. What is this amount for? Please provide purpose and person/mode.`
          : 'Please specify the amount and purpose.'
      );
      return;
    }

    let targetProject = projects.find((p) =>
      lower.includes(p.name.toLowerCase()) || p.aliases?.some((a) => lower.includes(a.toLowerCase()))
    );
    if (lower.includes('babul')) {
      targetProject = projects.find((p) => p.name === 'BABUL REDDY SYTE');
    }

    let mode: PaymentMode = 'CASH';
    if (lower.includes('hdfc')) mode = 'HDFC';
    else if (lower.includes('sbi')) mode = 'SBI';
    else if (lower.includes('union')) mode = 'UNION';

    const isCR = lower.includes('cr') || lower.includes('received') || lower.includes('receipt') || lower.includes('plot sale');
    const isProject = targetProject || activeAccount.type === 'project';

    const draft: JerryAIDraft = {
      accountType: isProject ? 'project' : 'personal',
      projectId: targetProject?.id || activeAccount.projectId,
      projectName: targetProject?.name || activeAccount.name,
      date: todayDate,
      type: isCR ? 'CR' : 'DR',
      amount: amountVal,
      particulars: text.slice(0, 100),
      paymentModes: [{ mode, amount: amountVal }],
      who: isProject ? 'Partner' : undefined,
      isReady: true,
      missingFields: [],
    };

    setActiveDraft(draft);
    setJerryResponseText(`Prepared transaction preview for ₹${amountVal} (${draft.type}). Confirm below:`);
  };

  const handleConfirmSave = async () => {
    if (!activeDraft || isConfirming) return;
    setIsConfirming(true);

    try {
      if (activeDraft.isLinkedInvestment && activeDraft.linkedDestinationProjectId) {
        const mode = activeDraft.paymentModes[0]?.mode || 'HDFC';
        await addLinkedInvestment({
          amount: activeDraft.amount,
          sourcePaymentMode: mode,
          destinationProjectId: activeDraft.linkedDestinationProjectId,
          who: activeDraft.who || 'Owner',
          date: activeDraft.date,
          remarks: activeDraft.remarks || 'Personal investment transfer',
          classification: 'investment',
        });
        selectProjectAccount(activeDraft.linkedDestinationProjectId);
      } else {
        const primaryMode = activeDraft.paymentModes[0]?.mode;
        const splitsJson =
          activeDraft.paymentModes.length > 0
            ? JSON.stringify(activeDraft.paymentModes)
            : undefined;

        await addTransaction({
          accountType: activeDraft.accountType,
          projectId: activeDraft.projectId,
          syteName: activeDraft.accountType === 'personal' ? (activeDraft.projectName || 'PERSONAL') : undefined,
          date: activeDraft.date,
          type: activeDraft.type,
          amount: activeDraft.amount,
          particulars: activeDraft.particulars,
          toFrom: activeDraft.toFrom,
          who: activeDraft.who,
          paymentMode: primaryMode,
          paymentModesJson: splitsJson,
          remarks: activeDraft.remarks,
          classification: activeDraft.classification,
        });
      }

      setJerryResponseText(`✓ Saved successfully: ₹${activeDraft.amount} (${activeDraft.type})`);
      setActiveDraft(null);
      setIsEditingDraft(false);
    } catch (err: any) {
      console.error(err);
      setJerryResponseText(`Error saving: ${err.message || 'Check database connection'}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setActiveDraft(null);
    setIsEditingDraft(false);
    setJerryResponseText('Draft cancelled and discarded.');
  };

  return (
    <div className="space-y-2.5">
      {/* Bot Response Message / Instruction */}
      {jerryResponseText && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
          <Bot className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="flex-1">{jerryResponseText}</div>
          <button
            onClick={() => setJerryResponseText(null)}
            className="text-slate-500 hover:text-slate-300 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* COMPACT TRANSACTION PREVIEW CARD */}
      {activeDraft && (
        <div className="p-3.5 rounded-xl bg-slate-900 border-2 border-cyan-500/50 shadow-lg text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Confirm Transaction Preview</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                activeDraft.type === 'CR'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {activeDraft.type === 'CR' ? 'CR (Receipt/In)' : 'DR (Payment/Out)'}
            </span>
          </div>

          {!activeDraft.isReady && activeDraft.missingFields.length > 0 && (
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Missing required details: {activeDraft.missingFields.join(', ')}. Please specify or tap Edit.</span>
            </div>
          )}

          {/* Details Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">ACCOUNT / SYTE</span>
              <span className="font-semibold text-white">
                {activeDraft.accountType === 'personal' ? 'Personal A/c' : activeDraft.projectName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">DATE</span>
              <span className="font-semibold text-white">{activeDraft.date}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">AMOUNT</span>
              <span className="font-bold text-cyan-400 text-xs">{formatINR(activeDraft.amount)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">PAYMENT MODE</span>
              <span className="font-semibold text-white">
                {activeDraft.paymentModes.map((s) => `${s.mode}: ₹${s.amount}`).join(', ') || 'N/A'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[10px]">PURPOSE / TO-FROM</span>
              <span className="font-medium text-slate-200">
                {activeDraft.particulars} {activeDraft.toFrom || activeDraft.who ? `(${activeDraft.toFrom || activeDraft.who})` : ''}
              </span>
            </div>
            {activeDraft.remarks && (
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px]">REMARKS</span>
                <span className="text-slate-300 italic">{activeDraft.remarks}</span>
              </div>
            )}
          </div>

          {/* Confirm, Edit, Cancel Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleConfirmSave}
              disabled={isConfirming || (!activeDraft.isReady && activeDraft.missingFields.length > 0)}
              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isConfirming ? 'Saving...' : 'Confirm & Save'}</span>
            </button>
            <button
              onClick={() => setIsEditingDraft(!isEditingDraft)}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1 border border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleCancel}
              className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs flex items-center gap-1 border border-rose-500/30"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Simple Clean Chat Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type transaction in Telugu, English or Hindi (e.g. Ramesh ki 10000 cash ichanu)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-30 transition"
            title="Send transaction"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenManualModal}
          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 shrink-0 transition"
          title="Open manual entry form"
        >
          Form
        </button>
      </form>
    </div>
  );
};
