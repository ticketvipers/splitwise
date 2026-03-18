'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../context/AppContext';

export default function NewGroupPage() {
  const { createGroup } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const group = await createGroup(name.trim(), description.trim() || undefined);
      router.push(`/groups/${group.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Group</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Trip to Vegas"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Weekend trip expenses"
          />
          <p className="text-xs text-gray-400 mt-2">
            You can invite members after creating the group.
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="w-full py-2 rounded-lg text-white font-medium disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: '#5BC5A7' }}
        >
          {loading ? 'Creating…' : 'Create Group'}
        </button>
      </form>
    </div>
  );
}
