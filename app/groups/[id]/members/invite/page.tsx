'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function InviteMemberPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useApp();
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/groups/${id}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'Failed to generate invite link');
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
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg">
      <Link href={`/groups/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← Back to group</Link>
      <h1 className="text-2xl font-bold text-gray-800 mt-2 mb-6">Invite Members</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Generate an invite link to share with people you want to add to this group.
            The link expires in <strong>7 days</strong>.
          </p>

          {!inviteUrl ? (
            <button
              onClick={generateInvite}
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-medium disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: '#5BC5A7' }}
            >
              {loading ? 'Generating…' : 'Generate Invite Link'}
            </button>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Invite link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-opacity"
                  style={{ backgroundColor: copied ? '#3a9a82' : '#5BC5A7' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button
                onClick={generateInvite}
                disabled={loading}
                className="text-sm text-[#5BC5A7] hover:underline"
              >
                Generate another link
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
