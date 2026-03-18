'use client';
import { useApp } from '../../../../context/AppContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';

function SettleContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { groups, ensureMembers, ensureSettlements, settlementsByGroup, recordSettlement } = useApp();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const group = groups.find(g => g.id === id);
  const fromId = searchParams.get('from') ?? '';
  const toId = searchParams.get('to') ?? '';
  const amount = parseFloat(searchParams.get('amount') ?? '0');

  useEffect(() => {
    ensureMembers(id).catch(() => {});
    ensureSettlements(id).catch(() => {});
  }, [id, ensureMembers, ensureSettlements]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of group?.members || []) map.set(m.id, m.name);
    return map;
  }, [group?.members]);

  if (!group) return <div className="text-center py-20 text-gray-400">Group not found.</div>;

  const settlements = settlementsByGroup[id] || [];
  const past = settlements.filter(
    s => (s.payerId === fromId && s.payeeId === toId) || (s.payerId === toId && s.payeeId === fromId)
  );

  const handleSettle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await recordSettlement(id, {
        payer_id: fromId,
        payee_id: toId,
        amount,
        currency: 'USD',
      });
      router.push(`/groups/${id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to record settlement');
    } finally {
      setSubmitting(false);
    }
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
          <span className="font-semibold text-orange-500">{memberNameById.get(fromId) || 'Someone'}</span>
          {' pays '}
          <span className="font-semibold text-green-600">{memberNameById.get(toId) || 'Someone'}</span>
        </p>
        <p className="text-4xl font-bold text-gray-800">${amount.toFixed(2)}</p>
        <p className="text-sm text-gray-400">Recording this payment will update the group balances.</p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link
            href={`/groups/${id}`}
            className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-600 font-medium text-sm text-center"
          >
            Cancel
          </Link>
          <button
            disabled={submitting}
            onClick={handleSettle}
            className="flex-1 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
            style={{ backgroundColor: '#5BC5A7' }}
          >
            {submitting ? 'Saving…' : 'Confirm Settlement'}
          </button>
        </div>
      </div>

      {past.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Past Settlements</h2>
          <div className="space-y-2">
            {past
              .slice()
              .reverse()
              .map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    <span className="font-medium">{memberNameById.get(s.payerId) || 'Someone'}</span>
                    {' paid '}
                    <span className="font-medium">{memberNameById.get(s.payeeId) || 'Someone'}</span>
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
