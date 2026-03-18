'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '../../../../../context/AppContext';
import { Button } from '../../../../../components/ui/Button';
import { ErrorState } from '../../../../../components/ui/ErrorState';
import { Input } from '../../../../../components/ui/Input';
import { ToastContainer } from '../../../../../components/ui/Toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function InviteMemberPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useApp();

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; type?: 'success' | 'error' | 'info' | 'warning'; message: string }>>([]);

  const dismissToast = (toastId: string) => setToasts((prev) => prev.filter((t) => t.id !== toastId));

  const generateInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/groups/${id}/invite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || data?.detail || 'Failed to generate invite link');
      }
      const data = await res.json();
      setInviteUrl(data.join_url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setToasts((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: 'success', message: 'Invite link copied to clipboard.' },
      ]);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setToasts((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: 'error', message: 'Could not copy to clipboard.' },
      ]);
    }
  };

  return (
    <div className="max-w-lg">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <Link href={`/groups/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
        ← Back to group
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mt-2 mb-6">Invite Members</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <p className="text-sm text-gray-600">
          Generate an invite link to share with people you want to add to this group. The link expires in{' '}
          <strong>7 days</strong>.
        </p>

        {!inviteUrl ? (
          <Button onClick={generateInvite} loading={loading} className="w-full">
            Generate Invite Link
          </Button>
        ) : (
          <div className="space-y-3">
            <Input label="Invite link" readOnly value={inviteUrl} className="bg-gray-50" />

            <div className="flex gap-2">
              <Button
                variant={copied ? 'secondary' : 'primary'}
                className="flex-1"
                onClick={copyToClipboard}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={generateInvite} loading={loading}>
                New link
              </Button>
            </div>
          </div>
        )}

        {error && <ErrorState inline message={error} />}
      </div>
    </div>
  );
}
