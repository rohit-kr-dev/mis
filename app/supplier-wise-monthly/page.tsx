'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2, Plus, X } from 'lucide-react';

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
}

interface Item {
  id: string;
  itemName: string;
  company: string;
  materialType: string;
}

interface SavedCompanyRow {
  id: string;
  month: string;
  supplier: string;
  type: string;
  company: string;
  discounts: number;
  outrightWithDiscounts: number;
  outright: number;
  total: number;
  createdAt: any;
}

export default function SupplierWiseMonthly() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [workingSheet, setWorkingSheet] = useState<WorkingSheetRecord[]>([]);
  const [savedRows, setSavedRows] = useState<SavedCompanyRow[]>([]);
  const [allCompanies, setAllCompanies] = useState<string[]>([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newCompanyName, setNewCompanyName] = useState('');
  const [bulkCompanyNames, setBulkCompanyNames] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

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
          supplierName: doc.data().supplierName
        }));
        setSuppliers(data);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch periods
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'periods'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          period: doc.data().period
        }));
        setPeriods(data);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch items
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            itemName: docData.itemName || '',
            company: docData.company || '',
            materialType: docData.materialType || ''
          };
        });
        setItems(data);
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
            supplierName: docData.supplierName || '',
            company: docData.company || '',
            type: docData.type || '',
            qty: docData.qty || 0,
            cnMonth: docData.cnMonth || ''
          };
        });
        setWorkingSheet(data);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch all saved rows and extract unique companies
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'supplierWiseMonthly'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SavedCompanyRow));
        
        const uniqueCompanies = [...new Set(data.map(row => row.company))].sort();
        setAllCompanies(uniqueCompanies);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch filtered saved rows
  useEffect(() => {
    if (!selectedMonth && !selectedSupplier && !selectedCompany) {
      setSavedRows([]);
      return;
    }

    const constraints = [];
    if (selectedMonth) constraints.push(where('month', '==', selectedMonth));
    if (selectedSupplier) constraints.push(where('supplier', '==', selectedSupplier));
    if (selectedCompany) constraints.push(where('company', '==', selectedCompany));

    const q = query(collection(db, 'supplierWiseMonthly'), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SavedCompanyRow));
      setSavedRows(data);
      setCurrentPage(1); // Reset to first page when filters change
    });
    return () => unsubscribe();
  }, [selectedMonth, selectedSupplier, selectedCompany]);

  // VLOOKUP function
  const vlookupType = (company: string): string => {
    if (!company.trim()) return '';
    const item = items.find(i => i.company.toLowerCase() === company.toLowerCase());
    return item?.materialType || 'Unknown';
  };

  // Add company and generate combinations (only if values > 0)
  const addCompany = async () => {
    if (!newCompanyName.trim()) {
      alert('Please enter a company name');
      return;
    }

    const q = query(
      collection(db, 'supplierWiseMonthly'),
      where('company', '==', newCompanyName.trim())
    );
    const existingDocs = await getDocs(q);
    
    if (!existingDocs.empty) {
      alert('This company already has records. Delete existing records first if you want to regenerate.');
      return;
    }

    setSaving(true);
    try {
      const companyName = newCompanyName.trim();
      await generateCombinationsForCompany(companyName);
      setNewCompanyName('');
      alert(`Company added successfully!`);
    } catch (error) {
      console.error('Error adding company:', error);
      alert('Failed to add company and generate combinations');
    }
    setSaving(false);
  };

  // Bulk add companies
  const bulkAddCompanies = async () => {
    if (!bulkCompanyNames.trim()) {
      alert('Please enter company names (one per line)');
      return;
    }

    const companyList = bulkCompanyNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (companyList.length === 0) {
      alert('No valid company names found');
      return;
    }

    const existingCompanies = [];
    for (const company of companyList) {
      const q = query(
        collection(db, 'supplierWiseMonthly'),
        where('company', '==', company)
      );
      const existingDocs = await getDocs(q);
      if (!existingDocs.empty) {
        existingCompanies.push(company);
      }
    }

    if (existingCompanies.length > 0) {
      const proceed = confirm(
        `The following companies already exist:\n${existingCompanies.join('\n')}\n\nDo you want to skip these and continue with the rest?`
      );
      if (!proceed) return;
    }

    setSaving(true);
    let successCount = 0;
    let failedCompanies = [];

    try {
      for (const companyName of companyList) {
        if (existingCompanies.includes(companyName)) continue;

        try {
          await generateCombinationsForCompany(companyName);
          successCount++;
        } catch (error) {
          console.error(`Failed to add ${companyName}:`, error);
          failedCompanies.push(companyName);
        }
      }

      setBulkCompanyNames('');
      setShowBulkAdd(false);

      let message = `Successfully added ${successCount} companies!`;
      if (failedCompanies.length > 0) {
        message += `\n\nFailed to add: ${failedCompanies.join(', ')}`;
      }
      if (existingCompanies.length > 0) {
        message += `\n\nSkipped existing: ${existingCompanies.join(', ')}`;
      }
      alert(message);
    } catch (error) {
      console.error('Error in bulk add:', error);
      alert('Failed to complete bulk add operation');
    }
    setSaving(false);
  };

  // Helper function to generate combinations for a single company (only if total > 0)
  const generateCombinationsForCompany = async (companyName: string) => {
    for (const period of periods) {
      for (const supplier of suppliers) {
        const type = vlookupType(companyName);

        const discounts = workingSheet
          .filter(record => 
            record.supplierName === supplier.supplierName &&
            record.company.toLowerCase() === companyName.toLowerCase() &&
            record.type === 'Discounts' &&
            record.cnMonth === period.period
          )
          .reduce((sum, record) => sum + record.qty, 0);

        const outrightWithDiscounts = workingSheet
          .filter(record => 
            record.supplierName === supplier.supplierName &&
            record.company.toLowerCase() === companyName.toLowerCase() &&
            record.type === 'Outright with Discounts' &&
            record.cnMonth === period.period
          )
          .reduce((sum, record) => sum + record.qty, 0);

        const outright = workingSheet
          .filter(record => 
            record.supplierName === supplier.supplierName &&
            record.company.toLowerCase() === companyName.toLowerCase() &&
            record.type === 'Outright' &&
            record.cnMonth === period.period
          )
          .reduce((sum, record) => sum + record.qty, 0);

        const total = discounts + outrightWithDiscounts + outright;

        // Only create record if total > 0
        if (total > 0) {
          await addDoc(collection(db, 'supplierWiseMonthly'), {
            month: period.period,
            supplier: supplier.supplierName,
            type: type,
            company: companyName,
            discounts: discounts,
            outrightWithDiscounts: outrightWithDiscounts,
            outright: outright,
            total: total,
            createdAt: new Date()
          });
        }
      }
    }
  };

  // Delete single record
  const deleteCompanyRow = async (rowId: string) => {
    if (!confirm(`Delete this record?`)) return;

    try {
      await deleteDoc(doc(db, 'supplierWiseMonthly', rowId));
    } catch (error) {
      console.error('Error deleting row:', error);
      alert('Failed to delete row');
    }
  };

  // Delete all records for a company
  const deleteAllCompanyRecords = async (companyName: string) => {
    if (!confirm(`Are you sure you want to delete ALL records for "${companyName}"?`)) return;

    try {
      const q = query(
        collection(db, 'supplierWiseMonthly'),
        where('company', '==', companyName)
      );
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      alert(`Successfully deleted ${snapshot.docs.length} records for "${companyName}"`);
    } catch (error) {
      console.error('Error deleting company records:', error);
      alert('Failed to delete company records');
    }
  };

  // Calculate column totals
  const columnTotals = useMemo(() => {
    return savedRows.reduce(
      (acc, row) => ({
        discounts: acc.discounts + row.discounts,
        outrightWithDiscounts: acc.outrightWithDiscounts + row.outrightWithDiscounts,
        outright: acc.outright + row.outright,
        total: acc.total + row.total
      }),
      { discounts: 0, outrightWithDiscounts: 0, outright: 0, total: 0 }
    );
  }, [savedRows]);

  // Grand Total
  const grandTotal = useMemo(() => {
    return columnTotals.discounts + columnTotals.outrightWithDiscounts + columnTotals.outright;
  }, [columnTotals]);

  // Pagination calculations
  const totalPages = Math.ceil(savedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = savedRows.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedMonth('');
    setSelectedSupplier('');
    setSelectedCompany('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700 font-medium">Loading data...</div>
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

        {/* Add Company Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">➕ Add Companies</h2>
            <button
              onClick={() => setShowBulkAdd(!showBulkAdd)}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm rounded-lg hover:from-purple-700 hover:to-purple-800 transition shadow-md"
            >
              {showBulkAdd ? '📝 Single Mode' : '📋 Bulk Mode'}
            </button>
          </div>
        
          <p className="text-xs sm:text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
            💡 <span className="font-semibold">Note:</span> Only records with values <span className="font-bold text-blue-600">&gt; 0</span> will be created
          </p>

          {!showBulkAdd ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Enter company name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                onKeyPress={(e) => e.key === 'Enter' && addCompany()}
              />
              <button
                onClick={addCompany}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:bg-gray-400 shadow-md font-medium"
              >
                {saving ? '⏳ Generating...' : '✚ Add Company'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter company names (one per line):
                </label>
                <textarea
                  value={bulkCompanyNames}
                  onChange={(e) => setBulkCompanyNames(e.target.value)}
                  placeholder="Company 1&#10;Company 2&#10;Company 3&#10;..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                  📊 {bulkCompanyNames.split('\n').filter(name => name.trim().length > 0).length} companies entered
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={bulkAddCompanies}
                  disabled={saving}
                  className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition disabled:bg-gray-400 shadow-md font-medium"
                >
                  {saving ? '⏳ Processing...' : `✚ Add ${bulkCompanyNames.split('\n').filter(name => name.trim().length > 0).length} Companies`}
                </button>
                <button
                  onClick={() => setBulkCompanyNames('')}
                  className="w-full sm:w-auto px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition shadow-md font-medium"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">🔍 Filter Records</h2>
            <button
              onClick={clearFilters}
              className="w-full sm:w-auto px-4 py-2 text-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition shadow-md"
            >
              ✖️ Clear Filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Months --</option>
                {periods.map(period => (
                  <option key={period.id} value={period.period}>
                    {period.period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Supplier
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
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
                🏭 Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
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

        {/* Delete Company Records */}
        {selectedCompany && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-4 mb-4 sm:mb-6 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Company Records
                </h3>
                <p className="text-xs text-red-600 mt-1">
                  Remove all records for "<span className="font-semibold">{selectedCompany}</span>"
                </p>
              </div>
              <button
                onClick={() => deleteAllCompanyRecords(selectedCompany)}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm rounded-lg hover:from-red-700 hover:to-red-800 transition shadow-md font-medium"
              >
                🗑️ Delete All
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {savedRows.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500 text-base sm:text-lg">
              {!selectedMonth && !selectedSupplier && !selectedCompany 
                ? '➕ Add a company above to generate records, then use filters to view them.'
                : '🔍 No records found for the selected filters.'}
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
                📊 Showing {startIndex + 1}-{Math.min(endIndex, savedRows.length)} of {savedRows.length} records
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
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold">Discounts</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold">Outright w/ Disc</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold">Outright</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold">Total</th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((row, index) => (
                      <tr
                        key={row.id}
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
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-700">
                          {row.discounts === 0 ? '—' : row.discounts.toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-700">
                          {row.outrightWithDiscounts === 0 ? '—' : row.outrightWithDiscounts.toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-700">
                          {row.outright === 0 ? '—' : row.outright.toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right font-semibold text-blue-700">
                          {row.total.toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <button
                            onClick={() => deleteCompanyRow(row.id)}
                            className="p-1.5 sm:p-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition shadow-md"
                            title="Delete record"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Column Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-100 to-blue-200 border-t-4 border-blue-600 font-bold">
                      <td colSpan={5} className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">
                        📊 COLUMN TOTALS
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-900">
                        {columnTotals.discounts === 0 ? '—' : columnTotals.discounts.toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-900">
                        {columnTotals.outrightWithDiscounts === 0 ? '—' : columnTotals.outrightWithDiscounts.toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-900">
                        {columnTotals.outright === 0 ? '—' : columnTotals.outright.toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-right text-blue-700 font-bold text-base">
                        {columnTotals.total.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr className="bg-gradient-to-r from-green-100 to-green-200 border-t-4 border-green-600 font-bold">
                      <td colSpan={5} className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">
                        💰 GRAND TOTAL
                      </td>
                      <td colSpan={4} className="px-2 sm:px-4 py-3 text-xs sm:text-base text-right text-green-800 font-bold">
                        {grandTotal.toFixed(2)}
                      </td>
                      <td></td>
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