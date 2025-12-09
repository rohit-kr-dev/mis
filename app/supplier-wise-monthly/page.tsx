'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
        
        // Extract unique companies
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
    });
    return () => unsubscribe();
  }, [selectedMonth, selectedSupplier, selectedCompany]);

  // VLOOKUP function
  const vlookupType = (company: string): string => {
    if (!company.trim()) return '';
    const item = items.find(i => i.company.toLowerCase() === company.toLowerCase());
    return item?.materialType || 'Unknown';
  };

  // Add company and generate all combinations
  const addCompany = async () => {
    if (!newCompanyName.trim()) {
      alert('Please enter a company name');
      return;
    }

    // Check if company already exists
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
      const totalCombinations = periods.length * suppliers.length;
      let successCount = 0;

      // Generate all combinations: Company (1) × Periods × Suppliers
      for (const period of periods) {
        for (const supplier of suppliers) {
          const type = vlookupType(companyName);

          // Calculate values for this combination
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

          // Store each combination in Firestore
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

          successCount++;
        }
      }

      setNewCompanyName('');
      alert(`Company added successfully! Generated ${successCount} combinations (${periods.length} periods × ${suppliers.length} suppliers)`);
    } catch (error) {
      console.error('Error adding company:', error);
      alert('Failed to add company and generate combinations');
    }
    setSaving(false);
  };

  // Delete single record
  const deleteCompanyRow = async (rowId: string, companyName: string) => {
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
    if (!confirm(`Are you sure you want to delete ALL records for "${companyName}"? This will remove all combinations across all periods and suppliers.`)) return;

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

  // Clear all filters
  const clearFilters = () => {
    setSelectedMonth('');
    setSelectedSupplier('');
    setSelectedCompany('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Supplier Wise Monthly Report
      </h1>

      {/* Add Company Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Company</h2>
        <p className="text-sm text-gray-600 mb-4">
          Total combinations: <span className="font-bold text-blue-600">{periods.length} periods × {suppliers.length} suppliers = {periods.length * suppliers.length} records</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            placeholder="Enter company name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && addCompany()}
          />
          <button
            onClick={addCompany}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {saving ? 'Generating...' : '+ Add Company & Generate'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Filter Records</h2>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
          >
            Clear All Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              Select Supplier
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              Select Company
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-red-800">Delete Company Records</h3>
              <p className="text-xs text-red-600 mt-1">
                Remove all records for "{selectedCompany}" across all periods and suppliers
              </p>
            </div>
            <button
              onClick={() => deleteAllCompanyRecords(selectedCompany)}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition"
            >
              Delete All Records
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {savedRows.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">
            {!selectedMonth && !selectedSupplier && !selectedCompany 
              ? 'Add a company above to generate records, then use filters to view them.'
              : 'No records found for the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Month</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Discounts</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Outright with Discounts</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Outright</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">{row.month}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.supplier}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.company}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {row.discounts.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {row.outrightWithDiscounts.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {row.outright.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {row.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteCompanyRow(row.id, row.company)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* Column Totals Row */}
                <tr className="bg-blue-50 border-t-2 border-blue-600 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-sm text-gray-900">
                    COLUMN TOTALS
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {columnTotals.discounts.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {columnTotals.outrightWithDiscounts.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {columnTotals.outright.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600">
                    {columnTotals.total.toFixed(2)}
                  </td>
                  <td></td>
                </tr>

                {/* Grand Total Row */}
                <tr className="bg-green-50 border-t-2 border-green-600 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-sm text-gray-900">
                    GRAND TOTAL
                  </td>
                  <td colSpan={4} className="px-4 py-3 text-sm text-right text-green-700 text-lg">
                    {grandTotal.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}