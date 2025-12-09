"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';

interface Vendor {
  id: string;
  vendorName: string;
  totalAmount: number;
  createdAt: any;
  updatedAt: any;
}

interface PeriodData {
  id: string;
  vendorId: string;
  period: string;
  amount: number;
  updatedAt: any;
}

interface Period {
  id: string;
  period: string;
}

export default function AsPerZohoPage() {
  // State for data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  // State for filters
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  // State for add vendor form
  const [newVendorName, setNewVendorName] = useState('');
  const [addVendorMessage, setAddVendorMessage] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);

  // State for row editing mode
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [rowChanges, setRowChanges] = useState<Map<string, string>>(new Map());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Quick add mode
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [quickAddVendor, setQuickAddVendor] = useState<string>('');

  // Real-time subscription to vendorList collection
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'vendorList'),
      (snapshot) => {
        const data: Vendor[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Vendor);
        });
        setVendors(data.sort((a, b) => a.vendorName.localeCompare(b.vendorName)));
      },
      (error) => console.error('Error fetching vendors:', error)
    );
    return () => unsubscribe();
  }, []);

  // Real-time subscription to all vendor period subcollections
  useEffect(() => {
    if (vendors.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    vendors.forEach((vendor) => {
      const periodsRef = collection(db, 'vendorList', vendor.id, 'periods');
      const unsubscribe = onSnapshot(
        periodsRef,
        (snapshot) => {
          const data: PeriodData[] = [];
          snapshot.forEach((doc) => {
            data.push({ 
              id: doc.id, 
              vendorId: vendor.id,
              ...doc.data() 
            } as PeriodData);
          });
          
          setPeriodData(prev => {
            const filtered = prev.filter(p => p.vendorId !== vendor.id);
            return [...filtered, ...data];
          });
        },
        (error) => console.error('Error fetching period data:', error)
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [vendors]);

  // Real-time subscription to periods collection
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'periods'),
      (snapshot) => {
        const data: Period[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Period);
        });
        
        // Sort periods chronologically (MMM-YY format)
        data.sort((a, b) => {
          const parseDate = (periodStr: string) => {
            const [month, year] = periodStr.split('-');
            const monthMap: { [key: string]: number } = {
              'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
              'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            return new Date(2000 + parseInt(year), monthMap[month] || 0);
          };
          return parseDate(a.period).getTime() - parseDate(b.period).getTime();
        });
        
        setPeriods(data);
      },
      (error) => console.error('Error fetching periods:', error)
    );
    return () => unsubscribe();
  }, []);

  // Filter vendors and periods
  const filteredVendors = useMemo(() => {
    if (!selectedVendor) return vendors;
    return vendors.filter(v => v.vendorName === selectedVendor);
  }, [vendors, selectedVendor]);

  const filteredPeriods = useMemo(() => {
    if (!selectedPeriod) return periods;
    return periods.filter(p => p.period === selectedPeriod);
  }, [periods, selectedPeriod]);

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredVendors.slice(startIndex, endIndex);
  }, [filteredVendors, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedVendor, selectedPeriod, itemsPerPage]);

  // Get cell value for vendor + period
  const getCellValue = (vendorId: string, period: string): number => {
    const cell = periodData.find(
      d => d.vendorId === vendorId && d.period === period
    );
    return cell ? cell.amount : 0;
  };

  // Get period document ID
  const getPeriodDocId = (vendorId: string, period: string): string | null => {
    const cell = periodData.find(
      d => d.vendorId === vendorId && d.period === period
    );
    return cell ? cell.id : null;
  };

  // Calculate row total
  const getRowTotal = (vendorId: string): number => {
    return filteredPeriods.reduce((sum, period) => {
      const key = `${vendorId}-${period.period}`;
      if (editingRows.has(vendorId) && rowChanges.has(key)) {
        const val = rowChanges.get(key);
        return sum + (val && val !== '' ? parseFloat(val) : 0);
      }
      return sum + getCellValue(vendorId, period.period);
    }, 0);
  };

  // Calculate column total
  const getColumnTotal = (period: string): number => {
    return paginatedVendors.reduce((sum, vendor) => {
      const key = `${vendor.id}-${period}`;
      if (editingRows.has(vendor.id) && rowChanges.has(key)) {
        const val = rowChanges.get(key);
        return sum + (val && val !== '' ? parseFloat(val) : 0);
      }
      return sum + getCellValue(vendor.id, period);
    }, 0);
  };

  // Calculate overall total
  const overallTotal = useMemo(() => {
    return paginatedVendors.reduce((sum, vendor) => {
      return sum + getRowTotal(vendor.id);
    }, 0);
  }, [paginatedVendors, filteredPeriods, periodData, editingRows, rowChanges]);

  // Handle add vendor
  const handleAddVendor = async () => {
    if (!newVendorName.trim()) {
      setAddVendorMessage('Please enter vendor name');
      setTimeout(() => setAddVendorMessage(''), 3000);
      return;
    }

    if (vendors.some(v => v.vendorName === newVendorName.trim())) {
      setAddVendorMessage('Vendor already exists');
      setTimeout(() => setAddVendorMessage(''), 3000);
      return;
    }

    setAddingVendor(true);

    try {
      await addDoc(collection(db, 'vendorList'), {
        vendorName: newVendorName.trim(),
        totalAmount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setAddVendorMessage('Vendor added successfully!');
      setNewVendorName('');
      setTimeout(() => setAddVendorMessage(''), 3000);
    } catch (error) {
      console.error('Error adding vendor:', error);
      setAddVendorMessage('Error adding vendor');
      setTimeout(() => setAddVendorMessage(''), 3000);
    } finally {
      setAddingVendor(false);
    }
  };

  // Toggle row editing mode
  const toggleRowEdit = (vendorId: string) => {
    const newEditingRows = new Set(editingRows);
    if (newEditingRows.has(vendorId)) {
      newEditingRows.delete(vendorId);
      const newRowChanges = new Map(rowChanges);
      filteredPeriods.forEach(period => {
        newRowChanges.delete(`${vendorId}-${period.period}`);
      });
      setRowChanges(newRowChanges);
    } else {
      newEditingRows.add(vendorId);
      const newRowChanges = new Map(rowChanges);
      filteredPeriods.forEach(period => {
        const key = `${vendorId}-${period.period}`;
        const currentVal = getCellValue(vendorId, period.period);
        newRowChanges.set(key, currentVal === 0 ? '' : currentVal.toString());
      });
      setRowChanges(newRowChanges);
    }
    setEditingRows(newEditingRows);
  };

  // Update row change
  const updateRowChange = (vendorId: string, period: string, value: string) => {
    const key = `${vendorId}-${period}`;
    const newRowChanges = new Map(rowChanges);
    newRowChanges.set(key, value);
    setRowChanges(newRowChanges);
  };

  // Save entire row
  const handleSaveRow = async (vendorId: string) => {
    try {
      const promises = filteredPeriods.map(async (period) => {
        const key = `${vendorId}-${period.period}`;
        const value = rowChanges.get(key);
        
        if (value === undefined) return;
        
        const amount = value === '' ? 0 : parseFloat(value) || 0;
        const periodDocId = getPeriodDocId(vendorId, period.period);

        if (periodDocId) {
          await updateDoc(doc(db, 'vendorList', vendorId, 'periods', periodDocId), {
            amount,
            updatedAt: serverTimestamp(),
          });
        } else if (amount !== 0) {
          await addDoc(collection(db, 'vendorList', vendorId, 'periods'), {
            period: period.period,
            amount,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      await Promise.all(promises);

      setTimeout(async () => {
        try {
          const periodsRef = collection(db, 'vendorList', vendorId, 'periods');
          const snapshot = await getDocs(periodsRef);
          
          let totalAmount = 0;
          snapshot.forEach((doc) => {
            const data = doc.data();
            totalAmount += data.amount || 0;
          });

          await updateDoc(doc(db, 'vendorList', vendorId), {
            totalAmount: totalAmount,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.error('Error updating total amount:', error);
        }
      }, 500);

      toggleRowEdit(vendorId);
    } catch (error) {
      console.error('Error saving row:', error);
    }
  };

  // Delete vendor
  const handleDeleteVendor = async (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (!confirm(`Delete vendor "${vendor?.vendorName}" and all its period data?`)) return;

    try {
      const periodsRef = collection(db, 'vendorList', vendorId, 'periods');
      const snapshot = await getDocs(periodsRef);
      
      const deletePromises = snapshot.docs.map(document => 
        deleteDoc(doc(db, 'vendorList', vendorId, 'periods', document.id))
      );
      
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'vendorList', vendorId));
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedVendor('');
    setSelectedPeriod('');
  };

  // Quick add functionality
  const handleQuickAdd = () => {
    if (quickAddVendor) {
      const vendor = vendors.find(v => v.id === quickAddVendor);
      if (vendor) {
        toggleRowEdit(vendor.id);
        setQuickAddMode(false);
        setQuickAddVendor('');
      }
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        document.getElementById('newVendor')?.focus();
      }
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        setQuickAddMode(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 pb-20">
      <div className="max-w-full mx-auto" style={{ maxWidth: 'calc(100vw - 280px)' }}>
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">As Per Zoho</h1>
              <p className="text-gray-600 mt-2">Vendor payment tracking with period-wise breakdown</p>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <div>💡 <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+N</kbd> New Vendor</div>
              <div>💡 <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+Q</kbd> Quick Add</div>
            </div>
          </div>
        </div>

        {/* Quick Add Modal */}
        {quickAddMode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96">
              <h3 className="text-xl font-semibold mb-4">Quick Add Entry</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor</label>
                  <select
                    value={quickAddVendor}
                    onChange={(e) => setQuickAddVendor(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.vendorName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleQuickAdd}
                    disabled={!quickAddVendor}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => { setQuickAddMode(false); setQuickAddVendor(''); }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Vendor Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Vendor</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="newVendor" className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="newVendor"
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
                disabled={addingVendor}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter vendor name"
              />
            </div>
            <button
              onClick={handleAddVendor}
              disabled={addingVendor}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {addingVendor ? 'Adding...' : 'Add Vendor'}
            </button>
          </div>
          {addVendorMessage && (
            <p className={`mt-3 text-sm ${
              addVendorMessage.includes('Error') || addVendorMessage.includes('exists') || addVendorMessage.includes('enter')
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {addVendorMessage}
            </p>
          )}
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Filters & Display Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.vendorName}>{vendor.vendorName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Periods</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.period}>{period.period}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rows per page</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 vendors</option>
                <option value={10}>10 vendors</option>
                <option value={20}>20 vendors</option>
                <option value={50}>50 vendors</option>
                <option value={100}>100 vendors</option>
                <option value={filteredVendors.length}>All ({filteredVendors.length})</option>
              </select>
            </div>
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
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm font-medium opacity-90 mb-2">Page Total</h3>
            <p className="text-3xl font-bold">{formatCurrency(overallTotal)}</p>
            <p className="text-sm opacity-80 mt-2">{paginatedVendors.length} vendors × {filteredPeriods.length} periods</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm font-medium opacity-90 mb-2">Total Vendors</h3>
            <p className="text-3xl font-bold">{filteredVendors.length}</p>
            <p className="text-sm opacity-80 mt-2">Showing {paginatedVendors.length} on this page</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm font-medium opacity-90 mb-2">Total Periods</h3>
            <p className="text-3xl font-bold">{filteredPeriods.length}</p>
            <p className="text-sm opacity-80 mt-2">Columns in grid</p>
          </div>
        </div>

        {/* Editable Grid Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Vendor × Period Grid</h2>
              <p className="text-sm text-gray-600 mt-1">Click "Edit" to modify, then "Save" to update • Empty cells show as "-"</p>
            </div>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b border-r sticky left-0 bg-gray-50 z-20" style={{ minWidth: '180px' }}>
                    Vendor
                  </th>
                  {filteredPeriods.map((period) => (
                    <th key={period.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b" style={{ minWidth: '120px' }}>
                      {period.period}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border-b border-l bg-gray-100" style={{ minWidth: '140px' }}>
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b border-l bg-gray-100" style={{ minWidth: '180px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedVendors.length === 0 ? (
                  <tr>
                    <td colSpan={filteredPeriods.length + 3} className="px-6 py-12 text-center text-gray-500">
                      No vendors found. Add a vendor above.
                    </td>
                  </tr>
                ) : (
                  paginatedVendors.map((vendor) => {
                    const isEditing = editingRows.has(vendor.id);
                    return (
                      <tr key={vendor.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r sticky left-0 bg-white z-10">
                          {vendor.vendorName}
                        </td>
                        {filteredPeriods.map((period) => {
                          const key = `${vendor.id}-${period.period}`;
                          const cellValue = isEditing 
                            ? (rowChanges.get(key) ?? '')
                            : getCellValue(vendor.id, period.period);

                          return (
                            <td key={period.id} className="px-2 py-2 text-center border-r border-gray-100">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={cellValue}
                                  onChange={(e) => updateRowChange(vendor.id, period.period, e.target.value)}
                                  placeholder="0"
                                  className="w-full px-3 py-2 text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  style={{ minWidth: '100px' }}
                                />
                              ) : (
                                <div className="px-2 py-2 min-h-[40px] flex items-center justify-center">
                                  {cellValue === 0 ? '-' : formatCurrency(cellValue as number)}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-l bg-gray-50">
                          {formatCurrency(getRowTotal(vendor.id))}
                        </td>
                        <td className="px-4 py-3 text-center border-l bg-gray-50">
                          <div className="flex gap-2 justify-center">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveRow(vendor.id)}
                                  className="px-4 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                                >
                                  💾 Save
                                </button>
                                <button
                                  onClick={() => toggleRowEdit(vendor.id)}
                                  className="px-4 py-1.5 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700"
                                >
                                  ✕ Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleRowEdit(vendor.id)}
                                  className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteVendor(vendor.id)}
                                  className="px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700"
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {paginatedVendors.length > 0 && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 sticky bottom-0">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 uppercase border-r sticky left-0 bg-gray-100 z-10">
                      Total
                    </td>
                    {filteredPeriods.map((period) => (
                      <td key={period.id} className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-200">
                        {formatCurrency(getColumnTotal(period.period))}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-l">
                      {formatCurrency(overallTotal)}
                    </td>
                    <td className="px-4 py-3 border-l"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredVendors.length)}</span> of{' '}
                <span className="font-medium">{filteredVendors.length}</span> vendors
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-1 border border-gray-300 rounded-md bg-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}