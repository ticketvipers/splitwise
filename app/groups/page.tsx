'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '../../context/AppContext';
import { computeBalances } from '../../lib/balances';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export default function GroupsPage() {
  const router = useRouter();
  const { groups, expenses } = useApp();

  return (
    <div>
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Groups</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {groups.length} group{groups.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button size="md" onClick={() => router.push('/groups/new')}>
          + Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm">
          <EmptyState
            icon="👥"
            heading="No groups yet"
            subtext="Create a group to start splitting expenses with friends."
            ctaLabel="Create your first group"
            onCta={() => router.push('/groups/new')}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const groupExpenses = expenses.filter((e) => e.groupId === g.id);
            const balances = computeBalances(groupExpenses, g.members);
            const lastExpense = groupExpenses.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            const lastActivity = lastExpense
              ? new Date(lastExpense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : null;

            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex items-center justify-between gap-4 bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-gray-800 text-base">{g.name}</div>
                  <div className="text-sm text-gray-400">
                    {g.members.length} member{g.members.length !== 1 ? 's' : ''} · {groupExpenses.filter((e) => !e.settled).length}{' '}
                    active expense{groupExpenses.filter((e) => !e.settled).length !== 1 ? 's' : ''}
                  </div>
                  {lastActivity && <div className="text-xs text-gray-300">Last activity: {lastActivity}</div>}
                </div>
                <div className="text-right space-y-1">
                  {balances.length === 0 ? (
                    <span className="text-sm text-green-600 font-medium">All settled ✓</span>
                  ) : (
                    <span className="text-sm text-orange-500 font-medium">{balances.length} outstanding</span>
                  )}
                  <div className="text-xs text-gray-300">→</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
