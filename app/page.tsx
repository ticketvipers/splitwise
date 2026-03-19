'use client';
import { useApp } from '../context/AppContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { groups } = useApp();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-400 text-lg mb-4">No groups yet.</p>
          <Link
            href="/groups/new"
            className="inline-block px-5 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: '#5BC5A7' }}
          >
            Create your first group
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800 text-lg">{group.name}</h2>
                  <p className="text-sm text-gray-400">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-300">→</div>
              </div>
            </Link>
          ))}

          <Link
            href="/groups/new"
            className="block w-full text-center py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#5BC5A7] hover:text-[#5BC5A7] transition-colors"
          >
            + New Group
          </Link>
        </div>
      )}
    </div>
  );
}
