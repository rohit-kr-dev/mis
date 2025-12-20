"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { name: 'Supplier Master', path: '/supplier-master' },
  { name: 'Items Master', path: '/items-master' },
  { name: 'As per Zoho', path: '/as-per-zoho' },
  // { name: 'Master Check', path: '/master-check' },
  { name: 'Working', path: '/working' },
  { name: 'Supplier Wise Monthly', path: '/supplier-wise-monthly' },
  { name: 'Supplier Wise Yearly', path: '/supplier-wise-yearly' },
  { name: 'All Suppliers Monthly', path: '/all-suppliers-monthly' },
  { name: 'Total Suppliers Monthly', path: '/total-suppliers-monthly' },
  { name: 'Total Suppliers Yearly', path: '/total-suppliers-yearly' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-8">Material MIS</h1>
        <nav>
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.path
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}