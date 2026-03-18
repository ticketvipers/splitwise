'use client';
import { useApp } from '../../context/AppContext';
import Link from 'next/link';

export default function GroupsPage() {
  const { groups, expenses } = useApp();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Groups</h1>
        <Link
          href="/groups/new"
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#5BC5A7' }}
        >
          + New Group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
          No groups yet. Create one to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="font-semibold text-gray-800">{g.name}</div>
                <div className="text-sm text-gray-400">{g.members.map(m => m.name).join(', ')}</div>
              </div>
              <div className="text-sm text-gray-400">
                {expenses.filter(e => e.groupId === g.id).length} expenses →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
