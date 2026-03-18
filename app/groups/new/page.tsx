'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../context/AppContext';
import { Group, Member } from '../../../lib/types';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Input } from '../../../components/ui/Input';

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function NewGroupPage() {
  const { setGroups } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    setMembers((prev) => [...prev, { id: genId(), name: trimmed }]);
    setMemberInput('');
  };

  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    if (members.length < 1) {
      setError('Add at least one member.');
      return;
    }

    const group: Group = {
      id: genId(),
      name: name.trim(),
      members,
      createdAt: new Date().toISOString(),
    };

    setGroups((prev) => [...prev, group]);
    router.push(`/groups/${group.id}`);
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Group</h1>

      {error && (
        <div className="mb-4">
          <ErrorState inline message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <Input
          label="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Trip to Vegas"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Add Members</label>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label={undefined}
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
                placeholder="Member name"
              />
            </div>
            <Button type="button" variant="secondary" size="md" onClick={addMember}>
              Add
            </Button>
          </div>

          {members.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="flex items-center gap-1 bg-[var(--color-brand-light)] text-[#3a9a82] text-sm px-3 py-1 rounded-full"
                >
                  {m.name}
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    className="ml-1 text-[#3a9a82] hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] rounded"
                    aria-label={`Remove ${m.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={!name.trim() || members.length < 1} className="w-full">
          Create Group
        </Button>
      </form>
    </div>
  );
}
