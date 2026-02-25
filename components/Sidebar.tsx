"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState({
    master: true,
    reports: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white overflow-y-auto z-30" suppressHydrationWarning>
      <div className="p-6" suppressHydrationWarning>
        <h1 className="text-2xl font-bold mb-8">Material MIS</h1>
        <nav>
          <ul className="space-y-2">
            {/* Home */}
            <li>
              <Link
                href="/"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                🏠 Home
              </Link>
            </li>

            {/* Master Section */}
            <li>
              <div 
                className="block px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer flex justify-between items-center"
                onClick={() => toggleSection('master')}
              >
                <span>📋 Master</span>
                <span>{expandedSections.master ? '▼' : '►'}</span>
              </div>
              {expandedSections.master && (
                <ul className="pl-8 space-y-1">
                  <li>
                    <Link
                      href="/supplier-master"
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive('/supplier-master')
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      Supplier Master
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/items-master"
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive('/items-master')
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      Items Master
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Other Pages */}
            <li>
              <Link
                href="/as-per-zoho"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/as-per-zoho')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                As per Zoho
              </Link>
            </li>

            <li>
              <Link
                href="/working"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/working')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Working
              </Link>
            </li>

            <li>
              <Link
                href="/import"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/import')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                📥 Import
              </Link>
            </li>

            <li>
              <Link
                href="/domestic"
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive('/domestic')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                🏠 Domestic
              </Link>
            </li>

            {/* Reports Section */}
            <li>
              <div 
                className="block px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer flex justify-between items-center"
                onClick={() => toggleSection('reports')}
              >
                <span>📊 Reports</span>
                <span>{expandedSections.reports ? '▼' : '►'}</span>
              </div>
              {expandedSections.reports && (
                <ul className="pl-8 space-y-1">
                  <li>
                    <Link
                      href="/supplier-wise-monthly"
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive('/supplier-wise-monthly')
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      Supplier Wise Monthly
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/supplier-wise-yearly"
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive('/supplier-wise-yearly')
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      Supplier Wise Yearly
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/supplier-grade-wise-yearly"
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive('/supplier-grade-wise-yearly')
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      Supplier Grade Wise Yearly
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/all-suppliers-monthly"
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive('/all-suppliers-monthly')
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      All Suppliers Monthly
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/total-suppliers-monthly"
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive('/total-suppliers-monthly')
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      Total Suppliers Monthly
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/total-suppliers-yearly"
                      className={`block px-4 py-2 rounded-lg transition-colors ${
                        isActive('/total-suppliers-yearly')
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      Total Suppliers Yearly
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}