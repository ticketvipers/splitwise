'use client';
import React, { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Expense, Group, Member, Settlement } from '../lib/types';
import { apiFetch, PaginatedResponse } from '../lib/api';

// API response shapes (subset)
type GroupOut = { id: string; name: string; description?: string | null; created_at?: string; updated_at?: string };
type MemberOut = { user_id: string; display_name: string; email?: string; role?: string; joined_at?: string };
type SplitOut = { id: string; user_id: string; amount: string | number; is_settled?: boolean };
type ExpenseOut = {
  id: string;
  group_id: string;
  payer_id: string;
  description: string;
  amount: string | number;
  currency: string;
  notes?: string | null;
  date?: string | null;
  split_type: 'equal' | 'exact';
  created_at: string;
  splits: SplitOut[];
};

type SettlementOut = {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: string | number;
  currency: string;
  note?: string | null;
  created_at: string;
};

type GroupBalances = {
  group_id: string;
  balances: { from_user_id: string; to_user_id: string; amount: string | number }[];
  net: Record<string, string | number>;
};

function toNumber(v: string | number) {
  return typeof v === 'number' ? v : parseFloat(v);
}

function mapGroup(g: GroupOut, members: Member[]): Group {
  return {
    id: g.id,
    name: g.name,
    members,
    createdAt: g.created_at || new Date().toISOString(),
  };
}

function mapMembers(items: MemberOut[]): Member[] {
  return items.map(m => ({ id: String(m.user_id), name: m.display_name }));
}

function mapExpense(e: ExpenseOut): Expense {
  return {
    id: e.id,
    groupId: e.group_id,
    description: e.description,
    amount: toNumber(e.amount),
    paidBy: e.payer_id,
    splits: (e.splits || []).map(s => ({ memberId: String(s.user_id), amount: toNumber(s.amount) })),
    notes: e.notes || undefined,
    date: e.date || undefined,
    splitType: e.split_type,
    createdAt: e.created_at,
    settled: false,
  };
}

function mapSettlement(s: SettlementOut): Settlement {
  return {
    id: s.id,
    groupId: s.group_id,
    payerId: s.payer_id,
    payeeId: s.payee_id,
    amount: toNumber(s.amount),
    note: s.note || undefined,
    createdAt: s.created_at,
  };
}

