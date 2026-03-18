'use client';
import { useApp } from '../../context/AppContext';
import { computeBalances } from '../../lib/balances';
import Link from 'next/link';

export default function GroupsPage() {
  const { groups, expenses } = useApp();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Groups</h1>
          <p className="text-sm text-gray-400 mt-0.5">{groups.length} group{groups.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          href="/groups/new"
          className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#5BC5A7' }}
        >
          + Create Group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No groups yet.</p>
          <p className="text-gray-300 text-sm mb-6">Create a group to start splitting expenses with friends.</p>
          <Link
            href="/groups/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white font-medium"
            style={{ backgroundColor: '#5BC5A7' }}
          >
            Create your first group
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const groupExpenses = expenses.filter(e => e.groupId === g.id);
            const balances = computeBalances(groupExpenses, g.members);
            const lastExpense = groupExpenses.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            const lastActivity = lastExpense
              ? new Date(lastExpense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : null;

            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex items-center justify-between bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-gray-800 text-base">{g.name}</div>
                  <div className="text-sm text-gray-400">
                    {g.members.length} member{g.members.length !== 1 ? 's' : ''} · {groupExpenses.filter(e => !e.settled).length} active expense{groupExpenses.filter(e => !e.settled).length !== 1 ? 's' : ''}
                  </div>
                  {lastActivity && (
                    <div className="text-xs text-gray-300">Last activity: {lastActivity}</div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  {balances.length === 0 ? (
                    <span className="text-sm text-green-500 font-medium">All settled ✓</span>
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
