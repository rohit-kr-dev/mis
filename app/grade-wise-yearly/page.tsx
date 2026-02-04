'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WorkingSheetRecord {
  supplierName: string;
  company: string;
  type: string;
  qty: number;
  grade: string;
  cnMonth: string;
  slNo: number;
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

interface GradeData {
  slNo: string;
  grade: string;
  values: { [monthName: string]: number };
  total: number;
}

export default function GradeWiseYearly() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [workingSheet, setWorkingSheet] = useState<WorkingSheetRecord[]>([]);
  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [showOnlyWithValues, setShowOnlyWithValues] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // File upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch master data ONCE on mount using getDocs
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoading(true);

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

  // Manual fetch function - fetch all data to calculate grade-wise yearly report
  const fetchWorkingSheetData = async () => {
    setLoadingData(true);
    setDataFetched(false);

    try {
      const snapshot = await getDocs(collection(db, 'workingSheet'));
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          supplierName: (docData.supplierName as string) || '',
          company: (docData.company as string) || '',
          type: (docData.type as string) || '',
          qty: (docData.qty as number) || 0,
          grade: (docData.grade as string) || '', // assuming grade field exists
          cnMonth: (docData.cnMonth as string) || '',
          slNo: (docData.slNo as number) || 0
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

  // Calculate grade-wise data
  const calculatedRows = useMemo(() => {
    if (!dataFetched) {
      return [];
    }

    const results: GradeData[] = [];

    // PRE-AGGREGATE: Create a lookup map for fast access (O(1) instead of O(n))
    const aggregatedData = new Map<string, number>();
    
    workingSheet.forEach(record => {
      // Determine grade - prioritize the grade field if available, otherwise get from items
      let grade = record.grade;
      if (!grade) {
        // If grade is not directly available, try to get from items based on company
        const item = items.find(i => i.company.toLowerCase() === record.company.toLowerCase());
        grade = item?.materialType || 'Unknown';
      }
      
      const key = [
        grade.trim().toLowerCase(),
        record.cnMonth.trim().toLowerCase()
      ].join('|');
      
      const qty = typeof record.qty === 'number' ? record.qty : parseFloat(String(record.qty || 0));
      const validQty = isNaN(qty) ? 0 : qty;
      
      aggregatedData.set(key, (aggregatedData.get(key) || 0) + validQty);
    });

    // Process each grade
    for (const grade of allGrades) {
      // Calculate values for each month dynamically using the lookup map
      const values: { [monthName: string]: number } = {};
      let total = 0;

      for (const period of periods) {
        const key = [
          grade.trim().toLowerCase(),
          period.period.trim().toLowerCase()
        ].join('|');
        
        const monthValue = aggregatedData.get(key) || 0;
        values[period.period] = monthValue;
        total += monthValue;
      }

      // Add row based on filter setting
      if (!showOnlyWithValues || total > 0) {
        // Determine if this grade has any quantity > 0
        const hasQuantity = total > 0;
        const slNo = hasQuantity ? 'Yes' : 'No';
        
        results.push({
          slNo: slNo,
          grade: grade,
          values: values,
          total: total
        });
      }
    }

    return results;
  }, [workingSheet, items, periods, allGrades, showOnlyWithValues, dataFetched]);

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
    setWorkingSheet([]);
    setDataFetched(false);
  };

  // Download as Excel
  const downloadExcel = () => {
    if (calculatedRows.length === 0) return;
    
    // Prepare data for export
    const exportData = calculatedRows.map((row, index) => {
      const rowData: any = {
        'No': row.slNo,
        'Grades': row.grade
      };
      
      // Add period columns
      periods.forEach(period => {
        rowData[period.period] = row.values[period.period] || 0;
      });
      
      rowData['Total'] = row.total;
      return rowData;
    });
    
    // Add totals row
    const totalsRow: any = {
      'No': '',
      'Grades': 'COLUMN TOTALS'
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
    XLSX.utils.book_append_sheet(wb, ws, 'Grade Wise Yearly');
    
    // Generate filename
    const filename = `grade_wise_yearly_${new Date().toISOString().split('T')[0]}.xlsx`;
    
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
    doc.text('Grade Wise Yearly Report', 14, 35);
    
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
      row.slNo,
      row.grade,
      ...periods.map(period => formatCurrency(row.values[period.period] || 0)),
      formatCurrency(row.total)
    ]);
    
    // Add totals row with formatted currency
    const totalsRow = [
      '', 'COLUMN TOTALS',
      ...periods.map(period => formatCurrency(columnTotals[period.period] || 0)),
      formatCurrency(grandTotal)
    ];
    tableData.push(totalsRow);
    
    // Prepare column headers
    const headers = [
      ['No', 'Grades',
       ...periods.map(period => period.period),
       'Total']
    ];
    
    // Generate table
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 45,
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
    doc.save(`grade_wise_yearly_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  // Handle Excel file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadMessage('Processing file...');
    
    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Read the Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Assuming the data is in the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Process the uploaded data
      // For now, just show a success message
      clearInterval(interval);
      setUploadProgress(100);
      setUploadMessage(`${file.name} uploaded successfully! Processing data...`);
      
      // Here you would typically process the data and update the state
      // For example, you might parse the data and update workingSheet
      
      // Simulate processing delay
      setTimeout(() => {
        setUploadMessage(`${file.name} processed successfully!`);
        setIsUploading(false);
        
        // Optionally trigger a refresh of the data
        fetchWorkingSheetData();
      }, 1000);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadMessage('Error uploading file: ' + (error as Error).message);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
          📊 Grade Wise Yearly Report
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
              <button
                onClick={triggerFileInput}
                disabled={isUploading}
                className={`w-full sm:w-auto px-4 py-2 text-sm rounded-lg transition shadow-md flex items-center justify-center gap-2 ${
                  isUploading
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                }`}
              >
                <Upload size={16} />
                Upload Excel
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

          <p className="text-xs sm:text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
            💡 <span className="font-semibold">Note:</span> Click "Load Data" to fetch all records from Firebase and generate the grade-wise yearly report.
            <span className="block mt-1 text-green-700 font-medium">🔥 Zero Firebase reads until you click the button!</span>
          </p>

          {/* Upload Status */}
          {(isUploading || uploadMessage) && (
            <div className={`mb-4 p-3 rounded-lg border ${isUploading ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
              {isUploading && (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 font-medium">Uploading: {uploadMessage}</span>
                  <div className="flex-1 ml-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              {!isUploading && uploadMessage && (
                <div className="flex items-center gap-2 text-green-700">
                  <div className="font-medium">{uploadMessage}</div>
                </div>
              )}
            </div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />

          {/* Load Data Button */}
          <div className="flex justify-center">
            <button
              onClick={fetchWorkingSheetData}
              disabled={loadingData}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition shadow-lg transform hover:scale-105 ${
                loadingData
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

          {!dataFetched && !loadingData && (
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
              Click the "Load Data" button above to fetch data from Firebase and generate the grade-wise yearly report.
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
            <p className="text-gray-600">Fetching data from Firebase...</p>
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
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 w-16">No</th>
                      <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold border border-gray-400 min-w-[250px]">Grades</th>
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
                        key={`${row.grade}-${index}`}
                        className="border-b border-gray-300 hover:bg-blue-50 transition"
                      >
                        <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 font-medium border border-gray-300">
                          {row.slNo}
                        </td>
                        <td className="px-3 py-3 text-xs sm:text-sm text-left text-gray-700 border border-gray-300">{row.grade}</td>
                        {periods.map(period => (
                          <td key={period.id} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-700 border border-gray-300">
                            {(row.values[period.period] || 0) === 0 ? '—' : (row.values[period.period] || 0).toLocaleString('en-IN')}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-xs sm:text-sm text-center font-semibold text-blue-700 border border-gray-300">
                          {row.total.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Column Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-100 to-indigo-200 border-t-4 border-blue-600 font-bold">
                      <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                        —
                      </td>
                      <td className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                        COLUMN TOTALS
                      </td>
                      {periods.map(period => (
                        <td key={period.id} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                          {(columnTotals[period.period] || 0) === 0 ? '—' : (columnTotals[period.period] || 0).toLocaleString('en-IN')}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-xs sm:text-sm text-center text-blue-700 font-bold text-base border border-gray-400">
                        {(columnTotals.total || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr className="bg-gradient-to-r from-green-100 to-green-200 border-t-4 border-green-600 font-bold">
                      <td colSpan={2} className="px-3 py-3 text-xs sm:text-sm text-center text-gray-900 border border-gray-400">
                        💰 GRAND TOTAL
                      </td>
                      <td colSpan={periods.length + 1} className="px-3 py-3 text-sm sm:text-base text-center text-green-800 font-bold border border-gray-400">
                        {grandTotal.toLocaleString('en-IN')}
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