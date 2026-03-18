'use client';
import React, { createContext, useContext, ReactNode } from 'react';
import { Group, Expense } from '../lib/types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AppContextType {
  groups: Group[];
  setGroups: (v: Group[] | ((prev: Group[]) => Group[])) => void;
  expenses: Expense[];
  setExpenses: (v: Expense[] | ((prev: Expense[]) => Expense[])) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useLocalStorage<Group[]>('splitwise_groups', []);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('splitwise_expenses', []);

  return (
    <AppContext.Provider value={{ groups, setGroups, expenses, setExpenses }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
