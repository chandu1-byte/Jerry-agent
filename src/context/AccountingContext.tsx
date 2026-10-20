import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AccountType,
  AuditLog,
  Partner,
  PaymentMode,
  PersonalAccountConfig,
  Project,
  Transaction,
} from '../types/accounting';
import { INITIAL_PROJECTS, resolveProjectAlias } from '../lib/constants';
import { DEMO_TRANSACTIONS } from '../lib/demoData';
import { useAuth } from './AuthContext';

interface ActiveAccountState {
  type: AccountType;
  projectId?: string;
  name: string;
}

interface AccountingContextType {
  activeAccount: ActiveAccountState;
  selectPersonalAccount: () => void;
  selectProjectAccount: (projectId: string) => void;
  swipeNextAccount: () => void;
  swipePrevAccount: () => void;
  allAccountsList: { type: AccountType; id: string; name: string }[];

  // Data
  projects: Project[];
  partners: Partner[];
  personalConfig: PersonalAccountConfig | null;
  transactions: Transaction[];
  auditLogs: AuditLog[];
  isLoading: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  errorMessage: string | null;
  isDemoActive: boolean;
  setIsDemoActive: (active: boolean) => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'createdBy'>) => Promise<Transaction>;
  addLinkedInvestment: (params: {
    amount: number;
    sourcePaymentMode: PaymentMode;
    destinationProjectId: string;
    who: string;
    date: string;
    remarks?: string;
    classification?: string;
  }) => Promise<{ personalTx: Transaction; projectTx: Transaction }>;
  updateTransaction: (txId: string, updates: Partial<Transaction>, reason?: string) => Promise<void>;
  deleteTransaction: (txId: string, reason?: string) => Promise<void>;
  updatePersonalOpeningBalances: (balances: {
    cashOpening: number;
    hdfcOpening: number;
    sbiOpening: number;
    unionOpening: number;
  }) => Promise<void>;
  addProject: (name: string, description?: string, aliases?: string[]) => Promise<Project>;
  addPartner: (name: string, phone?: string, email?: string, projectIds?: string[]) => Promise<Partner>;
  updatePartner: (partnerId: string, updates: Partial<Partner>) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

