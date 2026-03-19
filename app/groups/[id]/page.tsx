'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const {
    groups,
    ensureMembers,
    ensureExpenses,
    ensureSettlements,
    removeMember,
    fetchBalances,
  } = useApp();

  const [showMembers, setShowMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<{ from_user_id: string; to_user_id: string; amount: string | number }[]>([]);

  const group = groups.find(g => g.id === id);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of group?.members || []) map.set(m.id, m.name);
    return map;
  }, [group?.members]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        await ensureMembers(id);
        await Promise.all([ensureExpenses(id), ensureSettlements(id)]);
        const b = await fetchBalances(id);
        if (mounted) setBalances(b.balances || []);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Failed to load group');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id, ensureMembers, ensureExpenses, ensureSettlements, fetchBalances]);

  if (!group) return <div className="text-center py-20 text-gray-400">Group not found.</div>;

  const formatAmount = (v: string | number) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return `$${n.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">{group.name}</h1>
          <p className="text-sm text-gray-400">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href={`/groups/${id}/expenses/new`}
          className="px-4 py-2 rounded-lg text-white font-medium text-sm"
          style={{ backgroundColor: '#5BC5A7' }}
        >
          + Add Expense
        </Link>
      </div>

      {loading && (
        <div className="text-sm text-gray-400">Loading…</div>
      )}
      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}

      {/* Members */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Members</h2>
          <button
            onClick={() => setShowMembers(v => !v)}
            className="text-sm text-[#5BC5A7] hover:underline"
          >
            {showMembers ? 'Hide' : 'Show'} members
          </button>
        </div>
        {showMembers && (
          <div className="space-y-2">
            {group.members.map((m, idx) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{m.name}</span>
                  {idx === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#e6f7f3] text-[#3a9a82] font-medium">Owner</span>
                  )}
                </div>
                {idx > 0 && (
                  <button
                    onClick={() => removeMember(id, m.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <Link
                href={`/groups/${id}/members/invite`}
                className="text-sm text-[#5BC5A7] hover:underline"
              >
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
          <p className="text-green-500 text-sm font-medium">✓ All settled up!</p>
        ) : (
          <div className="space-y-2">
            {balances.map(b => (
              <div key={`${b.from_user_id}-${b.to_user_id}`} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  <span className="font-medium text-orange-500">{memberNameById.get(String(b.from_user_id)) || 'Someone'}</span>
                  {' owes '}
                  <span className="font-medium text-green-600">{memberNameById.get(String(b.to_user_id)) || 'Someone'}</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{formatAmount(b.amount)}</span>
                  <Link
                    href={`/groups/${id}/settle?from=${b.from_user_id}&to=${b.to_user_id}&amount=${b.amount}`}
                    className="px-3 py-1 rounded-md text-white text-xs font-medium"
                    style={{ backgroundColor: '#5BC5A7' }}
                  >
                    Settle Up
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses */}
      <GroupExpenses groupId={id} memberNameById={memberNameById} />
    </div>
  );
}

function GroupExpenses({
  groupId,
  memberNameById,
}: {
  groupId: string;
  memberNameById: Map<string, string>;
}) {
  const { expensesByGroup, ensureExpenses } = useApp();
  const expenses = expensesByGroup[groupId] || [];

  useEffect(() => {
    ensureExpenses(groupId).catch(() => {});
  }, [groupId, ensureExpenses]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="font-semibold text-gray-700 mb-3">Expenses</h2>
      {expenses.length === 0 ? (
        <p className="text-gray-400 text-sm">No expenses yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {expenses.slice().reverse().map(expense => (
            <div key={expense.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{expense.description}</p>
                <p className="text-xs text-gray-400">
                  Paid by {memberNameById.get(expense.paidBy) || 'Someone'} · {new Date(expense.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="font-semibold text-gray-800">${expense.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
