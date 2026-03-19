'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { computeBalances, getMemberName } from '../../../lib/balances';
import { Button } from '../../../components/ui/Button';
import { LinkButton } from '../../../components/ui/LinkButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const { groups, expenses, settlements, setGroups } = useApp();
  const [showMembers, setShowMembers] = useState(false);

  const group = groups.find((g) => g.id === id);
  if (!group) {
    return <ErrorState message="Group not found." />;
  }

  const groupExpenses = expenses.filter((e) => e.groupId === id);
  const groupSettlements = settlements.filter((s) => s.groupId === id);
  const balances = computeBalances(groupExpenses, group.members, groupSettlements);

  const removeMember = (memberId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">{group.name}</h1>
          <p className="text-sm text-gray-400">
            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <LinkButton size="md" href={`/groups/${id}/expenses/new`}>
          + Add Expense
        </LinkButton>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Members</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowMembers((v) => !v)}>
            {showMembers ? 'Hide' : 'Show'} members
          </Button>
        </div>
        {showMembers && (
          <div className="space-y-2">
            {group.members.map((m, idx) => (
              <div key={m.id} className="flex items-center justify-between text-sm gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-gray-800 truncate">{m.name}</span>
                  {idx === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-brand-light)] text-[#3a9a82] font-medium">
                      Owner
                    </span>
                  )}
                  {idx > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 font-medium">
                      Member
                    </span>
                  )}
                </div>
                {idx > 0 && (
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => removeMember(m.id)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <Link href={`/groups/${id}/members/invite`} className="text-sm text-[var(--color-brand)] hover:underline">
                + Invite member
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Balances */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Balances</h2>
        {balances.length === 0 ? (
          <p className="text-green-600 text-sm font-medium">✓ All settled up!</p>
        ) : (
          <div className="space-y-2">
            {balances.map((b) => (
              <div key={`${b.from}-${b.to}`} className="flex items-center justify-between text-sm gap-4">
                <span className="text-gray-700 min-w-0">
                  <span className="font-medium text-orange-500">{getMemberName(group.members, b.from)}</span>
                  {' owes '}
                  <span className="font-medium text-green-600">{getMemberName(group.members, b.to)}</span>
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-semibold text-gray-800">${b.amount.toFixed(2)}</span>
                  <LinkButton
                    size="sm"
                    href={`/groups/${id}/settle?from=${b.from}&to=${b.to}&amount=${b.amount}`}
                  >
                    Settle Up
                  </LinkButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Expenses</h2>
        {groupExpenses.length === 0 ? (
          <EmptyState
            icon="🧾"
            heading="No expenses yet"
            subtext="Add an expense to start tracking who owes what."
            ctaLabel="Add Expense"
            ctaHref={`/groups/${id}/expenses/new`}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {groupExpenses
              .slice()
              .reverse()
              .map((expense) => (
                <div key={expense.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`font-medium ${expense.settled ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {expense.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      Paid by {getMemberName(group.members, expense.paidBy)} ·{' '}
                      {new Date(expense.createdAt).toLocaleDateString()}
                      {expense.settled && ' · Settled'}
                    </p>
                  </div>
                  <span className={`font-semibold ${expense.settled ? 'text-gray-400' : 'text-gray-800'}`}>
                    ${expense.amount.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
