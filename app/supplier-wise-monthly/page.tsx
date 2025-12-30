'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle } from 'lucide-react';

interface WorkingSheetRecord {
  supplierName: string;
  company: string;
  type: string;
  qty: number;
  cnMonth: string;
  status: string;
}

interface Supplier {
  id: string;
  supplierName: string;
}

interface Period {
  id: string;
  period: string;
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
  month: string;
  supplier: string;
  type: string;
  company: string;
  values: { [typeName: string]: number };
  total: number;
}

export default function SupplierWiseMonthly() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [workingSheet, setWorkingSheet] = useState<WorkingSheetRecord[]>([]);
  const [allCompanies, setAllCompanies] = useState<string[]>([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedType2, setSelectedType2] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [showOnlyWithValues, setShowOnlyWithValues] = useState(true);
  const [requiredFilters, setRequiredFilters] = useState<number>(3);
  const [dataFetched, setDataFetched] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch suppliers ONCE on mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'suppliers'));
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          supplierName: doc.data().supplierName as string
        }));
        setSuppliers(data);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch periods ONCE on mount
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'periods'));
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          period: doc.data().period as string
        }));
        
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
      } catch (error) {
        console.error('Error fetching periods:', error);
      }
    };
    fetchPeriods();
  }, []);

  // Fetch types ONCE on mount
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'types'));
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          type: doc.data().type as string,
          createdAt: doc.data().createdAt
        }));
        
        const sortedData = data.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          
          const timeA = a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt;
          const timeB = b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt;
          
          return timeA - timeB;
        });
        
        setTypes(sortedData);
      } catch (error) {
        console.error('Error fetching types:', error);
      }
    };
    fetchTypes();
  }, []);

  // Fetch items ONCE on mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'items'));
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
        
        const companies = [...new Set(
          data
            .map(item => item.company.trim())
            .filter(company => company && company.toUpperCase() !== 'NA')
        )].sort();
        
        setAllCompanies(companies);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching items:', error);
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Check if filter requirements are met
  const appliedFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedMonth) count++;
    if (selectedSupplier) count++;
    if (selectedCompany) count++;
    if (selectedType) count++;
    if (selectedType2) count++;
    if (selectedStatus) count++;
    return count;
  }, [selectedMonth, selectedSupplier, selectedCompany, selectedType, selectedType2, selectedStatus]);

  const filtersRequirementMet = useMemo(() => {
    return appliedFiltersCount >= requiredFilters;
  }, [appliedFiltersCount, requiredFilters]);

  // Manual fetch function - ONLY called when user explicitly applies filters
  const fetchWorkingSheetData = async () => {
    if (!filtersRequirementMet) {
      setWorkingSheet([]);
      setDataFetched(false);
      return;
    }

    setLoadingData(true);
    setDataFetched(false);

    try {
      // Build query with where clauses based on selected filters
      const constraints = [];

      if (selectedMonth) {
        constraints.push(where('cnMonth', '==', selectedMonth));
      }
      if (selectedSupplier) {
        constraints.push(where('supplierName', '==', selectedSupplier));
      }
      if (selectedCompany) {
        constraints.push(where('company', '==', selectedCompany));
      }
      if (selectedType) {
        constraints.push(where('type', '==', selectedType));
      }
      // Note: Type2 (Domestic/Import) filter is applied after data retrieval
      // since it requires vlookup from items collection, not direct field in workingSheet
      // Handle status filter separately since we need to group Verified and Closed
      let statusFilterApplied = false;
      let statusFilterValue = '';
      if (selectedStatus) {
        statusFilterApplied = true;
        statusFilterValue = selectedStatus;
      }

      // Create query with constraints
      const workingSheetQuery = constraints.length > 0 
        ? query(collection(db, 'workingSheet'), ...constraints)
        : collection(db, 'workingSheet');

      const snapshot = await getDocs(workingSheetQuery);
      let data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          supplierName: (docData.supplierName as string) || '',
          company: (docData.company as string) || '',
          type: (docData.type as string) || '',
          qty: (docData.qty as number) || 0,
          cnMonth: (docData.cnMonth as string) || '',
          status: (docData.status as string) || 'Open'
        };
      });
      
      // Apply status filter in-memory
      if (statusFilterApplied) {
        if (statusFilterValue === 'open') {
          data = data.filter(record => record.status.toLowerCase() === 'open');
        } else if (statusFilterValue === 'verified_closed') {
          data = data.filter(record => record.status.toLowerCase() === 'verified' || record.status.toLowerCase() === 'closed');
        }
      }
      
      setWorkingSheet(data);
      setDataFetched(true);
      setLoadingData(false);
    } catch (error) {
      console.error('Error fetching workingSheet:', error);
      setLoadingData(false);
      setDataFetched(false);
    }
  };

  // Calculate data dynamically based on filters
  const calculatedRows = useMemo(() => {
    if (!dataFetched) {
      return [];
    }

    const results: CalculatedRow[] = [];

    const vlookupType = (company: string): string => {
      if (!company.trim()) return '';
      const item = items.find(i => i.company.toLowerCase() === company.toLowerCase());
      return item?.materialType || 'Unknown';
    };

    // First, aggregate the data by unique combinations
    const aggregatedData = new Map<string, number>();
    
    workingSheet.forEach(record => {
      const key = [
        (record.cnMonth || '').trim().toLowerCase(),
        (record.supplierName || '').trim().toLowerCase(),
        (record.company || '').trim().toLowerCase(),
        (record.type || '').trim().toLowerCase()
      ].join('|');
      
      const qty = typeof record.qty === 'number' ? record.qty : parseFloat(String(record.qty || 0));
      const validQty = isNaN(qty) ? 0 : qty;
      
      aggregatedData.set(key, (aggregatedData.get(key) || 0) + validQty);
    });

    // Extract unique combinations from the actual data
    const uniqueCombinations = new Set<string>();
    workingSheet.forEach(record => {
      const combo = [
        (record.cnMonth || '').trim().toLowerCase(),
        (record.supplierName || '').trim().toLowerCase(),
        (record.company || '').trim().toLowerCase()
      ].join('|');
      uniqueCombinations.add(combo);
    });

    // Process only the unique combinations that exist in the data
    uniqueCombinations.forEach(combo => {
      const [month, supplier, company] = combo.split('|');
      const materialType = vlookupType(company);

      const values: { [typeName: string]: number } = {};
      let total = 0;

      for (const typeObj of types) {
        const key = [
          month,
          supplier,
          company,
          typeObj.type.trim().toLowerCase()
        ].join('|');
        
        const typeValue = aggregatedData.get(key) || 0;
        values[typeObj.type] = typeValue;
        total += typeValue;
      }

      // Apply filters after data retrieval
      const matchesShowOnlyWithValues = !showOnlyWithValues || total > 0;
      const matchesType2Filter = !selectedType2 || materialType === selectedType2;
      
      if (matchesShowOnlyWithValues && matchesType2Filter) {
        // Convert back to original case for display
        const originalMonth = workingSheet.find(r => 
          r.cnMonth?.trim().toLowerCase() === month
        )?.cnMonth || month;
        
        const originalSupplier = workingSheet.find(r => 
          r.supplierName?.trim().toLowerCase() === supplier
        )?.supplierName || supplier;
        
        const originalCompany = workingSheet.find(r => 
          r.company?.trim().toLowerCase() === company
        )?.company || company;

        results.push({
          month: originalMonth,
          supplier: originalSupplier,
          type: materialType,
          company: originalCompany,
          values: values,
          total: total
        });
      }
    });

    // Sort results for consistent display
    results.sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month);
      if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier);
      return a.company.localeCompare(b.company);
    });

    return results;
  }, [workingSheet, items, types, showOnlyWithValues, dataFetched, selectedType2]);

  // Calculate column totals
  const columnTotals = useMemo<Record<string, number>>(() => {
    const totals: { [typeName: string]: number } = {};
    
    types.forEach(typeObj => {
      totals[typeObj.type] = 0;
    });
    
    calculatedRows.forEach(row => {
      types.forEach(typeObj => {
        totals[typeObj.type] += row.values[typeObj.type] || 0;
      });
    });
    
    return totals;
  }, [calculatedRows, types]);

  const grandTotal = useMemo(() => {
    return Object.values(columnTotals).reduce((sum, val) => sum + val, 0);
  }, [columnTotals]);

  // Pagination calculations
  const totalPages = Math.ceil(calculatedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = calculatedRows.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Format number in Indian numbering system without currency symbol
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedMonth('');
    setSelectedSupplier('');
    setSelectedCompany('');
    setSelectedType('');
    setSelectedType2('');
    setSelectedStatus('');
    setWorkingSheet([]);
    setDataFetched(false);
  };

  // Handle filter changes - mark data as stale
  const handleFilterChange = (filterType: 'month' | 'supplier' | 'company' | 'type' | 'status' | 'type2', value: string) => {
    setDataFetched(false); // Mark data as stale when filters change
    
    switch (filterType) {
      case 'month':
        setSelectedMonth(value);
        break;
      case 'supplier':
        setSelectedSupplier(value);
        break;
      case 'company':
        setSelectedCompany(value);
        break;
      case 'type':
        setSelectedType(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'type2':
        setSelectedType2(value);
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700 font-medium">Loading initial data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-2 sm:px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 text-center">
          📊 Supplier Wise Monthly Report
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
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                    : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                }`}
              >
                {showOnlyWithValues ? '✓ Show Only Values > 0' : '📊 Show All (Including 0)'}
              </button>
              <button
                onClick={clearFilters}
                className="w-full sm:w-auto px-4 py-2 text-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition shadow-md"
              >
                ✖️ Clear Filters
              </button>
            </div>
          </div>
          
          {/* Filter Requirement Selector */}
          <div className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              ⚙️ Minimum Filters Required:
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setRequiredFilters(1);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 1
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 1 Filter
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(2);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 2
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 2 Filters
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(3);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 3
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 3 Filters
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(4);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 4
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 4 Filters
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(5);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 5
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 5 Filters
              </button>
            </div>
          </div>

          {/* Filter Status Indicator */}
          {!filtersRequirementMet && (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800 mb-1">
                    Filters Required
                  </p>
                  <p className="text-xs text-yellow-700">
                    You have applied {appliedFiltersCount} filter{appliedFiltersCount !== 1 ? 's' : ''}. 
                    Please apply at least {requiredFilters} filter{requiredFilters !== 1 ? 's' : ''} and click "Load Data".
                    <span className="block mt-1 font-medium">💡 Data is only fetched when you click the button - saving Firebase reads!</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs sm:text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
            💡 <span className="font-semibold">Note:</span> Select filters and click "Load Data" to fetch from Firebase. 
            {requiredFilters === 5 && ' All five filters must be selected.'}
            {requiredFilters === 4 && ' All four filters must be selected.'}
            {requiredFilters === 3 && ' At least three filters must be selected.'}
            {requiredFilters === 2 && ' At least two filters must be selected.'}
            {requiredFilters === 1 && ' At least one filter must be selected.'}
            <span className="block mt-1 text-green-700 font-medium">🔥 Zero Firebase reads until you click the button!</span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Month {selectedMonth && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => handleFilterChange('month', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- Select Month --</option>
                {periods.map(period => (
                  <option key={period.id} value={period.period}>
                    {period.period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Supplier {selectedSupplier && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => handleFilterChange('supplier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.supplierName}>
                    {supplier.supplierName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏭 Company {selectedCompany && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- Select Company --</option>
                {allCompanies.map(company => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📦 Type {selectedType && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={selectedType}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Types --</option>
                {types.map(typeObj => (
                  <option key={typeObj.id} value={typeObj.type}>
                    {typeObj.type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Type 2 {selectedType2 && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={selectedType2}
                onChange={(e) => handleFilterChange('type2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Type 2 --</option>
                <option value="Domestic">Domestic</option>
                <option value="Import">Import</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📋 Status {selectedStatus && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Statuses --</option>
                <option value="open">Open</option>
                <option value="verified_closed">Verified & Closed</option>
              </select>
            </div>
          </div>

          {/* Load Data Button */}
          <div className="flex justify-center">
            <button
              onClick={fetchWorkingSheetData}
              disabled={!filtersRequirementMet || loadingData}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition shadow-lg transform hover:scale-105 ${
                !filtersRequirementMet || loadingData
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              {loadingData ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Loading Data...
                </span>
              ) : (
                '🚀 Load Data from Firebase'
              )}
            </button>
          </div>

          {!dataFetched && filtersRequirementMet && !loadingData && (
            <p className="text-center text-sm text-orange-600 mt-3 font-medium">
              ⚠️ Click "Load Data" to fetch results
            </p>
          )}
        </div>

        {/* Table or Message */}
        {!dataFetched && !loadingData ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Ready to Load Data
            </h3>
            <p className="text-gray-600 text-base mb-4">
              {!filtersRequirementMet 
                ? `Please select at least ${requiredFilters} filter${requiredFilters !== 1 ? 's' : ''} and click "Load Data" to view the report.`
                : 'Click the "Load Data" button above to fetch data from Firebase.'}
            </p>
            <div className="bg-green-50 p-4 rounded-lg inline-block">
              <p className="text-sm text-green-800">
                <span className="font-semibold">💰 Current Firebase Reads:</span> 0
              </p>
              <p className="text-xs text-green-600 mt-1">
                No data fetched yet - your quota is safe!
              </p>
            </div>
          </div>
        ) : loadingData ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600">Fetching filtered data from Firebase...</p>
            <p className="text-xs text-gray-500 mt-2">This only happens when you click "Load Data"</p>
          </div>
        ) : calculatedRows.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500 text-base sm:text-lg">
              {showOnlyWithValues 
                ? '📭 No data with values greater than 0 found. Try toggling "Show All (Including 0)" or adjust your filters.'
                : '📭 No data available for the selected filters.'}
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
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                📊 Showing {startIndex + 1}-{Math.min(endIndex, calculatedRows.length)} of {calculatedRows.length} records
              </div>
            </div>

            <div className="bg-white shadow-lg overflow-hidden border-x border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white sticky top-0">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">Sl.No</th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">Month</th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">Supplier</th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">Type</th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold">Company</th>
                      {types.map(typeObj => (
                        <th key={typeObj.id} className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold">
                          {typeObj.type}
                        </th>
                      ))}
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((row, index) => (
                      <tr
                        key={`${row.month}-${row.supplier}-${row.company}-${index}`}
                        className="border-b border-gray-200 hover:bg-blue-50 transition"
                      >
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 font-medium">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">{row.month}</td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">{row.supplier}</td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                            {row.type}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 font-medium">{row.company}</td>
                        {types.map(typeObj => (
                          <td key={typeObj.id} className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-700">
                            {(row.values[typeObj.type] || 0) === 0 ? '—' : formatCurrency(row.values[typeObj.type] || 0)}
                          </td>
                        ))}
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right font-semibold text-blue-700">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Column Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-100 to-blue-200 border-t-4 border-blue-600 font-bold">
                      <td colSpan={5} className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">
                        📊 COLUMN TOTALS
                      </td>
                      {types.map(typeObj => (
                        <td key={typeObj.id} className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-900">
                          {(columnTotals[typeObj.type] || 0) === 0 ? '—' : formatCurrency(columnTotals[typeObj.type] || 0)}
                        </td>
                      ))}
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-blue-700 font-bold text-base">
                        {formatCurrency(grandTotal || 0)}
                      </td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr className="bg-gradient-to-r from-green-100 to-green-200 border-t-4 border-green-600 font-bold">
                      <td colSpan={5} className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">
                        💰 GRAND TOTAL
                      </td>
                      <td colSpan={types.length + 1} className="px-2 sm:px-4 py-3 text-sm sm:text-base text-right text-green-800 font-bold">
                        {formatCurrency(grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="bg-white rounded-b-xl shadow-lg px-4 py-4 border border-t-0 border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm text-gray-600">
                  Page <span className="font-bold text-blue-600">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
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
                              ? 'bg-blue-600 text-white shadow-md'
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
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500"
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