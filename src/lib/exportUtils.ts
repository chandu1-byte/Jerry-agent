import * as XLSX from 'xlsx';
import { Transaction, PersonalAccountConfig, Project } from '../types/accounting';
import { parsePaymentSplits } from './accountingEngine';

export function exportPersonalLedgerToExcel(
  transactions: Transaction[],
  openingBalances: PersonalAccountConfig | null,
  filenamePrefix = 'JERRY_Personal_Ac'
) {
  // Filter personal transactions
  const personalTxs = transactions.filter((t) => t.accountType === 'personal');

  // Build rows matching exact Excel account-book columns:
  // Sl.No | Date | TO/FROM | PURPOSE | Syte Name | CR/DR | CASH | HDFC | SBI | UNION | TOTAL | REMARKS
  const dataRows: any[] = [];

  // Opening Balance Row
  dataRows.push({
    'Sl.No': '-',
    Date: '-',
    'TO/FROM': 'OPENING BALANCE',
    PURPOSE: 'Verified Bank & Cash Opening',
    'Syte Name': 'PERSONAL',
    'CR/DR': 'CR',
    CASH: openingBalances?.cashOpening || 0,
    HDFC: openingBalances?.hdfcOpening || 0,
    SBI: openingBalances?.sbiOpening || 0,
    UNION: openingBalances?.unionOpening || 0,
    TOTAL:
      (openingBalances?.cashOpening || 0) +
      (openingBalances?.hdfcOpening || 0) +
      (openingBalances?.sbiOpening || 0) +
      (openingBalances?.unionOpening || 0),
    REMARKS: 'Initial verified opening balance',
  });

  let totalCash = openingBalances?.cashOpening || 0;
  let totalHdfc = openingBalances?.hdfcOpening || 0;
  let totalSbi = openingBalances?.sbiOpening || 0;
  let totalUnion = openingBalances?.unionOpening || 0;
  let grandTotal = totalCash + totalHdfc + totalSbi + totalUnion;

  personalTxs.forEach((tx, idx) => {
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

    const isCredit = tx.type === 'CR';
    const mult = isCredit ? 1 : -1;
    totalCash += cashAmt * mult;
    totalHdfc += hdfcAmt * mult;
    totalSbi += sbiAmt * mult;
    totalUnion += unionAmt * mult;
    grandTotal += tx.amount * mult;

    dataRows.push({
      'Sl.No': idx + 1,
      Date: tx.date,
      'TO/FROM': tx.toFrom || '—',
      PURPOSE: tx.particulars || '—',
      'Syte Name': tx.syteName || 'PERSONAL',
      'CR/DR': tx.type,
      CASH: cashAmt || '',
      HDFC: hdfcAmt || '',
      SBI: sbiAmt || '',
      UNION: unionAmt || '',
      TOTAL: tx.amount,
      REMARKS: tx.remarks || '',
    });
  });

  // Summary Row
  dataRows.push({
    'Sl.No': '',
    Date: '',
    'TO/FROM': 'RUNNING BALANCE',
    PURPOSE: 'Current Closing Balances',
    'Syte Name': '',
    'CR/DR': '',
    CASH: totalCash,
    HDFC: totalHdfc,
    SBI: totalSbi,
    UNION: totalUnion,
    TOTAL: grandTotal,
    REMARKS: 'Verified Net Total',
  });

  const worksheet = XLSX.utils.json_to_sheet(dataRows);

  // Column widths
  worksheet['!cols'] = [
    { wch: 6 },  // Sl.No
    { wch: 12 }, // Date
    { wch: 22 }, // TO/FROM
    { wch: 26 }, // PURPOSE
    { wch: 16 }, // Syte Name
    { wch: 8 },  // CR/DR
    { wch: 12 }, // CASH
    { wch: 12 }, // HDFC
    { wch: 12 }, // SBI
    { wch: 12 }, // UNION
    { wch: 14 }, // TOTAL
    { wch: 32 }, // REMARKS
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Personal Ledger');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
}

export function exportProjectLedgerToExcel(
  transactions: Transaction[],
  project: Project,
  filenamePrefix = 'JERRY_Project'
) {
  const projectTxs = transactions.filter(
    (t) => t.accountType === 'project' && t.projectId === project.id
  );

  let totalCr = 0;
  let totalDr = 0;

  const dataRows: any[] = projectTxs.map((tx, idx) => {
    if (tx.type === 'CR') totalCr += tx.amount;
    else if (tx.type === 'DR') totalDr += tx.amount;

    return {
      'Sl.No': idx + 1,
      Date: tx.date,
      'Particulars/Purpose': tx.particulars || '—',
      'CR Amount': tx.type === 'CR' ? tx.amount : '',
      'DR Amount': tx.type === 'DR' ? tx.amount : '',
      Who: tx.who || tx.toFrom || '—',
      Remarks: tx.remarks || '',
    };
  });

  // Summary Row
  dataRows.push({
    'Sl.No': '',
    Date: '',
    'Particulars/Purpose': 'TOTALS & NET LEDGER BALANCE',
    'CR Amount': totalCr,
    'DR Amount': totalDr,
    Who: `Net: ₹${totalCr - totalDr}`,
    Remarks: `Total CR: ₹${totalCr} | Total DR: ₹${totalDr} | Net Ledger Balance: ₹${totalCr - totalDr}`,
  });

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 32 },
  ];

  const workbook = XLSX.utils.book_new();
  const safeSheetName = project.name.slice(0, 31).replace(/[\\/?*[\]]/g, '_');
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const todayStr = new Date().toISOString().split('T')[0];
  const safeProjName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `${filenamePrefix}_${safeProjName}_${todayStr}.xlsx`);
}
