'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, CheckCircle, Database, Download } from 'lucide-react';
import SearchableDropdown from '@/components/SearchableDropdown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WorkingSheetRecord {
  supplierName: string;
  company: string;
  type: string;
  qty: number;
  cnMonth: string;
  grade: string;  // Add grade field to match working sheet data
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
  gradeName: string;  // Add actual grade name
  values: { [monthName: string]: number };
  total: number;
}

export default function SupplierGradeWiseYearly() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [workingSheet, setWorkingSheet] = useState<WorkingSheetRecord[]>([]);
  const [allGrades, setAllGrades] = useState<string[]>([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [supplierSearch, setSupplierSearch] = useState<string>(''); // New search state
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [showOnlyWithValues, setShowOnlyWithValues] = useState(true);
  const [requiredFilters, setRequiredFilters] = useState<number>(1);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch master data ONCE on mount using getDocs
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoading(true);

        // Fetch suppliers with deduplication
        const suppliersSnap = await getDocs(collection(db, 'suppliers'));
        const supplierMap = new Map<string, Supplier>();
        
        suppliersSnap.docs.forEach(doc => {
          const supplierName = doc.data().supplierName as string;
          // Only add if supplier name doesn't exist in map (deduplication)
          if (supplierName && !supplierMap.has(supplierName)) {
            supplierMap.set(supplierName, {
              id: doc.id,
              supplierName: supplierName
            });
          }
        });
        
        const suppliersData = Array.from(supplierMap.values()).sort((a, b) => 
          a.supplierName.localeCompare(b.supplierName)
        );
        setSuppliers(suppliersData);

        // Fetch periods
        const periodsSnap = await getDocs(collection(db, 'periods'));
        const periodsData = periodsSnap.docs.map(doc => ({
          id: doc.id,
          period: doc.data().period as string,
          createdAt: doc.data().createdAt
        }));
        
        const sortedPeriods = periodsData.sort((a, b) => {
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
        setPeriods(sortedPeriods);

        // Fetch types
        const typesSnap = await getDocs(collection(db, 'types'));
        const typesData = typesSnap.docs.map(doc => ({
          id: doc.id,
          type: doc.data().type as string,
          createdAt: doc.data().createdAt
        }));
        
        const sortedTypes = typesData.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          const timeA = a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt;
          const timeB = b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt;
          return timeA - timeB;
        });
        setTypes(sortedTypes);

        // Fetch items
        const itemsSnap = await getDocs(collection(db, 'items'));
        const itemsData = itemsSnap.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            itemName: (docData.itemName as string) || '',
            company: (docData.company as string) || '',
            materialType: (docData.materialType as string) || ''
          };
        });
        setItems(itemsData);
        
        // Extract unique grades (materialType), filter out empty strings
        const grades = [...new Set(
          itemsData
            .map(item => item.materialType.trim())
            .filter(grade => grade)
        )].sort();
        
        setAllGrades(grades);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching master data:', error);
        setLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  // Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    return suppliers.filter(supplier => 
      supplier.supplierName.toLowerCase().includes(supplierSearch.toLowerCase())
    );
  }, [suppliers, supplierSearch]);

  // Check if filter requirements are met
  const appliedFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSupplier) count++;
    if (selectedType) count++;
    if (selectedGrade) count++;
    return count;
  }, [selectedSupplier, selectedType, selectedGrade]);

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

      if (selectedSupplier) {
        constraints.push(where('supplierName', '==', selectedSupplier));
      }
      if (selectedType) {
        constraints.push(where('type', '==', selectedType));
      }
      if (selectedGrade) {
        // For grade filtering, we need to filter by materialType from items
        constraints.push(where('company', '!=', '')); // This will be filtered later
      }

      // Create query with constraints
      const workingSheetQuery = constraints.length > 0 
        ? query(collection(db, 'workingSheet'), ...constraints)
        : collection(db, 'workingSheet');

      const snapshot = await getDocs(workingSheetQuery);
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          supplierName: (docData.supplierName as string) || '',
          company: (docData.company as string) || '',
          type: (docData.type as string) || '',
          qty: (docData.qty as number) || 0,
          cnMonth: (docData.cnMonth as string) || '',
          grade: (docData.grade as string) || ''  // Include grade from workingSheet
        };
      });
      
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

    // VLOOKUP function
    const vlookupMaterialType = (company: string): string => {
      if (!company.trim()) return '';
      const item = items.find(i => i.company.toLowerCase() === company.toLowerCase());
      return item?.materialType || 'Unknown';
    };

    // PRE-AGGREGATE: Create a lookup map for fast access (O(1) instead of O(n))
    const aggregatedData = new Map<string, { qty: number; grade: string }>();
    
    workingSheet.forEach(record => {
      // Filter by grade if selected
      if (selectedGrade && record.grade !== selectedGrade) {
        return; // Skip this record if it doesn't match the selected grade
      }
      
      const key = [
        (record.supplierName || '').trim().toLowerCase(),
        (record.type || '').trim().toLowerCase(),
        (record.cnMonth || '').trim().toLowerCase()
      ].join('|');
      
      const qty = typeof record.qty === 'number' ? record.qty : parseFloat(String(record.qty || 0));
      const validQty = isNaN(qty) ? 0 : qty;
      
      const existing = aggregatedData.get(key);
      if (existing) {
        aggregatedData.set(key, { 
          qty: existing.qty + validQty, 
          grade: record.grade || existing.grade  // Preserve grade info
        });
      } else {
        aggregatedData.set(key, { qty: validQty, grade: record.grade || '' });
      }
    });

    // Group data by actual grade names instead of filter grades
    const gradeGroups = new Map<string, { 
      supplier: string; 
      type: string; 
      actualGrade: string; 
      values: { [monthName: string]: number }; 
      total: number 
    }>();
    
    // Process each record and group by actual grade name
    workingSheet.forEach(record => {
      // Filter by grade if selected
      if (selectedGrade && record.grade !== selectedGrade) {
        return; // Skip this record if it doesn't match the selected grade
      }
      
      const supplier = record.supplierName || '';
      const type = record.type || '';
      const actualGrade = record.grade || '';
      
      // Skip if no actual grade
      if (!actualGrade.trim()) return;
      
      const key = `${supplier}|${type}|${actualGrade}`;
      
      const qty = typeof record.qty === 'number' ? record.qty : parseFloat(String(record.qty || 0));
      const validQty = isNaN(qty) ? 0 : qty;
      
      if (gradeGroups.has(key)) {
        const existing = gradeGroups.get(key)!;
        existing.values[record.cnMonth] = (existing.values[record.cnMonth] || 0) + validQty;
        existing.total += validQty;
      } else {
        // Initialize values for all periods
        const values: { [monthName: string]: number } = {};
        periods.forEach(period => {
          values[period.period] = period.period === record.cnMonth ? validQty : 0;
        });
        
        gradeGroups.set(key, {
          supplier,
          type,
          actualGrade,
          values,
          total: validQty
        });
      }
    });
    
    // Convert grouped data to results array
    gradeGroups.forEach((groupData, key) => {
      // Apply filter constraints
      const [supplier, type, actualGrade] = key.split('|');
      
      const supplierMatch = !selectedSupplier || supplier === selectedSupplier;
      const typeMatch = !selectedType || type === selectedType;
      
      if (supplierMatch && typeMatch) {
        if (!showOnlyWithValues || groupData.total > 0) {
          results.push({
            supplier: groupData.supplier,
            materialType: groupData.actualGrade, // Use actual grade name as materialType
            gradeName: groupData.actualGrade,    // Actual grade name
            values: groupData.values,
            total: groupData.total
          });
        }
      }
    });

    return results;
  }, [selectedSupplier, selectedType, selectedGrade, workingSheet, items, periods, suppliers, types, allGrades, showOnlyWithValues, dataFetched]);

  // Calculate column totals
  const columnTotals: Record<string, number> & { total: number } = useMemo(() => {
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
    setSelectedGrade('');
    setWorkingSheet([]);
    setDataFetched(false);
  };

  // Handle filter changes - mark data as stale
  const handleFilterChange = (filterType: 'supplier' | 'type' | 'grade', value: string) => {
    setDataFetched(false); // Mark data as stale when filters change
    
    switch (filterType) {
      case 'supplier':
        setSelectedSupplier(value);
        break;
      case 'type':
        setSelectedType(value);
        break;
      case 'grade':
        setSelectedGrade(value);
        break;
    }
  };

  // Format currency function for Indian numbering system
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format for downloads (without decimals for cleaner look)
  const formatForDownload = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  const downloadExcel = () => {
    if (calculatedRows.length === 0) return;
    
    // Prepare data for export with formatted numbers
    const exportData = calculatedRows.map((row, index) => {
      const rowData: any = {
        'Sl.No': index + 1,
        'Supplier': row.supplier,
        'Grade': row.materialType,
        'Actual Grade Name': row.gradeName || '',
      };
          
      // Add period columns with formatted numbers
      periods.forEach(period => {
        const value = row.values[period.period] || 0;
        rowData[period.period] = value === 0 ? 0 : formatForDownload(value);
      });
          
      rowData['Total'] = formatForDownload(row.total);
      return rowData;
    });
    
    // Add totals row
    const totalsRow: any = {
      'Sl.No': '',
      'Supplier': '',
      'Grade': 'COLUMN TOTALS',
      'Actual Grade Name': ''
    };
    
    periods.forEach(period => {
      totalsRow[period.period] = columnTotals[period.period] || 0;
    });
    
    totalsRow['Total'] = grandTotal;
    exportData.push(totalsRow);
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Supplier Grade Wise Yearly');
    
    // Generate filename
    const filename = `supplier_grade_wise_yearly_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Export
    XLSX.writeFile(wb, filename);
  };

  // Download as PDF
  const downloadPDF = async () => {
    if (calculatedRows.length === 0) return;
    
    // Dynamically import jsPDF only when needed
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default || jsPDFModule;
    const doc = new jsPDF();
    
    // Add company name
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Polymetalz', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'normal');
    doc.text('Supplier Grade Wise Yearly Report', 14, 35);
    
    // Add filters info
    doc.setFontSize(10);
    let yPos = 45;
    
    if (selectedSupplier) {
      doc.text(`Supplier: ${selectedSupplier}`, 14, yPos);
      yPos += 5;
    }
    if (selectedType) {
      doc.text(`Type: ${selectedType}`, 14, yPos);
      yPos += 5;
    }
    if (selectedGrade) {
      doc.text(`Grade: ${selectedGrade}`, 14, yPos);
      yPos += 5;
    }
    
    yPos += 5;
    
    // Format currency function
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };
    
    // Prepare table data with formatted currency
    const tableData = calculatedRows.map((row, index) => [
      index + 1,
      row.supplier,
      row.materialType,
      row.gradeName || '',
      ...periods.map(period => {
        const value = row.values[period.period] || 0;
        return value === 0 ? '0' : formatForDownload(value);
      }),
      formatForDownload(row.total)
    ]);
    
    // Add totals row with formatted currency
    const totalsRow = [
      '', '', 'COLUMN TOTALS', '',
      ...periods.map(period => {
        const value = columnTotals[period.period] || 0;
        return value === 0 ? '0' : formatForDownload(value);
      }),
      formatForDownload(grandTotal)
    ];
    tableData.push(totalsRow);
    
    // Prepare column headers
    const headers = [
      ['Sl.No', 'Supplier', 'Grade', 'Actual Grade Name',
       ...periods.map(period => period.period),
       'Total']
    ];
    
    // Generate table
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: yPos + 10,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [243, 244, 246]
      }
    });
    
    // Save PDF
    doc.save(`supplier_grade_wise_yearly_${new Date().toISOString().split('T')[0]}.pdf`);
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
          📊 Supplier Grade Wise Yearly Report
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
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
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
              {dataFetched && calculatedRows.length > 0 && (
                <>
                  <button
                    onClick={downloadExcel}
                    className="w-full sm:w-auto px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-md flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Excel
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="w-full sm:w-auto px-4 py-2 text-sm bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition shadow-md flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filter Requirement Selector */}
          <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
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
                All 3 Filters Required
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
            {requiredFilters === 3 && ' All three filters must be selected.'}
            {requiredFilters === 2 && ' At least two filters must be selected.'}
            {requiredFilters === 1 && ' At least one filter must be selected.'}
            <span className="block mt-1 text-green-700 font-medium">🔥 Zero Firebase reads until you click the button!</span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Supplier {selectedSupplier && <span className="text-green-600">✓</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  placeholder="Search suppliers..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-t-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                />
                <select
                  value={selectedSupplier}
                  onChange={(e) => handleFilterChange('supplier', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white border-t-0"
                >
                  <option value="">-- Select Supplier --</option>
                  {filteredSuppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.supplierName}>
                      {supplier.supplierName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📋 Type {selectedType && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={selectedType}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- Select Type --</option>
                {types.map(type => (
                  <option key={type.id} value={type.type}>
                    {type.type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <SearchableDropdown
                options={allGrades.map(grade => ({ id: grade, name: grade }))}
                value={selectedGrade}
                onChange={(value) => handleFilterChange('grade', value)}
                placeholder="-- Select Grade --"
                label="🏷️ Grade"
              />
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
            <div className="text-6xl mb-4">📅</div>
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

            <div className="bg-white shadow-lg overflow-hidden border border-gray-300">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 w-16">Sl.No</th>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[180px]">Supplier</th>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[160px]">Grade</th>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[200px]">Actual Grade Name</th>
                      {periods.map(period => (
                        <th key={period.id} className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[100px]">
                          {period.period}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[110px]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((row, index) => (
                      <tr
                        key={`${row.supplier}-${row.materialType}-${index}`}
                        className="border-b border-gray-300 hover:bg-blue-50 transition"
                      >
                        <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 font-medium border border-gray-300">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 border border-gray-300">{row.supplier}</td>
                        <td className="px-3 py-3 text-xs sm:text-sm text-center border border-gray-300">
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                            {row.materialType}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 border border-gray-300 font-medium">
                          {row.gradeName || '—'}
                        </td>
                        {periods.map(period => (
                          <td key={period.id} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 border border-gray-300">
                            {(row.values[period.period] || 0) === 0 
                              ? '—' 
                              : formatCurrency(row.values[period.period] || 0)
                            }
                          </td>
                        ))}
                        <td className="px-3 py-3 text-xs sm:text-sm text-center font-semibold text-blue-700 border border-gray-300">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Column Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-100 to-indigo-200 border-t-4 border-blue-600 font-bold">
                      <td colSpan={3} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                        📊 COLUMN TOTALS
                      </td>
                      <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                        —
                      </td>
                      {periods.map(period => (
                        <td key={period.id} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                          {(columnTotals[period.period] || 0) === 0 
                            ? '—' 
                            : formatCurrency(columnTotals[period.period] || 0)
                          }
                        </td>
                      ))}
                      <td className="px-3 py-3 text-xs sm:text-sm text-center text-blue-700 font-bold text-base border border-gray-400">
                        {(columnTotals.total || 0).toFixed(2)}
                      </td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr className="bg-gradient-to-r from-green-100 to-green-200 border-t-4 border-green-600 font-bold">
                      <td colSpan={4} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                        💰 GRAND TOTAL
                      </td>
                      <td colSpan={periods.length + 1} className="px-3 py-3 text-sm sm:text-base text-center text-green-800 font-bold border border-gray-400">
                        {formatCurrency(grandTotal)}
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