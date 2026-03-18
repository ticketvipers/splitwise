'use client';
import { useApp } from '../../../../context/AppContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getMemberName } from '../../../../lib/balances';
import Link from 'next/link';
import { Suspense } from 'react';
import { Settlement } from '../../../../lib/types';

function SettleContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { groups, settlements, setSettlements } = useApp();
  const router = useRouter();

  const group = groups.find(g => g.id === id);
  const fromId = searchParams.get('from') ?? '';
  const toId = searchParams.get('to') ?? '';
  const amount = parseFloat(searchParams.get('amount') ?? '0');

  if (!group) return <div className="text-center py-20 text-gray-400">Group not found.</div>;

  const handleSettle = () => {
    const settlement: Settlement = {
      id: crypto.randomUUID(),
      groupId: id,
      payerId: fromId,
      payeeId: toId,
      amount,
      createdAt: new Date().toISOString(),
    };
    setSettlements(prev => [...prev, settlement]);
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
        <p className="text-sm text-gray-400">Recording this payment will update the group balances.</p>

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

      {/* Settlement history for this pair */}
      {settlements.filter(s => s.groupId === id && ((s.payerId === fromId && s.payeeId === toId) || (s.payerId === toId && s.payeeId === fromId))).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Past Settlements</h2>
          <div className="space-y-2">
            {settlements
              .filter(s => s.groupId === id && ((s.payerId === fromId && s.payeeId === toId) || (s.payerId === toId && s.payeeId === fromId)))
              .slice().reverse()
              .map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    <span className="font-medium">{getMemberName(group.members, s.payerId)}</span>
                    {' paid '}
                    <span className="font-medium">{getMemberName(group.members, s.payeeId)}</span>
                  </span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-800">${s.amount.toFixed(2)}</span>
                    <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
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
