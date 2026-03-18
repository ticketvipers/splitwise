'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { computeBalances, getMemberName } from '../lib/balances';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export default function DashboardPage() {
  const router = useRouter();
  const { groups, expenses } = useApp();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm">
          <EmptyState
            icon="📭"
            heading="No groups yet"
            subtext="Create a group to start splitting expenses with friends."
            ctaLabel="Create your first group"
            onCta={() => router.push('/groups/new')}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const groupExpenses = expenses.filter((e) => e.groupId === group.id);
            const balances = computeBalances(groupExpenses, group.members);

            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-800 text-lg">{group.name}</h2>
                    <p className="text-sm text-gray-400">
                      {group.members.length} members · {groupExpenses.filter((e) => !e.settled).length} active expenses
                    </p>
                  </div>
                  <div className="text-right">
                    {balances.length === 0 ? (
                      <span className="text-sm text-green-600 font-medium">All settled up ✓</span>
                    ) : (
                      <div className="text-sm space-y-0.5">
                        {balances.slice(0, 2).map((b) => (
                          <div key={`${b.from}-${b.to}`} className="text-orange-500">
                            {getMemberName(group.members, b.from)} owes {getMemberName(group.members, b.to)} ${b.amount.toFixed(2)}
                          </div>
                        ))}
                        {balances.length > 2 && <div className="text-gray-400">+{balances.length - 2} more</div>}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          <div className="pt-2">
            <Button
              variant="secondary"
              className="w-full border-2 border-dashed border-gray-200 text-gray-600 hover:border-[var(--color-brand)] hover:text-gray-800"
              onClick={() => router.push('/groups/new')}
            >
              + New Group
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