interface AppContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;

  groups: Group[];
  refreshGroups: () => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<Group>;

  membersByGroup: Record<string, Member[]>;
  ensureMembers: (groupId: string) => Promise<Member[]>;
  removeMember: (groupId: string, userId: string) => Promise<void>;

  expensesByGroup: Record<string, Expense[]>;
  ensureExpenses: (groupId: string) => Promise<Expense[]>;
  createExpense: (groupId: string, body: any) => Promise<Expense>;

  settlementsByGroup: Record<string, Settlement[]>;
  ensureSettlements: (groupId: string) => Promise<Settlement[]>;
  recordSettlement: (groupId: string, body: any) => Promise<Settlement>;

  fetchBalances: (groupId: string) => Promise<GroupBalances>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [membersByGroup, setMembersByGroup] = useState<Record<string, Member[]>>({});
  const [expensesByGroup, setExpensesByGroup] = useState<Record<string, Expense[]>>({});
  const [settlementsByGroup, setSettlementsByGroup] = useState<Record<string, Settlement[]>>({});

  // Load token on boot
  useEffect(() => {
    const stored = localStorage.getItem('splitwise_token');
    setTokenState(stored);
  }, []);

  // Redirect to login if unauthenticated on protected pages
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

    // Reset cached data on auth change
    setGroups([]);
    setMembersByGroup({});
    setExpensesByGroup({});
    setSettlementsByGroup({});
  };

  const isAuthenticated = !!token;

  const refreshGroups = async () => {
    if (!token) return;
    const resp = await apiFetch<PaginatedResponse<GroupOut>>('/api/v1/groups?page=1&page_size=50', { token });

    // For minimal UX parity, also load members per group (small N+1).
    const nextMembersByGroup: Record<string, Member[]> = { ...membersByGroup };
    const mapped: Group[] = [];
    for (const g of resp.items) {
      if (!nextMembersByGroup[g.id]) {
        try {
          const members = await apiFetch<MemberOut[]>(`/api/v1/groups/${g.id}/members`, { token });
          nextMembersByGroup[g.id] = mapMembers(members);
        } catch {
          nextMembersByGroup[g.id] = [];
        }
      }
      mapped.push(mapGroup(g, nextMembersByGroup[g.id] || []));
    }
    setMembersByGroup(nextMembersByGroup);
    setGroups(mapped);
  };

  // Auto-load groups after login
  useEffect(() => {
    if (!token) return;
    refreshGroups().catch(() => {
      // If token is invalid/expired, force logout.
      setToken(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const ensureMembers = async (groupId: string) => {
    if (!token) return [];
    if (membersByGroup[groupId]) return membersByGroup[groupId];
    const members = await apiFetch<MemberOut[]>(`/api/v1/groups/${groupId}/members`, { token });
    const mapped = mapMembers(members);
    setMembersByGroup(prev => ({ ...prev, [groupId]: mapped }));

    // keep groups[] in sync if already loaded
    setGroups(prev => prev.map(g => (g.id === groupId ? { ...g, members: mapped } : g)));

    return mapped;
  };

  const removeMember = async (groupId: string, userId: string) => {
    if (!token) return;
    await apiFetch(`/api/v1/groups/${groupId}/members/${userId}`, { method: 'DELETE', token });
    setMembersByGroup(prev => {
      const next = { ...prev };
      next[groupId] = (next[groupId] || []).filter(m => m.id !== userId);
      return next;
    });
    setGroups(prev => prev.map(g => (g.id === groupId ? { ...g, members: g.members.filter(m => m.id !== userId) } : g)));
  };

  const ensureExpenses = async (groupId: string) => {
    if (!token) return [];
    if (expensesByGroup[groupId]) return expensesByGroup[groupId];
    const resp = await apiFetch<PaginatedResponse<ExpenseOut>>(
      `/api/v1/groups/${groupId}/expenses?page=1&page_size=100`,
      { token }
    );
    const mapped = resp.items.map(mapExpense);
    setExpensesByGroup(prev => ({ ...prev, [groupId]: mapped }));
    return mapped;
  };

  const createExpense = async (groupId: string, body: any) => {
    if (!token) throw new Error('Not authenticated');
    const created = await apiFetch<ExpenseOut>(`/api/v1/groups/${groupId}/expenses`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });
    const mapped = mapExpense(created);
    setExpensesByGroup(prev => ({ ...prev, [groupId]: [mapped, ...(prev[groupId] || [])] }));
    return mapped;
  };

  const ensureSettlements = async (groupId: string) => {
    if (!token) return [];
    if (settlementsByGroup[groupId]) return settlementsByGroup[groupId];
    const resp = await apiFetch<PaginatedResponse<SettlementOut>>(
      `/api/v1/groups/${groupId}/settlements?page=1&page_size=100`,
      { token }
    );
    const mapped = resp.items.map(mapSettlement);
    setSettlementsByGroup(prev => ({ ...prev, [groupId]: mapped }));
    return mapped;
  };

  const recordSettlement = async (groupId: string, body: any) => {
    if (!token) throw new Error('Not authenticated');
    const created = await apiFetch<SettlementOut>(`/api/v1/groups/${groupId}/settlements`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });
    const mapped = mapSettlement(created);
    setSettlementsByGroup(prev => ({ ...prev, [groupId]: [mapped, ...(prev[groupId] || [])] }));
    return mapped;
  };

  const fetchBalances = async (groupId: string) => {
    if (!token) throw new Error('Not authenticated');
    return await apiFetch<GroupBalances>(`/api/v1/groups/${groupId}/balances`, { token });
  };

  const createGroup = async (name: string, description?: string) => {
    if (!token) throw new Error('Not authenticated');
    const created = await apiFetch<GroupOut>('/api/v1/groups', {
      method: 'POST',
      token,
      body: JSON.stringify({ name, description: description || null }),
    });
    const members = await ensureMembers(created.id); // creator will be present
    const mapped = mapGroup(created, members);
    setGroups(prev => [mapped, ...prev]);
    return mapped;
  };

  const value = useMemo<AppContextType>(
    () => ({
      token,
      setToken,
      isAuthenticated,
      groups,
      refreshGroups,
      createGroup,
      membersByGroup,
      ensureMembers,
      removeMember,
      expensesByGroup,
      ensureExpenses,
      createExpense,
      settlementsByGroup,
      ensureSettlements,
      recordSettlement,
      fetchBalances,
    }),
    [
      token,
      groups,
      isAuthenticated,
      membersByGroup,
      expensesByGroup,
      settlementsByGroup,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
