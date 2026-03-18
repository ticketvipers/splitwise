'use client';
import { useApp } from '../../../context/AppContext';
import { computeBalances, getMemberName } from '../../../lib/balances';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const { groups, expenses } = useApp();

  const group = groups.find(g => g.id === id);
  if (!group) return <div className="text-center py-20 text-gray-400">Group not found.</div>;

  const groupExpenses = expenses.filter(e => e.groupId === id);
  const balances = computeBalances(groupExpenses, group.members);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">{group.name}</h1>
          <p className="text-sm text-gray-400">{group.members.map(m => m.name).join(', ')}</p>
        </div>
        <Link
          href={`/groups/${id}/expenses/new`}
          className="px-4 py-2 rounded-lg text-white font-medium text-sm"
          style={{ backgroundColor: '#5BC5A7' }}
        >
          + Add Expense
        </Link>
      </div>

      {/* Balances */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Balances</h2>
        {balances.length === 0 ? (
          <p className="text-green-500 text-sm font-medium">✓ All settled up!</p>
        ) : (
          <div className="space-y-2">
            {balances.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  <span className="font-medium text-orange-500">{getMemberName(group.members, b.from)}</span>
                  {' owes '}
                  <span className="font-medium text-green-600">{getMemberName(group.members, b.to)}</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">${b.amount.toFixed(2)}</span>
                  <Link
                    href={`/groups/${id}/settle?from=${b.from}&to=${b.to}&amount=${b.amount}`}
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
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Expenses</h2>
        {groupExpenses.length === 0 ? (
          <p className="text-gray-400 text-sm">No expenses yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupExpenses.slice().reverse().map(expense => (
              <div key={expense.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className={`font-medium ${expense.settled ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {expense.description}
                  </p>
                  <p className="text-xs text-gray-400">
                    Paid by {getMemberName(group.members, expense.paidBy)} · {new Date(expense.createdAt).toLocaleDateString()}
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
