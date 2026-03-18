'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/groups', label: 'Groups' },
  ];

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-6">
        <span className="font-bold text-lg" style={{ color: '#5BC5A7' }}>💸 Splitwise</span>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm font-medium transition-colors ${
              pathname === l.href
                ? 'text-[#5BC5A7] border-b-2 border-[#5BC5A7] pb-0.5'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-gray-700 font-medium">
                {user?.name || user?.email || 'Account'}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm px-3 py-1.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#5BC5A7' }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
