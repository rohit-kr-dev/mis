"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface AsPerZohoData {
  id: string;
  vendorName: string;
  period: string;
  amount: number;
  createdAt: any;
  updatedAt: any;
}

interface Supplier {
  id: string;
  supplierName: string;
  alias: string;
}

interface Period {
  id: string;
  period: string;
}

export default function AsPerZohoPage() {
  // State for data
  const [asPerZohoData, setAsPerZohoData] = useState<AsPerZohoData[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  // State for filters
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  // Real-time subscription to asPerZoho collection
  useEffect(() => {
    const q = query(collection(db, 'asPerZoho'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: AsPerZohoData[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as AsPerZohoData);
        });
        setAsPerZohoData(data);
      },
      (error) => {
        console.error('Error fetching asPerZoho data:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time subscription to suppliers collection
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'suppliers'),
      (snapshot) => {
        const data: Supplier[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Supplier);
        });
        setSuppliers(data);
      },
      (error) => {
        console.error('Error fetching suppliers:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time subscription to periods collection
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'periods'),
      (snapshot) => {
        const data: Period[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Period);
        });
        setPeriods(data);
      },
      (error) => {
        console.error('Error fetching periods:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter data based on selections using useMemo
  const filteredData = useMemo(() => {
    return asPerZohoData.filter((item) => {
      const vendorMatch = selectedVendor === '' || item.vendorName === selectedVendor;
      const periodMatch = selectedPeriod === '' || item.period === selectedPeriod;
      return vendorMatch && periodMatch;
    });
  }, [asPerZohoData, selectedVendor, selectedPeriod]);

  // Calculate overall subtotal (filtered data total)
  const overallSubtotal = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredData]);

  // Calculate vendor total (all records for selected vendor)
  const vendorTotal = useMemo(() => {
    if (!selectedVendor) return 0;
    return asPerZohoData
      .filter((item) => item.vendorName === selectedVendor)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [asPerZohoData, selectedVendor]);

  // Calculate period total (all records for selected period)
  const periodTotal = useMemo(() => {
    if (!selectedPeriod) return 0;
    return asPerZohoData
      .filter((item) => item.period === selectedPeriod)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [asPerZohoData, selectedPeriod]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedVendor('');
    setSelectedPeriod('');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">As Per Zoho</h1>
          <p className="text-gray-600 mt-2">View and analyze vendor payments by period</p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vendor Dropdown */}
            <div>
              <label htmlFor="vendorFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Name
              </label>
              <select
                id="vendorFilter"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Vendors</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.supplierName}>
                    {supplier.supplierName}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Dropdown */}
            <div>
              <label htmlFor="periodFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <select
                id="periodFilter"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Periods</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.period}>
                    {period.period}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Overall Subtotal Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm font-medium opacity-90 mb-2">Filtered Subtotal</h3>
            <p className="text-3xl font-bold">{formatCurrency(overallSubtotal)}</p>
            <p className="text-sm opacity-80 mt-2">{filteredData.length} records</p>
          </div>

          {/* Vendor Total Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm font-medium opacity-90 mb-2">Vendor Total</h3>
            <p className="text-3xl font-bold">{formatCurrency(vendorTotal)}</p>
            <p className="text-sm opacity-80 mt-2">
              {selectedVendor ? selectedVendor : 'Select a vendor'}
            </p>
          </div>

          {/* Period Total Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm font-medium opacity-90 mb-2">Period Total</h3>
            <p className="text-3xl font-bold">{formatCurrency(periodTotal)}</p>
            <p className="text-sm opacity-80 mt-2">
              {selectedPeriod ? selectedPeriod : 'Select a period'}
            </p>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Payment Records</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredData.length} of {asPerZohoData.length} records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Vendor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          className="w-12 h-12 text-gray-400 mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-lg font-medium">No data found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.vendorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 uppercase">
                      Subtotal
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(overallSubtotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}