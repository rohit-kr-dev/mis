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
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { Search, Plus, Edit2, Trash2, Save, X, Filter, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

export default function EnhancedVendorManagement() {
  // State for data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  // State for filters and UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [rowChanges, setRowChanges] = useState<Map<string, string>>(new Map());
  const [newVendorName, setNewVendorName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

    // Create a single map to track all unsubscribes
    const unsubscribes = new Map<string, () => void>();
    // Keep track of processed vendors to prevent duplicate subscriptions
    const processedVendors = new Set<string>();

    vendors.forEach((vendor) => {
      // Skip if already processed
      if (processedVendors.has(vendor.id)) return;
      processedVendors.add(vendor.id);

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
            // Remove all entries for this vendor first
            const filtered = prev.filter(p => p.vendorId !== vendor.id);
            // Add new entries for this vendor
            const newData = [...filtered, ...data];
            
            // Debug: Check for duplicates
            const seen = new Set<string>();
            const duplicates: string[] = [];
            newData.forEach(entry => {
              const key = `${entry.vendorId}-${entry.period}`;
              if (seen.has(key)) {
                duplicates.push(key);
              }
              seen.add(key);
            });
            
            if (duplicates.length > 0) {
              console.warn('Duplicate entries found:', duplicates);
            }
            
            return newData;
          });
        },
        (error) => console.error('Error fetching period data:', error)
      );
      unsubscribes.set(vendor.id, unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      unsubscribes.clear();
      processedVendors.clear();
    };
  }, [vendors]);

  // Clean up duplicate entries in periodData
  useEffect(() => {
    if (periodData.length > 0) {
      setPeriodData(prev => {
        // Create a map to store unique entries by vendorId and period
        const uniqueMap = new Map<string, PeriodData>();
        
        prev.forEach(entry => {
          const key = `${entry.vendorId}-${entry.period}`;
          // If there's a duplicate, keep the latest one (or just keep one)
          uniqueMap.set(key, entry);
        });
        
        return Array.from(uniqueMap.values());
      });
    }
  }, [periodData]); // Run when periodData changes

  // Additional cleanup: Periodically check for duplicates
  useEffect(() => {
    const interval = setInterval(() => {
      if (periodData.length > 0) {
        setPeriodData(prev => {
          const uniqueMap = new Map<string, PeriodData>();
          prev.forEach(entry => {
            const key = `${entry.vendorId}-${entry.period}`;
            uniqueMap.set(key, entry);
          });
          return Array.from(uniqueMap.values());
        });
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [periodData]);

  // Real-time subscription to periods collection
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'periods'),
      (snapshot) => {
        const data: Period[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Period);
        });
        
        // Sort periods chronologically
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

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesSearch = v.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVendorFilter = !selectedVendor || v.vendorName === selectedVendor;
      return matchesSearch && matchesVendorFilter;
    });
  }, [vendors, searchTerm, selectedVendor]);

  const filteredPeriods = useMemo(() => {
    if (!selectedPeriod) return periods;
    return periods.filter(p => p.period === selectedPeriod);
  }, [periods, selectedPeriod]);

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVendors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVendors, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedVendor, selectedPeriod, itemsPerPage]);

  const getCellValue = (vendorId: string, period: string): number => {
    const cell = periodData.find(d => d.vendorId === vendorId && d.period === period);
    return cell ? cell.amount : 0;
  };

  const getPeriodDocId = (vendorId: string, period: string): string | null => {
    const cell = periodData.find(d => d.vendorId === vendorId && d.period === period);
    return cell ? cell.id : null;
  };

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

  const overallTotal = useMemo(() => {
    return paginatedVendors.reduce((sum, vendor) => sum + getRowTotal(vendor.id), 0);
  }, [paginatedVendors, filteredPeriods, periodData, editingRows, rowChanges]);

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddVendor = async () => {
    if (!newVendorName.trim()) {
      showMessage('Please enter vendor name', 'error');
      return;
    }

    if (vendors.some(v => v.vendorName === newVendorName.trim())) {
      showMessage('Vendor already exists', 'error');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'vendorList'), {
        vendorName: newVendorName.trim(),
        totalAmount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showMessage('Vendor added successfully!');
      setNewVendorName('');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding vendor:', error);
      showMessage('Error adding vendor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVendor = async () => {
    if (!editingVendor || !newVendorName.trim()) {
      showMessage('Please enter vendor name', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'vendorList', editingVendor.id), {
        vendorName: newVendorName.trim(),
        updatedAt: serverTimestamp(),
      });

      showMessage('Vendor updated successfully!');
      setNewVendorName('');
      setEditingVendor(null);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error updating vendor:', error);
      showMessage('Error updating vendor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (!confirm(`Delete vendor "${vendor?.vendorName}" and all its period data?`)) return;

    setLoading(true);
    try {
      const periodsRef = collection(db, 'vendorList', vendorId, 'periods');
      const snapshot = await getDocs(periodsRef);
      
      const deletePromises = snapshot.docs.map(document => 
        deleteDoc(doc(db, 'vendorList', vendorId, 'periods', document.id))
      );
      
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'vendorList', vendorId));
      
      showMessage('Vendor deleted successfully!');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      showMessage('Error deleting vendor', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const updateRowChange = (vendorId: string, period: string, value: string) => {
    const key = `${vendorId}-${period}`;
    const newRowChanges = new Map(rowChanges);
    newRowChanges.set(key, value);
    setRowChanges(newRowChanges);
  };

  const handleSaveRow = async (vendorId: string) => {
    setLoading(true);
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
      showMessage('Row saved successfully!');
    } catch (error) {
      console.error('Error saving row:', error);
      showMessage('Error saving row', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedVendor('');
    setSelectedPeriod('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setNewVendorName(vendor.vendorName);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingVendor(null);
    setNewVendorName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-[95vw] mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vendor Management System
              </h1>
              <p className="text-slate-600 mt-2">Track and manage vendor payments with period-wise breakdown</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus size={20} />
              Add Vendor
            </button>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-6 right-6 px-6 py-3 rounded-lg shadow-lg z-50 ${
            message.includes('Error') || message.includes('exists') || message.includes('enter')
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
          }`}>
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Page Total</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(overallTotal)}</p>
                <p className="text-blue-100 text-xs mt-2">{paginatedVendors.length} vendors × {filteredPeriods.length} periods</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Vendors</p>
                <p className="text-3xl font-bold mt-2">{filteredVendors.length}</p>
                <p className="text-green-100 text-xs mt-2">Showing {paginatedVendors.length} on page</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Periods</p>
                <p className="text-3xl font-bold mt-2">{filteredPeriods.length}</p>
                <p className="text-purple-100 text-xs mt-2">Columns in grid</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Filters & Search</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.vendorName}>{vendor.vendorName}</option>
              ))}
            </select>

            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Periods</option>
              {periods.map((period) => (
                <option key={period.id} value={period.period}>{period.period}</option>
              ))}
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={filteredVendors.length}>All ({filteredVendors.length})</option>
            </select>

            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={18} />
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
              <table className="w-full border-collapse">
                <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider border-r border-slate-600 sticky left-0 bg-slate-700 z-20" style={{ minWidth: '80px' }}>
                      S.No
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider border-r border-slate-600 sticky left-20 bg-slate-700 z-20" style={{ minWidth: '200px' }}>
                      Vendor Name
                    </th>
                    {filteredPeriods.map((period) => (
                      <th key={period.id} className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider border-r border-slate-600" style={{ minWidth: '120px' }}>
                        {period.period}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider border-r border-slate-600 bg-slate-800" style={{ minWidth: '140px' }}>
                      Total
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-slate-800" style={{ minWidth: '180px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedVendors.length === 0 ? (
                    <tr>
                      <td colSpan={filteredPeriods.length + 4} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Search size={48} className="text-slate-300" />
                          <p className="text-lg">No vendors found</p>
                          <p className="text-sm">Try adjusting your filters or add a new vendor</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedVendors.map((vendor, index) => {
                      const isEditing = editingRows.has(vendor.id);
                      const serialNo = (currentPage - 1) * itemsPerPage + index + 1;
                      
                      return (
                        <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-slate-700 border-r border-slate-200 sticky left-0 bg-white z-10">
                            {serialNo}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 border-r border-slate-200 sticky left-20 bg-white z-10">
                            {vendor.vendorName}
                          </td>
                          {filteredPeriods.map((period) => {
                            const key = `${vendor.id}-${period.period}`;
                            const cellValue = isEditing 
                              ? (rowChanges.get(key) ?? '')
                              : getCellValue(vendor.id, period.period);

                            return (
                              <td key={period.id} className="px-2 py-2 text-center border-r border-slate-100">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={cellValue}
                                    onChange={(e) => updateRowChange(vendor.id, period.period, e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 text-center border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                                    style={{ minWidth: '100px' }}
                                  />
                                ) : (
                                  <div className="px-2 py-2 min-h-[40px] flex items-center justify-center">
                                    {cellValue === 0 ? (
                                      <span className="text-slate-400">-</span>
                                    ) : (
                                      <span className="font-medium text-slate-700">{formatCurrency(cellValue as number)}</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 border-r border-slate-200 bg-slate-50">
                            {formatCurrency(getRowTotal(vendor.id))}
                          </td>
                          <td className="px-4 py-3 text-center border-slate-200 bg-slate-50">
                            <div className="flex gap-2 justify-center">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveRow(vendor.id)}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    <Save size={14} />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => toggleRowEdit(vendor.id)}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                                  >
                                    <X size={14} />
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => toggleRowEdit(vendor.id)}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  >
                                    <Edit2 size={14} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => openEditModal(vendor)}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                                  >
                                    <Edit2 size={14} />
                                    Rename
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVendor(vendor.id)}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 size={14} />
                                    Delete
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
                  <tfoot className="bg-gradient-to-r from-slate-700 to-slate-800 text-white border-t-2 border-slate-600 sticky bottom-0">
                    <tr>
                      <td className="px-4 py-4 text-sm font-bold uppercase border-r border-slate-600 sticky left-0 bg-slate-700 z-20">
                        Total
                      </td>
                      <td className="px-4 py-4 text-sm font-bold uppercase border-r border-slate-600 sticky left-20 bg-slate-700 z-20">
                      </td>
                      {filteredPeriods.map((period) => (
                        <td key={period.id} className="px-4 py-4 text-center text-sm font-bold border-r border-slate-600">
                          {formatCurrency(getColumnTotal(period.period))}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-right text-sm font-bold border-r border-slate-600">
                        {formatCurrency(overallTotal)}
                      </td>
                      <td className="px-4 py-4 border-slate-600"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700">
                  Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredVendors.length)}</span> of{' '}
                  <span className="font-semibold">{filteredVendors.length}</span> vendors
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First Page"
                  >
                    <ChevronsLeft size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="px-4 py-2 border border-slate-300 rounded-lg bg-white font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last Page"
                  >
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-xl">
                <h3 className="text-xl font-bold text-white">
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </h3>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (editingVendor ? handleUpdateVendor() : handleAddVendor())}
                    placeholder="Enter vendor name"
                    autoFocus
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={editingVendor ? handleUpdateVendor : handleAddVendor}
                    disabled={loading || !newVendorName.trim()}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Processing...' : editingVendor ? 'Update' : 'Add Vendor'}
                  </button>
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}