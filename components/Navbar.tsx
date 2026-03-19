'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = useMemo(
    () => [
      { href: '/', label: 'Dashboard' },
      { href: '/groups', label: 'Groups' },
    ],
    []
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const linkClass = (href: string) =>
    [
      'text-sm font-medium transition-colors',
      pathname === href
        ? 'text-[#5BC5A7] border-b-2 border-[#5BC5A7] pb-0.5'
        : 'text-gray-500 hover:text-gray-800',
    ].join(' ');

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link
          href="/"
          className="font-bold text-lg shrink-0"
          style={{ color: '#5BC5A7' }}
        >
          💸 Splitwise
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6 min-w-0">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="ml-auto hidden sm:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-gray-700 font-medium truncate max-w-[160px]">
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
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
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

        {/* Mobile toggle */}
        <button
          type="button"
          className="sm:hidden ml-auto inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5BC5A7]"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen(v => !v)}
        >
          {mobileOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col gap-2">
            {links.map(l => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}

            <div className="pt-2 mt-2 border-t border-gray-100 flex flex-col gap-2">
              {isLoggedIn ? (
                <>
                  <span className="text-sm text-gray-700 font-medium truncate">
                    {user?.name || user?.email || 'Account'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm px-3 py-2 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#5BC5A7' }}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
