'use client';
import { useState } from 'react';
import { useApp } from '../../../../../context/AppContext';
import { useParams, useRouter } from 'next/navigation';
import { getMemberName } from '../../../../../lib/balances';
import { Split } from '../../../../../lib/types';
import Link from 'next/link';

export default function NewExpensePage() {
  const { id } = useParams<{ id: string }>();
  const { groups, expenses, setExpenses } = useApp();
  const router = useRouter();

  const group = groups.find(g => g.id === id);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(group?.members[0]?.id ?? '');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [splitError, setSplitError] = useState<string | null>(null);

  if (!group) return <div className="text-center py-20 text-gray-400">Group not found.</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(amount);
    if (!description || isNaN(total) || total <= 0) return;

    let splits: Split[];
    if (splitMode === 'equal') {
      const baseShare = Math.floor((total / group.members.length) * 100) / 100;
      const remainder = Math.round((total - baseShare * group.members.length) * 100);
      splits = group.members.map((m, i) => ({
        memberId: m.id,
        amount: Math.round((baseShare + (i < remainder ? 0.01 : 0)) * 100) / 100,
      }));
    } else {
      const splitTotal = group.members.reduce((sum, m) => sum + (parseFloat(customSplits[m.id] || '0') || 0), 0);
      if (Math.abs(splitTotal - total) > 0.01) {
        setSplitError(`Splits must add up to $${total.toFixed(2)}. Current total: $${splitTotal.toFixed(2)}`);
        return;
      }
      setSplitError(null);
      splits = group.members.map(m => ({
        memberId: m.id,
        amount: parseFloat(customSplits[m.id] || '0') || 0,
      }));
    }

    setExpenses(prev => [...prev, {
      id: crypto.randomUUID(),
      groupId: id,
      description,
      amount: total,
      paidBy,
      splits,
      createdAt: new Date().toISOString(),
      settled: false,
    }]);
    router.push(`/groups/${id}`);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link href={`/groups/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← Back to {group.name}</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">Add Expense</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Dinner, Uber, Groceries"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
            value={amount}
            onChange={e => { setAmount(e.target.value); setSplitError(null); }}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
            value={paidBy}
            onChange={e => setPaidBy(e.target.value)}
          >
            {group.members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Split</label>
          <div className="flex gap-2 mb-3">
            {(['equal', 'custom'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => { setSplitMode(mode); setSplitError(null); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  splitMode === mode ? 'text-white' : 'bg-gray-100 text-gray-600'
                }`}
                style={splitMode === mode ? { backgroundColor: '#5BC5A7' } : {}}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {splitMode === 'equal' ? (
            <p className="text-sm text-gray-400">
              Split equally among {group.members.length} members
              {amount && !isNaN(parseFloat(amount)) && ` — $${(parseFloat(amount) / group.members.length).toFixed(2)} each`}
            </p>
          ) : (
            <div className="space-y-2">
              {group.members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-24">{m.name}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
                    placeholder="0.00"
                    value={customSplits[m.id] || ''}
                    onChange={e => setCustomSplits(prev => ({ ...prev, [m.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {splitError && (
          <p className="text-red-500 text-sm font-medium">{splitError}</p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm"
          style={{ backgroundColor: '#5BC5A7' }}
        >
          Add Expense
        </button>
      </form>
    </div>
  );
}
