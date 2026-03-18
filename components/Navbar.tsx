'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/Button';

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
    // Close the mobile menu on navigation.
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-4">
        <Link href="/" className="font-bold text-lg" style={{ color: '#5BC5A7' }}>
          💸 Splitwise
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                pathname === l.href
                  ? 'text-[var(--color-brand)] border-b-2 border-[var(--color-brand)] pb-0.5'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side (desktop) */}
        <div className="ml-auto hidden sm:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-gray-700 font-medium">
                {user?.name || user?.email || 'Account'}
              </span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Login
              </Link>
              <Button
                size="sm"
                onClick={() => router.push('/signup')}
                className="shadow-sm"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="ml-auto sm:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === l.href ? 'bg-[var(--color-brand-light)] text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            ))}

            <div className="mt-2 pt-3 border-t border-gray-100">
              {isLoggedIn ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 font-medium truncate">
                    {user?.name || user?.email || 'Account'}
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => router.push('/login')}>
                    Login
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => router.push('/signup')}>
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
