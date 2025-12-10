'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface WorkingSheetRecord {
  supplierName: string;
  company: string;
  type: string;
  qty: number;
  cnMonth: string;
}

interface Supplier {
  id: string;
  supplierName: string;
}

interface Period {
  id: string;
  period: string;
  createdAt: any;
}

interface Item {
  id: string;
  itemName: string;
  company: string;
  materialType: string;
}

interface Type {
  id: string;
  type: string;
  createdAt: any;
}

interface CalculatedRow {
  supplier: string;
  materialType: string;
  company: string;
  values: { [monthName: string]: number };
  total: number;
}

export default function SupplierWiseYearly() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [workingSheet, setWorkingSheet] = useState<WorkingSheetRecord[]>([]);
  const [allCompanies, setAllCompanies] = useState<string[]>([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showOnlyWithValues, setShowOnlyWithValues] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch suppliers
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'suppliers'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          supplierName: doc.data().supplierName as string
        }));
        setSuppliers(data);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch periods and sort them chronologically
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'periods'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          period: doc.data().period as string,
          createdAt: doc.data().createdAt
        }));
        
        // Sort periods chronologically (e.g., "Apr-25", "May-25", etc.)
        const sortedData = data.sort((a, b) => {
          const parseMonthYear = (period: string): { year: number; month: number } => {
            const [monthStr, yearStr] = period.split('-');
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIndex = months.indexOf(monthStr.toLowerCase());
            const year = parseInt('20' + yearStr);
            return { year, month: monthIndex };
          };
          
          const dateA = parseMonthYear(a.period);
          const dateB = parseMonthYear(b.period);
          
          if (dateA.year !== dateB.year) {
            return dateA.year - dateB.year;
          }
          return dateA.month - dateB.month;
        });
        
        setPeriods(sortedData);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch types and sort by createdAt (FIFO)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'types'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          type: doc.data().type as string,
          createdAt: doc.data().createdAt
        }));
        
        // Sort by createdAt (First In, First Out - oldest first)
        const sortedData = data.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          
          const timeA = a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt;
          const timeB = b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt;
          
          return timeA - timeB;
        });
        
        setTypes(sortedData);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch items and extract unique companies (excluding "NA")
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            itemName: (docData.itemName as string) || '',
            company: (docData.company as string) || '',
            materialType: (docData.materialType as string) || ''
          };
        });
        setItems(data);
        
        // Extract unique companies, filter out "NA" and empty strings
        const companies = [...new Set(
          data
            .map(item => item.company.trim())
            .filter(company => company && company.toUpperCase() !== 'NA')
        )].sort();
        
        setAllCompanies(companies);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch workingSheet
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'workingSheet'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            supplierName: (docData.supplierName as string) || '',
            company: (docData.company as string) || '',
            type: (docData.type as string) || '',
            qty: (docData.qty as number) || 0,
            cnMonth: (docData.cnMonth as string) || ''
          };
        });
        setWorkingSheet(data);
      }
    );
    return () => unsubscribe();
  }, []);

  // Calculate data dynamically based on filters
  const calculatedRows = useMemo(() => {
    const results: CalculatedRow[] = [];

    // VLOOKUP function
    const vlookupMaterialType = (company: string): string => {
      if (!company.trim()) return '';
      const item = items.find(i => i.company.toLowerCase() === company.toLowerCase());
      return item?.materialType || 'Unknown';
    };

    // PRE-AGGREGATE: Create a lookup map for fast access (O(1) instead of O(n))
    const aggregatedData = new Map<string, number>();
    
    workingSheet.forEach(record => {
      const key = [
        (record.supplierName || '').trim().toLowerCase(),
        (record.company || '').trim().toLowerCase(),
        (record.type || '').trim().toLowerCase(),
        (record.cnMonth || '').trim().toLowerCase()
      ].join('|');
      
      const qty = typeof record.qty === 'number' ? record.qty : parseFloat(String(record.qty || 0));
      const validQty = isNaN(qty) ? 0 : qty;
      
      aggregatedData.set(key, (aggregatedData.get(key) || 0) + validQty);
    });

    // Determine which combinations to calculate
    const suppliersToProcess = selectedSupplier ? [selectedSupplier] : suppliers.map(s => s.supplierName);
    const typesToProcess = selectedType ? [selectedType] : types.map(t => t.type);
    const companiesToProcess = selectedCompany ? [selectedCompany] : allCompanies;

    // Generate all combinations
    for (const supplier of suppliersToProcess) {
      for (const type of typesToProcess) {
        for (const company of companiesToProcess) {
          // Get the material type for the company
          const materialType = vlookupMaterialType(company);

          // Calculate values for each month dynamically using the lookup map
          const values: { [monthName: string]: number } = {};
          let total = 0;

          for (const period of periods) {
            const key = [
              supplier.trim().toLowerCase(),
              company.trim().toLowerCase(),
              type.trim().toLowerCase(),
              period.period.trim().toLowerCase()
            ].join('|');
            
            const monthValue = aggregatedData.get(key) || 0;
            values[period.period] = monthValue;
            total += monthValue;
          }

          // Add row based on filter setting
          if (!showOnlyWithValues || total > 0) {
            results.push({
              supplier: supplier,
              materialType: materialType,
              company: company,
              values: values,
              total: total
            });
          }
        }
      }
    }

    return results;
  }, [selectedSupplier, selectedType, selectedCompany, workingSheet, items, periods, suppliers, types, allCompanies, showOnlyWithValues]);

  // Calculate column totals
  const columnTotals = useMemo(() => {
    const totals: { [monthName: string]: number } = {};
    
    // Initialize totals for each month
    periods.forEach(period => {
      totals[period.period] = 0;
    });
    
    // Sum up values
    calculatedRows.forEach(row => {
      periods.forEach(period => {
        totals[period.period] += row.values[period.period] || 0;
      });
    });
    
    // Calculate grand total
    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    
    return { ...totals, total: grandTotal };
  }, [calculatedRows, periods]);

  // Grand Total
  const grandTotal = useMemo(() => {
    return columnTotals.total || 0;
  }, [columnTotals]);

  // Pagination calculations
  const totalPages = Math.ceil(calculatedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = calculatedRows.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedSupplier('');
    setSelectedType('');
    setSelectedCompany('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-purple-50 to-pink-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700 font-medium">Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-100 py-4 px-2 sm:px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">
          📅 Supplier Wise Yearly Report
        </h1>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">🔍 Filter Records</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowOnlyWithValues(!showOnlyWithValues)}
                className={`w-full sm:w-auto px-4 py-2 text-sm rounded-lg transition shadow-md ${
                  showOnlyWithValues
                    ? 'bg-linear-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                    : 'bg-linear-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                }`}
              >
                {showOnlyWithValues ? '✓ Show Only Values > 0' : '📊 Show All (Including 0)'}
              </button>
              <button
                onClick={clearFilters}
                className="w-full sm:w-auto px-4 py-2 text-sm bg-linear-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition shadow-md"
              >
                ✖️ Clear Filters
              </button>
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-gray-600 mb-4 bg-purple-50 p-3 rounded-lg border border-purple-200">
            💡 <span className="font-semibold">Note:</span> You can select any combination of filters. Leave filters empty to show all combinations.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Supplier
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Suppliers --</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.supplierName}>
                    {supplier.supplierName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📋 Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Types --</option>
                {types.map(type => (
                  <option key={type.id} value={type.type}>
                    {type.type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏭 Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Companies --</option>
                {allCompanies.map(company => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {calculatedRows.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-500 text-base sm:text-lg">
              {showOnlyWithValues 
                ? '📭 No data with values greater than 0 found. Try toggling "Show All (Including 0)" or adjust your filters.'
                : '📭 No data available. Please check your filters or data sources.'}
            </p>
          </div>
        ) : (
          <>
            {/* Rows per page selector */}
            <div className="bg-white rounded-t-xl shadow-lg px-4 py-3 border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                📊 Showing {startIndex + 1}-{Math.min(endIndex, calculatedRows.length)} of {calculatedRows.length} records
              </div>
            </div>

            <div className="bg-white shadow-lg overflow-hidden border border-gray-300">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-linear-to-r from-purple-800 to-pink-900 text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 w-16">Sl.No</th>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[180px]">Supplier</th>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[140px]">Type</th>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[160px]">Company</th>
                      {periods.map(period => (
                        <th key={period.id} className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[100px]">
                          {period.period}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[110px]">Total</th>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 w-20">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((row, index) => (
                      <tr
                        key={`${row.supplier}-${row.materialType}-${row.company}-${index}`}
                        className="border-b border-gray-300 hover:bg-purple-50 transition"
                      >
                        <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 font-medium border border-gray-300">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 border border-gray-300">{row.supplier}</td>
                        <td className="px-3 py-3 text-xs sm:text-sm text-center border border-gray-300">
                          <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs font-medium">
                            {row.materialType}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 font-medium border border-gray-300">{row.company}</td>
                        {periods.map(period => (
                          <td key={period.id} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 border border-gray-300">
                            {(row.values[period.period] || 0) === 0 ? '—' : (row.values[period.period] || 0).toFixed(2)}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-xs sm:text-sm text-center font-semibold text-purple-700 border border-gray-300">
                          {row.total.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-xs sm:text-sm text-center border border-gray-300">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            row.total > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {row.total > 0 ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Column Totals Row */}
                    <tr className="bg-linear-to-r from-purple-100 to-pink-200 border-t-4 border-purple-600 font-bold">
                      <td colSpan={4} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                        📊 COLUMN TOTALS
                      </td>
                      {periods.map(period => (
                        <td key={period.id} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                          {(columnTotals[period.period] || 0) === 0 ? '—' : (columnTotals[period.period] || 0).toFixed(2)}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-xs sm:text-sm text-center text-purple-700 font-bold text-base border border-gray-400">
                        {(columnTotals.total || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-xs sm:text-sm text-center border border-gray-400">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          —
                        </span>
                      </td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr className="bg-linear-to-r from-green-100 to-green-200 border-t-4 border-green-600 font-bold">
                      <td colSpan={4} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                        💰 GRAND TOTAL
                      </td>
                      <td colSpan={periods.length + 2} className="px-3 py-3 text-sm sm:text-base text-center text-green-800 font-bold border border-gray-400">
                        {grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="bg-white rounded-b-xl shadow-lg px-4 py-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm text-gray-600">
                  Page <span className="font-bold text-purple-600">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                            currentPage === pageNum
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        goToPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}