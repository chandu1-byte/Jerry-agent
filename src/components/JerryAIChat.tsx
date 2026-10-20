import React, { useState, useRef, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { JerryAIDraft, JerryChatMessage, PaymentMode, PaymentSplit } from '../types/accounting';
import { resolveProjectAlias, PAYMENT_MODES } from '../lib/constants';
import { formatINR } from '../lib/accountingEngine';
import {
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  Bot,
  User,
  ArrowRightLeft,
  AlertTriangle,
  HelpCircle,
  Building2,
  Wallet,
} from 'lucide-react';

export const JerryAIChat: React.FC = () => {
  const {
    activeAccount,
    projects,
    addTransaction,
    addLinkedInvestment,
    selectProjectAccount,
  } = useAccounting();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<JerryChatMessage[]>([
    {
      id: 'welcome',
      sender: 'jerry',
      text: 'Namaste! I am JERRY, your AI Accountant. You can enter transactions in Telugu, English, or Telugu in English letters (e.g. "Personal account lo 5000 cash expense" or "BABUL REDDY SYTE ki 25000 investment HDFC nunchi"). I will prepare a preview for your confirmation before saving!',
      timestamp: Date.now(),
    },
  ]);
  const [activeDraft, setActiveDraft] = useState<JerryAIDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [editingDraft, setEditingDraft] = useState<JerryAIDraft | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeDraft, isLoading]);

  const quickPrompts = [
    'Personal account lo 5000 house maintenance cash expense',
    'BABUL REDDY SYTE ki 25000 investment HDFC nunchi',
    'Ramesh ki 10000 cash ichanu, soil purchase kosam',
    'SBI nunchi 3000 payment chesanu',
    'NATRAJU project lo partner Ramesh CR 50000 add cheyyi',
  ];

  const handleSendMessage = async (userTextToSend?: string) => {
    const text = (userTextToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');

    // Append user message
    const userMsg: JerryChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const todayDate = new Date().toISOString().split('T')[0];

      // Call our secure server-side Express Gemini endpoint
      const response = await fetch('/api/jerry-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentAccountType: activeAccount.type,
          currentProjectId: activeAccount.projectId,
          currentProjectName: activeAccount.name,
          activeDraft: activeDraft,
          chatHistory: messages.map((m) => ({ sender: m.sender, text: m.text })),
          todayDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      let parsedDraft: JerryAIDraft | undefined = data.draft;

      // Normalize project name / alias resolution
      if (parsedDraft?.projectName) {
        const resolved = resolveProjectAlias(parsedDraft.projectName, projects);
        if (resolved) {
          parsedDraft.projectId = resolved.id;
          parsedDraft.projectName = resolved.name;
        }
      }

      // Check linked investment project
      if (parsedDraft?.linkedDestinationProjectName) {
        const resolvedDest = resolveProjectAlias(parsedDraft.linkedDestinationProjectName, projects);
        if (resolvedDest) {
          parsedDraft.linkedDestinationProjectId = resolvedDest.id;
          parsedDraft.linkedDestinationProjectName = resolvedDest.name;
          parsedDraft.isLinkedInvestment = true;
        }
      }

      // Safeguard: Check if it was an amount-only entry (e.g., "25000")
      const isOnlyNumber = /^\s*₹?\s*\d+(\.\d+)?\s*$/.test(text);
      if (isOnlyNumber) {
        if (parsedDraft) {
          parsedDraft.isReady = false;
          parsedDraft.amount = Number(text.replace(/[^0-9.]/g, ''));
          parsedDraft.missingFields = ['particulars', 'toFrom', 'paymentMode'];
        }
      }

      const jerryMsg: JerryChatMessage = {
        id: `msg_jerry_${Date.now()}`,
        sender: 'jerry',
        text:
          data.messageText ||
          (isOnlyNumber
            ? `I noted ₹${text}. What is this amount for? Please tell me the purpose, person, and payment mode.`
            : 'I processed your request.'),
        timestamp: Date.now(),
        draft: parsedDraft,
      };

      setMessages((prev) => [...prev, jerryMsg]);

      if (parsedDraft) {
        setActiveDraft(parsedDraft);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      // Fallback local heuristic parser in case of offline/network disruption
      handleOfflineHeuristicParser(text);
    } finally {
      setIsLoading(false);
    }
  };

  // Heuristic offline fallback parser to ensure 100% reliability even if network blips
  const handleOfflineHeuristicParser = (text: string) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const lower = text.toLowerCase();

    // Check if amount-only
    const amountMatch = text.match(/₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
    const amountVal = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    const isOnlyNumber = /^\s*₹?\s*\d+(\.\d+)?\s*$/.test(text);

    if (isOnlyNumber || !amountVal) {
      const resp: JerryChatMessage = {
        id: `msg_jerry_${Date.now()}`,
        sender: 'jerry',
        text: amountVal
          ? `I noted the amount of ₹${amountVal}. What is this amount for? Please provide the purpose, person (To/From), and payment mode (CASH, HDFC, SBI, UNION).`
          : 'Could you please mention the transaction amount and details?',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, resp]);
      return;
    }

    // Check project mentions (e.g. Babul, Natraju, etc.)
    let targetProject = projects.find((p) =>
      lower.includes(p.name.toLowerCase()) || p.aliases?.some((a) => lower.includes(a.toLowerCase()))
    );

    // Special check for "Babul"
    if (lower.includes('babul')) {
      targetProject = projects.find((p) => p.name === 'BABUL REDDY SYTE');
    }

    // Check payment modes
    let mode: PaymentMode = 'CASH';
    if (lower.includes('hdfc')) mode = 'HDFC';
    else if (lower.includes('sbi')) mode = 'SBI';
    else if (lower.includes('union')) mode = 'UNION';
    else if (lower.includes('cash')) mode = 'CASH';

    // Check linked investment
    const isInvestment =
      lower.includes('investment') ||
      (targetProject && (lower.includes('personal') || lower.includes('nunchi')));

    if (isInvestment && targetProject) {
      const draft: JerryAIDraft = {
        accountType: 'personal',
        date: todayDate,
        type: 'DR',
        amount: amountVal,
        particulars: `Investment in ${targetProject.name}`,
        paymentModes: [{ mode, amount: amountVal }],
        who: 'Owner / Partner',
        isLinkedInvestment: true,
        linkedDestinationProjectId: targetProject.id,
        linkedDestinationProjectName: targetProject.name,
        isReady: true,
        missingFields: [],
      };
      setActiveDraft(draft);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_jerry_${Date.now()}`,
          sender: 'jerry',
          text: `Got it! I prepared a linked investment transfer of ₹${amountVal} from Personal A/c (${mode}) into project "${targetProject.name}". Please confirm below to save:`,
          timestamp: Date.now(),
          draft,
        },
      ]);
      return;
    }

    // Standard entry
    const isCR = lower.includes('cr') || lower.includes('credit') || lower.includes('received') || lower.includes('receipt') || lower.includes('inflow');
    const type = isCR ? 'CR' : 'DR';

    const isProject = targetProject || activeAccount.type === 'project';
    const draft: JerryAIDraft = {
      accountType: isProject ? 'project' : 'personal',
      projectId: targetProject?.id || activeAccount.projectId,
      projectName: targetProject?.name || activeAccount.name,
      date: todayDate,
      type,
      amount: amountVal,
      particulars: text.slice(0, 100),
      paymentModes: [{ mode, amount: amountVal }],
      who: isProject ? 'Partner / Contractor' : undefined,
      isReady: true,
      missingFields: [],
    };

    setActiveDraft(draft);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_jerry_${Date.now()}`,
        sender: 'jerry',
        text: `Here is the transaction preview for ₹${amountVal} (${type}) on ${draft.accountType === 'personal' ? 'Personal A/c' : draft.projectName}. Please click Confirm & Save to record it.`,
        timestamp: Date.now(),
        draft,
      },
    ]);
  };

  // Confirm and Save transaction to database
  const handleConfirmAndSave = async (draftToSave: JerryAIDraft) => {
    if (isConfirming) return; // Prevent double submit
    setIsConfirming(true);

    try {
      if (draftToSave.isLinkedInvestment && draftToSave.linkedDestinationProjectId) {
        // Linked Personal-to-Project Investment
        const primaryMode = draftToSave.paymentModes[0]?.mode || 'HDFC';
        await addLinkedInvestment({
          amount: draftToSave.amount,
          sourcePaymentMode: primaryMode,
          destinationProjectId: draftToSave.linkedDestinationProjectId,
          who: draftToSave.who || 'Owner',
          date: draftToSave.date,
          remarks: draftToSave.remarks || 'Personal investment transfer',
          classification: 'investment',
        });

        // Switch to the project to view the credit
        selectProjectAccount(draftToSave.linkedDestinationProjectId);

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_saved_${Date.now()}`,
            sender: 'jerry',
            text: `Success! Saved both linked records: Outflow of ₹${draftToSave.amount} from Personal A/c (${primaryMode}) and Contribution into ${draftToSave.linkedDestinationProjectName}.`,
            timestamp: Date.now(),
            isSaved: true,
          },
        ]);
      } else {
        // Single Account transaction
        const primaryMode = draftToSave.paymentModes[0]?.mode;
        const splitsJson =
          draftToSave.paymentModes.length > 0
            ? JSON.stringify(draftToSave.paymentModes)
            : undefined;

        await addTransaction({
          accountType: draftToSave.accountType,
          projectId: draftToSave.projectId,
          date: draftToSave.date,
          type: draftToSave.type,
          amount: draftToSave.amount,
          particulars: draftToSave.particulars || 'Transaction',
          toFrom: draftToSave.toFrom,
          who: draftToSave.who,
          paymentMode: primaryMode,
          paymentModesJson: splitsJson,
          remarks: draftToSave.remarks,
          classification: draftToSave.classification,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_saved_${Date.now()}`,
            sender: 'jerry',
            text: `Confirmed and Saved! ₹${draftToSave.amount} (${draftToSave.type}) added to ${draftToSave.accountType === 'personal' ? 'Personal A/c' : draftToSave.projectName}.`,
            timestamp: Date.now(),
            isSaved: true,
          },
        ]);
      }

      setActiveDraft(null);
      setEditingDraft(null);
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'jerry',
          text: `Error saving to database: ${err.message || 'Please check your connection and try again.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelDraft = () => {
    setActiveDraft(null);
    setEditingDraft(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_cancelled_${Date.now()}`,
        sender: 'jerry',
        text: 'Draft transaction was cancelled and discarded.',
        timestamp: Date.now(),
        isCancelled: true,
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[520px] rounded-3xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-wide">JERRY AI Accountant</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            </div>
            <p className="text-[11px] text-cyan-400/80">
              Context: {activeAccount.type === 'personal' ? 'Personal A/c' : activeAccount.name}
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          Telugu • English • Hindi • Manglish
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 shadow-lg'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div
                  className={`text-[9px] mt-1 text-right ${
                    isUser ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs py-2 px-3 bg-slate-800/60 rounded-xl w-fit border border-slate-700 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>JERRY is analyzing accounting entry...</span>
          </div>
        )}

        {/* ACTIVE TRANSACTION PREVIEW CARD */}
        {activeDraft && (
          <div className="rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-cyan-950/40 border-2 border-cyan-400/60 p-4 shadow-2xl text-slate-100 my-2">
            <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {activeDraft.isLinkedInvestment ? 'Linked Investment Preview' : 'Transaction Preview'}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                  activeDraft.type === 'CR'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {activeDraft.type === 'CR' ? 'CR (Receipt/In)' : 'DR (Payment/Out)'}
              </span>
            </div>

            {/* Incomplete details warning */}
            {!activeDraft.isReady && activeDraft.missingFields.length > 0 && (
              <div className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Missing details: {activeDraft.missingFields.join(', ')}. Please answer Jerry's question above or tap Edit.
                </span>
              </div>
            )}

            {/* Preview Breakdown */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Account</span>
                <span className="font-semibold text-white">
                  {activeDraft.accountType === 'personal' ? 'Personal A/c' : activeDraft.projectName}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Date</span>
                <span className="font-semibold text-white">{activeDraft.date}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Amount</span>
                <span className="font-bold text-base text-cyan-400">
                  {formatINR(activeDraft.amount)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Payment Mode</span>
                <span className="font-semibold text-white">
                  {activeDraft.paymentModes.map((p) => `${p.mode}: ₹${p.amount}`).join(', ') || 'N/A (Project Ledger)'}
                </span>
              </div>

              {activeDraft.who && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Who / Partner</span>
                  <span className="font-semibold text-white">{activeDraft.who}</span>
                </div>
              )}

              {activeDraft.toFrom && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">To / From</span>
                  <span className="font-semibold text-white">{activeDraft.toFrom}</span>
                </div>
              )}

              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 block uppercase">Particulars / Purpose</span>
                <span className="font-semibold text-white">{activeDraft.particulars || 'Accounting entry'}</span>
              </div>

              {activeDraft.isLinkedInvestment && (
                <div className="col-span-2 mt-1 p-2 rounded-xl bg-blue-950/60 border border-blue-500/30 text-[11px] text-blue-200 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Linked Transfer: Outflow from Personal A/c → Inflow contribution into{' '}
                    <strong>{activeDraft.linkedDestinationProjectName}</strong>.
                  </span>
                </div>
              )}
            </div>

            {/* THREE ACTIONS: Confirm & Save, Edit, Cancel */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleConfirmAndSave(activeDraft)}
                disabled={isConfirming || (!activeDraft.isReady && activeDraft.missingFields.length > 0)}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isConfirming ? 'Saving to Cloud...' : 'Confirm & Save'}</span>
              </button>

              <button
                onClick={() => setEditingDraft(activeDraft)}
                disabled={isConfirming}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1 active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                onClick={handleCancelDraft}
                disabled={isConfirming}
                className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition flex items-center gap-1 active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK PROMPTS CHIPS */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Try:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-cyan-300 hover:text-white border border-slate-800 hover:border-cyan-500/40 transition truncate max-w-[240px]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type in Telugu, English or Manglish (e.g. Ramesh ki 10000 cash ichanu)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 disabled:opacity-40 transition active:scale-95"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* TWEAK / EDIT MODAL IF USER CLICKS EDIT */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              Edit Draft Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={editingDraft.amount}
                  onChange={(e) =>
                    setEditingDraft({
                      ...editingDraft,
                      amount: Number(e.target.value),
                      paymentModes: [{ mode: editingDraft.paymentModes[0]?.mode || 'CASH', amount: Number(e.target.value) }],
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDraft({ ...editingDraft, type: 'DR' })}
                    className={`flex-1 py-1.5 rounded-lg font-semibold ${
                      editingDraft.type === 'DR'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    DR (Payment / Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDraft({ ...editingDraft, type: 'CR' })}
                    className={`flex-1 py-1.5 rounded-lg font-semibold ${
                      editingDraft.type === 'CR'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    CR (Receipt / In)
                  </button>
                </div>
              </div>

              {editingDraft.accountType === 'personal' && (
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Payment Mode</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PAYMENT_MODES.map((mode) => {
                      const isSel = editingDraft.paymentModes[0]?.mode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setEditingDraft({
                              ...editingDraft,
                              paymentModes: [{ mode, amount: editingDraft.amount }],
                            })
                          }
                          className={`py-1 rounded-lg text-center font-bold ${
                            isSel
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Particulars / Purpose</label>
                <input
                  type="text"
                  value={editingDraft.particulars}
                  onChange={(e) => setEditingDraft({ ...editingDraft, particulars: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Person / Who</label>
                <input
                  type="text"
                  value={editingDraft.who || editingDraft.toFrom || ''}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, who: e.target.value, toFrom: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingDraft(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setActiveDraft({ ...editingDraft, isReady: true, missingFields: [] });
                  setEditingDraft(null);
                }}
                className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
