'use client';
import { useApp } from '../../../../context/AppContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getMemberName } from '../../../../lib/balances';
import Link from 'next/link';
import { Suspense } from 'react';

function SettleContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { groups, expenses, setExpenses } = useApp();
  const router = useRouter();

  const group = groups.find(g => g.id === id);
  const fromId = searchParams.get('from') ?? '';
  const toId = searchParams.get('to') ?? '';
  const amount = parseFloat(searchParams.get('amount') ?? '0');

  if (!group) return <div className="text-center py-20 text-gray-400">Group not found.</div>;

  const handleSettle = () => {
    // Mark all unsettled expenses where fromId owes toId as settled
    setExpenses(prev => prev.map(e => {
      if (e.groupId !== id || e.settled) return e;
      const payerIsTo = e.paidBy === toId;
      const debtorIsFrom = e.splits.some(s => s.memberId === fromId && s.amount > 0);
      if (payerIsTo && debtorIsFrom) return { ...e, settled: true };
      return e;
    }));
    router.push(`/groups/${id}`);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <Link href={`/groups/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← Back to {group.name}</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">Settle Up</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4">
        <div className="text-5xl">💸</div>
        <p className="text-lg text-gray-700">
          <span className="font-semibold text-orange-500">{getMemberName(group.members, fromId)}</span>
          {' pays '}
          <span className="font-semibold text-green-600">{getMemberName(group.members, toId)}</span>
        </p>
        <p className="text-4xl font-bold text-gray-800">${amount.toFixed(2)}</p>
        <p className="text-sm text-gray-400">This will mark the related expenses as settled.</p>

        <div className="flex gap-3 pt-2">
          <Link
            href={`/groups/${id}`}
            className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-600 font-medium text-sm text-center"
          >
            Cancel
          </Link>
          <button
            onClick={handleSettle}
            className="flex-1 py-2.5 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: '#5BC5A7' }}
          >
            Confirm Settlement
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettlePage() {
  return (
    <Suspense>
      <SettleContent />
    </Suspense>
  );
}
