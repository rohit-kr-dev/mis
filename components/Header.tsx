"use client";

import { usePathname } from 'next/navigation';

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/supplier-master': 'Supplier Master',
  '/items-master': 'Items Master',
  '/as-per-zoho': 'As per Zoho',
  '/master-check': 'Master Check',
  '/working': 'Working',
  '/supplier-wise-monthly': 'Supplier Wise Monthly',
  '/supplier-wise-yearly': 'Supplier Wise Yearly',
  '/all-suppliers-monthly': 'All Suppliers Monthly',
};

export default function Header() {
  const pathname = usePathname();
  const currentPage = pageNames[pathname] || 'Material MIS';
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Current Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentPage}</h1>
            <p className="text-sm text-gray-500 mt-1">{currentDate}</p>
          </div>

          {/* Right: User Info & Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                AU
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}