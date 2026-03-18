'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/groups', label: 'Groups' },
  ];

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
      </div>
    </nav>
  );
}
