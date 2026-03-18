'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '../../../../context/AppContext';
import { getMemberName } from '../../../../lib/balances';
import { Settlement } from '../../../../lib/types';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';

function SettleContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { groups, settlements, setSettlements } = useApp();
  const router = useRouter();

  const group = groups.find((g) => g.id === id);
  const fromId = searchParams.get('from') ?? '';
  const toId = searchParams.get('to') ?? '';
  const amount = parseFloat(searchParams.get('amount') ?? '0');

  if (!group) return <ErrorState message="Group not found." />;
  if (!fromId || !toId || !amount) {
    return <ErrorState message="Missing settlement details. Please start from the group balances screen." />;
  }

  const handleSettle = () => {
    const settlement: Settlement = {
      id: crypto.randomUUID(),
      groupId: id,
      payerId: fromId,
      payeeId: toId,
      amount,
      createdAt: new Date().toISOString(),
    };
    setSettlements((prev) => [...prev, settlement]);
    router.push(`/groups/${id}`);
  };

  const history = settlements
    .filter((s) =>
      s.groupId === id &&
      ((s.payerId === fromId && s.payeeId === toId) || (s.payerId === toId && s.payeeId === fromId))
    )
    .slice()
    .reverse();

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <Link href={`/groups/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to {group.name}
        </Link>
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
          <Button variant="secondary" className="flex-1" onClick={() => router.push(`/groups/${id}`)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSettle}>
            Confirm Settlement
          </Button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Past Settlements</h2>
          <div className="space-y-2">
            {history.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm gap-4">
                <span className="text-gray-600 min-w-0">
                  <span className="font-medium">{getMemberName(group.members, s.payerId)}</span>
                  {' paid '}
                  <span className="font-medium">{getMemberName(group.members, s.payeeId)}</span>
                </span>
                <div className="text-right flex-shrink-0">
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
    <Suspense fallback={<LoadingSpinner />}>
      <SettleContent />
    </Suspense>
  );
}
