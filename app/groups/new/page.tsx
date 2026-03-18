'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../context/AppContext';
import { Group, Member } from '../../../lib/types';

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function NewGroupPage() {
  const { setGroups } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<Member[]>([]);

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    setMembers(prev => [...prev, { id: genId(), name: trimmed }]);
    setMemberInput('');
  };

  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || members.length < 1) return;
    const group: Group = {
      id: genId(),
      name: name.trim(),
      members,
      createdAt: new Date().toISOString(),
    };
    setGroups(prev => [...prev, group]);
    router.push(`/groups/${group.id}`);
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Add Members</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]"
              value={memberInput}
              onChange={e => setMemberInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMember())}
              placeholder="Member name"
            />
            <button
              type="button"
              onClick={addMember}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: '#5BC5A7' }}
            >
              Add
            </button>
          </div>

          {members.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {members.map(m => (
                <span
                  key={m.id}
                  className="flex items-center gap-1 bg-[#e6f7f3] text-[#3a9a82] text-sm px-3 py-1 rounded-full"
                >
                  {m.name}
                  <button onClick={() => removeMember(m.id)} className="ml-1 text-[#3a9a82] hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!name.trim() || members.length < 1}
          className="w-full py-2 rounded-lg text-white font-medium disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: '#5BC5A7' }}
        >
          Create Group
        </button>
      </form>
    </div>
  );
}
