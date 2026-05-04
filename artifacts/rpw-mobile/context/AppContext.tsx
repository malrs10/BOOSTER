import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface Account {
  uid: string;
  name: string;
  avatar: string;
  cookie: string;
}

interface AppContextType {
  accounts: Account[];
  activeAccount: Account | null;
  addAccount: (account: Account) => Promise<void>;
  removeAccount: (uid: string) => Promise<void>;
  setActive: (uid: string) => void;
  isLoading: boolean;
}

const STORAGE_KEY = 'rpw_accounts';
const ACTIVE_KEY = 'rpw_active_uid';

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [accsJson, uid] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_KEY),
        ]);
        if (accsJson) {
          const accs = JSON.parse(accsJson) as Account[];
          setAccounts(accs);
          setActiveUid(uid || accs[0]?.uid || null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function addAccount(account: Account) {
    const next = [account, ...accounts.filter(a => a.uid !== account.uid)];
    setAccounts(next);
    setActiveUid(account.uid);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
      AsyncStorage.setItem(ACTIVE_KEY, account.uid),
    ]);
  }

  async function removeAccount(uid: string) {
    const next = accounts.filter(a => a.uid !== uid);
    setAccounts(next);
    if (activeUid === uid) {
      const newActive = next[0]?.uid ?? null;
      setActiveUid(newActive);
      if (newActive) await AsyncStorage.setItem(ACTIVE_KEY, newActive);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function setActive(uid: string) {
    setActiveUid(uid);
    AsyncStorage.setItem(ACTIVE_KEY, uid);
  }

  const activeAccount = accounts.find(a => a.uid === activeUid) ?? null;

  return (
    <AppContext.Provider value={{ accounts, activeAccount, addAccount, removeAccount, setActive, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be within AppProvider');
  return ctx;
}
