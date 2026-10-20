export type PaymentMode = 'CASH' | 'HDFC' | 'SBI' | 'UNION';

export interface PaymentSplit {
  mode: PaymentMode;
  amount: number;
}

export type TransactionType = 'DR' | 'CR';
export type AccountType = 'personal' | 'project';

export type TransactionClassification =
  | 'expense'
  | 'income'
  | 'investment'
  | 'advance'
  | 'loan'
  | 'drawings'
  | 'supplier'
  | 'contractor'
  | 'salary'
  | 'other';

export interface Transaction {
  id: string;
  accountType: AccountType;
  projectId?: string;
  syteName?: string; // e.g. "PERSONAL", "59 CENTS", "RK SYTE", etc.
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  particulars?: string;
  toFrom?: string;
  who?: string;
  paymentMode?: PaymentMode;
  paymentModesJson?: string; // JSON of PaymentSplit[]
  remarks?: string;
  linkedTxId?: string;
  classification?: string;
  isDemo?: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  aliases?: string[];
  description?: string;
  partnerIds?: string[];
  active: boolean;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  projectIds: string[];
  active: boolean;
  createdAt: string;
}

export interface PersonalAccountConfig {
  id: string;
  name: string;
  cashOpening: number;
  hdfcOpening: number;
  sbiOpening: number;
  unionOpening: number;
  isConfigured: boolean;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  transactionId: string;
  action: 'create' | 'update' | 'delete';
  userId: string;
  userEmail?: string;
  details: string;
  timestamp: string;
}

export interface JerryAIDraft {
  id?: string;
  accountType: AccountType;
  projectId?: string;
  projectName?: string;
  date: string;
  type: TransactionType;
  amount: number;
  particulars: string;
  toFrom?: string;
  who?: string;
  paymentModes: PaymentSplit[];
  remarks?: string;
  classification?: string;
  // Personal to project investment link
  isLinkedInvestment?: boolean;
  linkedDestinationProjectId?: string;
  linkedDestinationProjectName?: string;
  // Validation state
  isReady: boolean;
  missingFields: string[];
  followUpQuestion?: string;
  explanationTelugu?: string;
  explanationEnglish?: string;
}

export interface JerryChatMessage {
  id: string;
  sender: 'user' | 'jerry';
  text: string;
  timestamp: number;
  draft?: JerryAIDraft;
  isSaved?: boolean;
  isCancelled?: boolean;
}

export type UserRole = 'admin' | 'accountant' | 'partner';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  partnerId?: string;
}
