import { PaymentMode, PaymentSplit, PersonalAccountConfig, Transaction } from '../types/accounting';

export interface PersonalBalances {
  cash: number;
  hdfc: number;
  sbi: number;
  union: number;
  total: number;
  openingCash: number;
  openingHdfc: number;
  openingSbi: number;
  openingUnion: number;
  isOpeningConfigured: boolean;
}

export interface ProjectBalances {
  totalCr: number;
  totalDr: number;
  netLedgerBalance: number; // Total CR - Total DR
  transactionCount: number;
}

export interface PartnerSummary {
  partnerName: string;
  totalCr: number;
  totalDr: number;
  netBalance: number;
  transactionCount: number;
}

export function parsePaymentSplits(tx: Transaction): PaymentSplit[] {
  if (tx.paymentModesJson) {
    try {
      const parsed = JSON.parse(tx.paymentModesJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Fallback to single paymentMode
    }
  }
  if (tx.paymentMode) {
    return [{ mode: tx.paymentMode, amount: tx.amount }];
  }
  return [];
}

export function calculatePersonalBalances(
  transactions: Transaction[],
  config: PersonalAccountConfig | null
): PersonalBalances {
  const openingCash = config?.cashOpening ?? 0;
  const openingHdfc = config?.hdfcOpening ?? 0;
  const openingSbi = config?.sbiOpening ?? 0;
  const openingUnion = config?.unionOpening ?? 0;
  const isOpeningConfigured = config?.isConfigured ?? false;

  let cash = openingCash;
  let hdfc = openingHdfc;
  let sbi = openingSbi;
  let union = openingUnion;

  // Filter only Personal A/c transactions
  const personalTxs = transactions.filter(t => t.accountType === 'personal');

  for (const tx of personalTxs) {
    const splits = parsePaymentSplits(tx);
    const isCredit = tx.type === 'CR'; // Receipt increases balance
    const multiplier = isCredit ? 1 : -1; // Payment (DR) decreases balance

    for (const split of splits) {
      const mode = split.mode;
      const amt = split.amount * multiplier;

      if (mode === 'CASH') cash += amt;
      else if (mode === 'HDFC') hdfc += amt;
      else if (mode === 'SBI') sbi += amt;
      else if (mode === 'UNION') union += amt;
    }
  }

  return {
    cash,
    hdfc,
    sbi,
    union,
    total: cash + hdfc + sbi + union,
    openingCash,
    openingHdfc,
    openingSbi,
    openingUnion,
    isOpeningConfigured,
  };
}

export function calculateProjectBalances(
  transactions: Transaction[],
  projectId: string
): ProjectBalances {
  const projectTxs = transactions.filter(
    t => t.accountType === 'project' && t.projectId === projectId
  );

  let totalCr = 0;
  let totalDr = 0;

  for (const tx of projectTxs) {
    if (tx.type === 'CR') {
      totalCr += tx.amount;
    } else if (tx.type === 'DR') {
      totalDr += tx.amount;
    }
  }

  return {
    totalCr,
    totalDr,
    netLedgerBalance: totalCr - totalDr,
    transactionCount: projectTxs.length,
  };
}

export function calculatePartnerSummaries(
  transactions: Transaction[],
  projectId: string
): PartnerSummary[] {
  const projectTxs = transactions.filter(
    t => t.accountType === 'project' && t.projectId === projectId
  );

  const map = new Map<string, { totalCr: number; totalDr: number; count: number }>();

  for (const tx of projectTxs) {
    const who = (tx.who || tx.toFrom || 'Unassigned').trim();
    const current = map.get(who) || { totalCr: 0, totalDr: 0, count: 0 };
    if (tx.type === 'CR') {
      current.totalCr += tx.amount;
    } else {
      current.totalDr += tx.amount;
    }
    current.count += 1;
    map.set(who, current);
  }

  const result: PartnerSummary[] = [];
  map.forEach((data, partnerName) => {
    result.push({
      partnerName,
      totalCr: data.totalCr,
      totalDr: data.totalDr,
      netBalance: data.totalCr - data.totalDr,
      transactionCount: data.count,
    });
  });

  return result.sort((a, b) => b.totalCr - a.totalCr);
}

export function formatINR(val: number): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(absVal);
  return `${isNegative ? '-' : ''}₹${formatted}`;
}
