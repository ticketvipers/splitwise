'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '../../../../../context/AppContext';
import { ErrorState } from '../../../../../components/ui/ErrorState';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { Split } from '../../../../../lib/types';

export default function NewExpensePage() {
  const { id } = useParams<{ id: string }>();
  const { groups, setExpenses } = useApp();
  const router = useRouter();

  const group = groups.find((g) => g.id === id);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(group?.members[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMode, setSplitMode] = useState<'equal' | 'exact'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [splitError, setSplitError] = useState<string | null>(null);

  if (!group) return <ErrorState message="Group not found." />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(amount);
    if (!description || isNaN(total) || total <= 0) return;

    let splits: Split[];
    if (splitMode === 'equal') {
      const n = group.members.length;
      const base = Math.floor((total / n) * 100) / 100;
      const remainder = Math.round((total - base * n) * 100);
      splits = group.members.map((m, i) => ({
        memberId: m.id,
        amount: Math.round((base + (i === n - 1 && remainder > 0 ? 0.01 : 0)) * 100) / 100,
      }));
    } else {
      const splitTotal = group.members.reduce((sum, m) => sum + (parseFloat(customSplits[m.id] || '0') || 0), 0);
      if (Math.abs(splitTotal - total) > 0.01) {
        setSplitError(`Splits must add up to $${total.toFixed(2)}. Current total: $${splitTotal.toFixed(2)}`);
        return;
      }
      setSplitError(null);
      splits = group.members.map((m) => ({
        memberId: m.id,
        amount: parseFloat(customSplits[m.id] || '0') || 0,
      }));
    }

    setExpenses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        groupId: id,
        description,
        amount: total,
        paidBy,
        splits,
        notes: notes || undefined,
        date: date || undefined,
        splitType: splitMode,
        createdAt: new Date().toISOString(),
        settled: false,
      },
    ]);
    router.push(`/groups/${id}`);
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
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dinner, Uber, Groceries"
          required
        />

        <Input
          label="Amount ($)"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setSplitError(null);
          }}
          placeholder="0.00"
          required
        />

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Paid by</label>
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Split</label>
          <div className="flex gap-2 mb-3">
            {(['equal', 'exact'] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={splitMode === mode ? 'primary' : 'secondary'}
                onClick={() => {
                  setSplitMode(mode);
                  setSplitError(null);
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>

          {splitMode === 'equal' ? (
            <p className="text-sm text-gray-500">
              Split equally among {group.members.length} members
              {amount && !isNaN(parseFloat(amount)) && ` — $${(parseFloat(amount) / group.members.length).toFixed(2)} each`}
            </p>
          ) : (
            <div className="space-y-2">
              {group.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-24">{m.name}</span>
                  <Input
                    label={undefined}
                    type="number"
                    min="0"
                    step="0.01"
                    className="flex-1"
                    placeholder="0.00"
                    value={customSplits[m.id] || ''}
                    onChange={(e) => setCustomSplits((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {splitError && <ErrorState inline message={splitError} />}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra details…"
          />
        </div>

        <Button type="submit" className="w-full">
          Add Expense
        </Button>
      </form>
    </div>
  );
}