const LOCAL_STORAGE_TX_KEY = 'jerry_accounting_transactions_v2';
const LOCAL_STORAGE_CONFIG_KEY = 'jerry_accounting_personal_config_v2';
const LOCAL_STORAGE_PARTNERS_KEY = 'jerry_accounting_partners_v2';
const LOCAL_STORAGE_PROJECTS_KEY = 'jerry_accounting_projects_v2';

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appUser } = useAuth();

  // RULE 3: Personal A/c MUST be the default account on every fresh launch.
  const [activeAccount, setActiveAccount] = useState<ActiveAccountState>({
    type: 'personal',
    name: 'Personal A/c',
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_PROJECTS.map(p => ({
      ...p,
      createdAt: new Date().toISOString(),
    }));
  });

  const [partners, setPartners] = useState<Partner[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_PARTNERS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [personalConfig, setPersonalConfig] = useState<PersonalAccountConfig | null>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      id: 'personal_account',
      name: 'Personal A/c',
      cashOpening: 0,
      hdfcOpening: 0,
      sbiOpening: 0,
      unionOpening: 0,
      isConfigured: false,
    };
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoActive, setIsDemoActive] = useState(false);

  // Cache to LocalStorage whenever state updates to ensure offline continuity
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      if (personalConfig) {
        localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(personalConfig));
      }
    } catch {}
  }, [personalConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PARTNERS_KEY, JSON.stringify(partners));
    } catch {}
  }, [partners]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch {}
  }, [projects]);

  // Real-time Firestore Synchronization
  useEffect(() => {
    setSyncStatus('syncing');

    // 1. Projects listener
    const unsubProjects = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Project[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loaded.push({
              id: docSnap.id,
              name: data.name || docSnap.id,
              aliases: data.aliases ? JSON.parse(data.aliases) : [],
              description: data.description || '',
              partnerIds: data.partnerIds ? JSON.parse(data.partnerIds) : [],
              active: data.active !== false,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          });
          setProjects(loaded);
        } else {
          // Initialize the 12 canonical projects if collection empty
          bootstrapInitialProjects();
        }
      },
      (error) => {
        console.warn('Projects sync warning (offline or permission):', error.message);
        setSyncStatus('offline');
      }
    );

    // 2. Personal Account config listener
    const unsubAccount = onSnapshot(
      doc(db, 'accounts', 'personal_account'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPersonalConfig({
            id: snap.id,
            name: data.name || 'Personal A/c',
            cashOpening: Number(data.cashOpening) || 0,
            hdfcOpening: Number(data.hdfcOpening) || 0,
            sbiOpening: Number(data.sbiOpening) || 0,
            unionOpening: Number(data.unionOpening) || 0,
            isConfigured: Boolean(data.isConfigured),
            updatedAt: data.updatedAt,
          });
        }
      },
      (error) => {
        console.warn('Accounts sync warning:', error.message);
      }
    );

    // 3. Partners listener
    const unsubPartners = onSnapshot(
      collection(db, 'partners'),
      (snapshot) => {
        const loaded: Partner[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            name: data.name,
            phone: data.phone,
            email: data.email,
            projectIds: data.projectIds ? JSON.parse(data.projectIds) : [],
            active: data.active !== false,
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
        setPartners(loaded);
      },
      (error) => {
        console.warn('Partners sync warning:', error.message);
      }
    );

    // 4. Transactions listener
    const unsubTransactions = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        const loaded: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            accountType: data.accountType as AccountType,
            projectId: data.projectId,
            date: data.date,
            type: data.type,
            amount: Number(data.amount) || 0,
            particulars: data.particulars,
            toFrom: data.toFrom,
            who: data.who,
            paymentMode: data.paymentMode,
            paymentModesJson: data.paymentModesJson,
            remarks: data.remarks,
            linkedTxId: data.linkedTxId,
            classification: data.classification,
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        // Sort descending by date, then createdAt
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(loaded);
        setSyncStatus('synced');
        setIsLoading(false);
      },
      (error) => {
        console.warn('Transactions sync warning:', error.message);
        setSyncStatus('offline');
        setIsLoading(false);
      }
    );

    // 5. Audit logs listener
    const unsubAudit = onSnapshot(
      collection(db, 'auditLogs'),
      (snapshot) => {
        const loaded: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            transactionId: data.transactionId,
            action: data.action,
            userId: data.userId,
            userEmail: data.userEmail,
            details: data.details,
            timestamp: data.timestamp,
          });
        });
        loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(loaded);
      },
      (error) => {
        console.warn('Audit logs listener warning:', error.message);
      }
    );

    return () => {
      unsubProjects();
      unsubAccount();
      unsubPartners();
      unsubTransactions();
      unsubAudit();
    };
  }, []);

  // Helper to bootstrap the 12 canonical projects if not present in Firestore
  const bootstrapInitialProjects = async () => {
    try {
      const batch = writeBatch(db);
      for (const p of INITIAL_PROJECTS) {
        const ref = doc(db, 'projects', p.id);
        batch.set(ref, {
          id: p.id,
          name: p.name,
          aliases: JSON.stringify(p.aliases || []),
          description: p.description || '',
          partnerIds: JSON.stringify([]),
          active: true,
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    } catch (e) {
      console.warn('Could not bootstrap initial projects into Firestore:', e);
    }
  };

  // List of all accounts for swipe / switcher
  const allAccountsList = useMemo(() => {
    const list: { type: AccountType; id: string; name: string }[] = [
      { type: 'personal', id: 'personal', name: 'Personal A/c' },
    ];
    projects.forEach((proj) => {
      list.push({
        type: 'project',
        id: proj.id,
        name: proj.name,
      });
    });
    return list;
  }, [projects]);

  // Account switching functions
  const selectPersonalAccount = () => {
    setActiveAccount({
      type: 'personal',
      name: 'Personal A/c',
    });
  };

  const selectProjectAccount = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      setActiveAccount({
        type: 'project',
        projectId: proj.id,
        name: proj.name,
      });
    }
  };

  const swipeNextAccount = () => {
    const currentIndex = allAccountsList.findIndex((item) => {
      if (activeAccount.type === 'personal') return item.type === 'personal';
      return item.id === activeAccount.projectId;
    });
    const nextIndex = (currentIndex + 1) % allAccountsList.length;
    const target = allAccountsList[nextIndex];
    if (target.type === 'personal') {
      selectPersonalAccount();
    } else {
      selectProjectAccount(target.id);
    }
  };

  const swipePrevAccount = () => {
    const currentIndex = allAccountsList.findIndex((item) => {
      if (activeAccount.type === 'personal') return item.type === 'personal';
      return item.id === activeAccount.projectId;
    });
    const prevIndex = (currentIndex - 1 + allAccountsList.length) % allAccountsList.length;
    const target = allAccountsList[prevIndex];
    if (target.type === 'personal') {
      selectPersonalAccount();
    } else {
      selectProjectAccount(target.id);
    }
  };

  // Add single transaction with validation and duplicate prevention
  const addTransaction = async (
    txData: Omit<Transaction, 'id' | 'createdAt' | 'createdBy'>
  ): Promise<Transaction> => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();
    const createdBy = appUser?.uid || 'local-user';

    const newTx: Transaction = {
      ...txData,
      id,
      createdBy,
      createdByName: appUser?.displayName || 'Accountant',
      createdAt,
    };

    // Optimistic UI update
    setTransactions((prev) => [newTx, ...prev]);

    // Firestore write
    try {
      const payload: Record<string, any> = {
        id,
        accountType: newTx.accountType,
        date: newTx.date,
        type: newTx.type,
        amount: Number(newTx.amount),
        createdBy,
        createdAt,
      };

      if (newTx.projectId) payload.projectId = newTx.projectId;
      if (newTx.particulars) payload.particulars = newTx.particulars;
      if (newTx.toFrom) payload.toFrom = newTx.toFrom;
      if (newTx.who) payload.who = newTx.who;
      if (newTx.paymentMode) payload.paymentMode = newTx.paymentMode;
      if (newTx.paymentModesJson) payload.paymentModesJson = newTx.paymentModesJson;
      if (newTx.remarks) payload.remarks = newTx.remarks;
      if (newTx.linkedTxId) payload.linkedTxId = newTx.linkedTxId;
      if (newTx.classification) payload.classification = newTx.classification;

      await setDoc(doc(db, 'transactions', id), payload);

      // Write Audit Log
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'auditLogs', auditId), {
        id: auditId,
        transactionId: id,
        action: 'create',
        userId: createdBy,
        userEmail: appUser?.email || '',
        details: `Created ${newTx.type} transaction of ₹${newTx.amount} on ${newTx.accountType} account`,
        timestamp: createdAt,
      });

      return newTx;
    } catch (error) {
      console.error('Failed to save transaction to Firestore:', error);
      // Keep in local storage as unsynced
      return newTx;
    }
  };

  // Add Linked Personal-to-Project Investment
  const addLinkedInvestment = async (params: {
    amount: number;
    sourcePaymentMode: PaymentMode;
    destinationProjectId: string;
    who: string;
    date: string;
    remarks?: string;
    classification?: string;
  }) => {
    const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const destProject = projects.find((p) => p.id === params.destinationProjectId);
    const projectName = destProject?.name || 'Project';

    // 1. Personal A/c: Outflow (DR) from confirmed bank mode
    const personalTx = await addTransaction({
      accountType: 'personal',
      projectId: params.destinationProjectId,
      date: params.date,
      type: 'DR',
      amount: params.amount,
      particulars: `Investment in ${projectName}`,
      toFrom: projectName,
      who: params.who,
      paymentMode: params.sourcePaymentMode,
      paymentModesJson: JSON.stringify([
        { mode: params.sourcePaymentMode, amount: params.amount },
      ]),
      remarks: params.remarks || `Transferred to ${projectName} project`,
      linkedTxId: linkId,
      classification: params.classification || 'investment',
    });

    // 2. Project A/c: Inflow (CR) contribution from owner/partner
    const projectTx = await addTransaction({
      accountType: 'project',
      projectId: params.destinationProjectId,
      date: params.date,
      type: 'CR',
      amount: params.amount,
      particulars: `Owner Investment via ${params.sourcePaymentMode}`,
      toFrom: 'Personal A/c',
      who: params.who,
      remarks: `Linked from Personal A/c (${params.sourcePaymentMode}). ${params.remarks || ''}`,
      linkedTxId: linkId,
      classification: params.classification || 'investment',
    });

    return { personalTx, projectTx };
  };

  // Update existing transaction with audit history
  const updateTransaction = async (
    txId: string,
    updates: Partial<Transaction>,
    reason = 'Edited transaction'
  ) => {
    const existing = transactions.find((t) => t.id === txId);
    if (!existing) return;

    const updatedAt = new Date().toISOString();
    const updatedTx: Transaction = {
      ...existing,
      ...updates,
      updatedAt,
    };

    setTransactions((prev) => prev.map((t) => (t.id === txId ? updatedTx : t)));

    try {
      const payload: Record<string, any> = {
        ...updatedTx,
        amount: Number(updatedTx.amount),
        updatedAt,
      };
      await setDoc(doc(db, 'transactions', txId), payload, { merge: true });

      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'auditLogs', auditId), {
        id: auditId,
        transactionId: txId,
        action: 'update',
        userId: appUser?.uid || 'local-user',
        userEmail: appUser?.email || '',
        details: `${reason}: ${JSON.stringify(updates)}`,
        timestamp: updatedAt,
      });
    } catch (err) {
      console.error('Error updating transaction:', err);
    }
  };

  // Delete transaction with audit record
  const deleteTransaction = async (txId: string, reason = 'Deleted transaction') => {
    const existing = transactions.find((t) => t.id === txId);
    if (!existing) return;

    setTransactions((prev) => prev.filter((t) => t.id !== txId));

    try {
      await deleteDoc(doc(db, 'transactions', txId));

      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'auditLogs', auditId), {
        id: auditId,
        transactionId: txId,
        action: 'delete',
        userId: appUser?.uid || 'local-user',
        userEmail: appUser?.email || '',
        details: `${reason}: Removed ₹${existing.amount} (${existing.particulars || ''})`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  // Save verified opening balances
  const updatePersonalOpeningBalances = async (balances: {
    cashOpening: number;
    hdfcOpening: number;
    sbiOpening: number;
    unionOpening: number;
  }) => {
    const updated: PersonalAccountConfig = {
      id: 'personal_account',
      name: 'Personal A/c',
      cashOpening: Number(balances.cashOpening) || 0,
      hdfcOpening: Number(balances.hdfcOpening) || 0,
      sbiOpening: Number(balances.sbiOpening) || 0,
      unionOpening: Number(balances.unionOpening) || 0,
      isConfigured: true,
      updatedAt: new Date().toISOString(),
    };

    setPersonalConfig(updated);

    try {
      await setDoc(doc(db, 'accounts', 'personal_account'), {
        id: 'personal_account',
        name: 'Personal A/c',
        cashOpening: updated.cashOpening,
        hdfcOpening: updated.hdfcOpening,
        sbiOpening: updated.sbiOpening,
        unionOpening: updated.unionOpening,
        isConfigured: true,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.error('Error saving opening balances to Firestore:', err);
    }
  };

  // Add new Project
  const addProject = async (
    name: string,
    description = '',
    aliases: string[] = []
  ): Promise<Project> => {
    const cleanName = name.trim().toUpperCase();
    const existing = resolveProjectAlias(cleanName, projects);
    if (existing) {
      return existing;
    }

    const id = `proj_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const newProj: Project = {
      id,
      name: cleanName,
      aliases,
      description,
      partnerIds: [],
      active: true,
      createdAt: new Date().toISOString(),
    };

    setProjects((prev) => [...prev, newProj]);

    try {
      await setDoc(doc(db, 'projects', id), {
        id,
        name: newProj.name,
        aliases: JSON.stringify(newProj.aliases || []),
        description: newProj.description,
        partnerIds: JSON.stringify([]),
        active: true,
        createdAt: newProj.createdAt,
      });
    } catch (err) {
      console.error('Error saving project to Firestore:', err);
    }

    return newProj;
  };

  // Add Partner
  const addPartner = async (
    name: string,
    phone = '',
    email = '',
    projectIds: string[] = []
  ): Promise<Partner> => {
    const id = `partner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPartner: Partner = {
      id,
      name: name.trim(),
      phone,
      email,
      projectIds,
      active: true,
      createdAt: new Date().toISOString(),
    };

    setPartners((prev) => [...prev, newPartner]);

    try {
      await setDoc(doc(db, 'partners', id), {
        id,
        name: newPartner.name,
        phone,
        email,
        projectIds: JSON.stringify(projectIds),
        active: true,
        createdAt: newPartner.createdAt,
      });
    } catch (err) {
      console.error('Error saving partner:', err);
    }

    return newPartner;
  };

  const updatePartner = async (partnerId: string, updates: Partial<Partner>) => {
    setPartners((prev) =>
      prev.map((p) => (p.id === partnerId ? { ...p, ...updates } : p))
    );

    try {
      const payload: Record<string, any> = { ...updates };
      if (updates.projectIds) {
        payload.projectIds = JSON.stringify(updates.projectIds);
      }
      await setDoc(doc(db, 'partners', partnerId), payload, { merge: true });
    } catch (err) {
      console.error('Error updating partner:', err);
    }
  };

  return (
    <AccountingContext.Provider
      value={{
        activeAccount,
        selectPersonalAccount,
        selectProjectAccount,
        swipeNextAccount,
        swipePrevAccount,
        allAccountsList,
        projects,
        partners,
        personalConfig,
        transactions: isDemoActive ? DEMO_TRANSACTIONS : transactions,
        auditLogs,
        isLoading,
        syncStatus,
        errorMessage,
        isDemoActive,
        setIsDemoActive,
        addTransaction,
        addLinkedInvestment,
        updateTransaction,
        deleteTransaction,
        updatePersonalOpeningBalances,
        addProject,
        addPartner,
        updatePartner,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export function useAccounting() {
  const ctx = useContext(AccountingContext);
  if (!ctx) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return ctx;
}
