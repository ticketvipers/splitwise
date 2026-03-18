'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../../../../context/AppContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewExpensePage() {
  const { id } = useParams<{ id: string }>();
  const { groups, ensureMembers, createExpense } = useApp();
  const router = useRouter();

  const group = groups.find(g => g.id === id);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMode, setSplitMode] = useState<'equal' | 'exact'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [splitError, setSplitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureMembers(id).catch(() => {});
  }, [id, ensureMembers]);

  useEffect(() => {
    if (group && !paidBy) {
      setPaidBy(group.members[0]?.id || '');
    }
  }, [group, paidBy]);

  const memberCount = group?.members.length || 0;

  const splitTotal = useMemo(() => {
    if (!group) return 0;
    return group.members.reduce((sum, m) => sum + (parseFloat(customSplits[m.id] || '0') || 0), 0);
  }, [customSplits, group]);

  if (!group) return <div className="text-center py-20 text-gray-400">Group not found.</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(amount);
    if (!description || isNaN(total) || total <= 0) return;

    if (splitMode === 'exact' && Math.abs(splitTotal - total) > 0.01) {
      setSplitError(`Splits must add up to $${total.toFixed(2)}. Current total: $${splitTotal.toFixed(2)}`);
      return;
    }
    setSplitError(null);

    setSubmitting(true);
    setError(null);
    try {
      await createExpense(id, {
        description,
        amount: total,
        currency: 'USD',
        notes: notes || null,
        date: date || null,
        payer_id: paidBy || null,
        split_type: splitMode,
        splits:
          splitMode === 'exact'
            ? group.members.map(m => ({ user_id: m.id, amount: parseFloat(customSplits[m.id] || '0') || 0 }))
            : null,
      });
      router.push(`/groups/${id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link href={`/groups/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to {group.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">Add Expense</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
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
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
            value={amount}
            onChange={e => {
              setAmount(e.target.value);
              setSplitError(null);
            }}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
            value={paidBy}
            onChange={e => setPaidBy(e.target.value)}
          >
            {group.members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Split</label>
          <div className="flex gap-2 mb-3">
            {(['equal', 'exact'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setSplitMode(mode);
                  setSplitError(null);
                }}
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
              Split equally among {memberCount} members
              {amount && !isNaN(parseFloat(amount)) && memberCount > 0 && ` — $${(parseFloat(amount) / memberCount).toFixed(2)} each`}
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
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
                    placeholder="0.00"
                    value={customSplits[m.id] || ''}
                    onChange={e => setCustomSplits(prev => ({ ...prev, [m.id]: e.target.value }))}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400">Total: ${splitTotal.toFixed(2)}</p>
            </div>
          )}
        </div>

        {splitError && <p className="text-red-500 text-sm font-medium">{splitError}</p>}
        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BC5A7] resize-none"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any extra details…"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
          style={{ backgroundColor: '#5BC5A7' }}
        >
          {submitting ? 'Saving…' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
}
