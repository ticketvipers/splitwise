'use client';
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Group, Expense, Settlement } from '../lib/types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AppContextType {
  groups: Group[];
  setGroups: (v: Group[] | ((prev: Group[]) => Group[])) => void;
  expenses: Expense[];
  setExpenses: (v: Expense[] | ((prev: Expense[]) => Expense[])) => void;
  settlements: Settlement[];
  setSettlements: (v: Settlement[] | ((prev: Settlement[]) => Settlement[])) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [groups, setGroups] = useLocalStorage<Group[]>('splitwise_groups', []);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('splitwise_expenses', []);
  const [settlements, setSettlements] = useLocalStorage<Settlement[]>('splitwise_settlements', []);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('splitwise_token');
    setTokenState(stored);
  }, []);

  useEffect(() => {
    if (token === null && typeof window !== 'undefined') {
      const stored = localStorage.getItem('splitwise_token');
      if (!stored) {
        const path = window.location.pathname;
        if (path === '/' || path.startsWith('/groups')) {
          router.push('/login');
        }
      }
    }
  }, [token, router]);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('splitwise_token', newToken);
    } else {
      localStorage.removeItem('splitwise_token');
    }
    setTokenState(newToken);
  };

  const isAuthenticated = !!token;

  return (
    <AppContext.Provider value={{ groups, setGroups, expenses, setExpenses, settlements, setSettlements, token, setToken, isAuthenticated }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
