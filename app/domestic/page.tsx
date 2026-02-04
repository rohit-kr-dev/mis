"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import SearchableDropdown from '@/components/SearchableDropdown';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DomesticData {
  id: string | number;
  dateOfBooking: string;
  vendor: string;
  grade: string;
  qty: string;
  location: string;
  status: string;
}

interface Grade {
  id: string;
  gradeName: string;
}

interface Supplier {
  id: string;
  supplierName: string;
  alias?: string;
}

const initialFormData: DomesticData = {
  id: 0,
  dateOfBooking: '',
  vendor: '',
  grade: '',
  qty: '',
  location: '',
  status: ''
};

export default function DomesticPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [domesticData, setDomesticData] = useState<DomesticData[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<DomesticData | null>(null);
  const [formData, setFormData] = useState<DomesticData>(initialFormData);

  // Format number with Indian comma separators
  const formatIndianNumber = (num: string | number): string => {
    const number = typeof num === 'string' ? parseFloat(num) || 0 : num;
    if (number === 0) return '0';
    
    // Use toLocaleString for Indian numbering system (10,00,000 format)
    return Math.abs(number).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  };

  // Format currency with Indian commas
  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return formatIndianNumber(num);
  };

  const handleFormChange = (field: keyof DomesticData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Fetch transactions from Firestore
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'domestic-transactions'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const transactions: DomesticData[] = [];
      const invalidIds: string[] = [];
      
      snapshot.forEach((doc) => {
        const data = {
          id: doc.id,
          ...doc.data()
        } as DomesticData;
        
        // Check for invalid IDs (like '0' or other problematic values)
        if (data.id === 0 || data.id === '0' || !data.id) {
          console.warn('Found transaction with invalid ID:', data);
          invalidIds.push(doc.id);
        } else {
          transactions.push(data);
        }
      });
      
      // Clean up invalid transactions
      if (invalidIds.length > 0) {
        console.log('Cleaning up', invalidIds.length, 'invalid transactions');
        for (const invalidId of invalidIds) {
          try {
            await deleteDoc(doc(db, 'domestic-transactions', invalidId));
            console.log('Deleted invalid transaction with ID:', invalidId);
          } catch (error) {
            console.error('Error deleting invalid transaction:', error);
          }
        }
        // Refresh after cleanup
        await fetchTransactions();
        return;
      }
      
      console.log('Fetched domestic transactions:', transactions);
      setDomesticData(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Edit transaction
  const startEditTransaction = (transaction: DomesticData) => {
    console.log('Starting edit domestic transaction:', transaction);
    setEditingTransaction(transaction);
    setFormData({
      ...transaction
      // Don't reset the ID - keep the original Firestore document ID
    });
    setShowAddForm(true);
  };

  // Update transaction in Firestore
  const updateTransaction = async () => {
    if (!editingTransaction) {
      console.error('No editing domestic transaction found');
      alert('Error: No transaction selected for update');
      return;
    }
    
    if (!editingTransaction.id || editingTransaction.id === '' || (typeof editingTransaction.id === 'string' && editingTransaction.id.trim() === '')) {
      console.error('Invalid domestic transaction ID for update:', editingTransaction.id);
      alert('Error: Invalid transaction ID for update');
      return;
    }
    
    try {
      console.log('Updating domestic transaction with ID:', editingTransaction.id);
      const transactionData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      
      // Convert ID to string if it's a number
      const idString = typeof editingTransaction.id === 'number' ? editingTransaction.id.toString() : editingTransaction.id;
      
      await updateDoc(doc(db, 'domestic-transactions', idString), transactionData);
      console.log('Domestic transaction updated successfully');
      
      // Reset form and editing state
      setFormData(initialFormData);
      setEditingTransaction(null);
      setShowAddForm(false);
      
      // Refresh data
      await fetchTransactions();
    } catch (error) {
      console.error('Error updating domestic transaction:', error);
      alert(`Error updating transaction: ${(error as Error).message || 'Unknown error occurred'}`);
    }
  };

  // Save transaction to Firestore
  const handleAddTransaction = async () => {
    if (editingTransaction) {
      await updateTransaction();
      return;
    }
    
    if (!formData.dateOfBooking || !formData.vendor || !formData.grade) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const transactionData = {
        dateOfBooking: formData.dateOfBooking,
        vendor: formData.vendor,
        grade: formData.grade,
        qty: formData.qty,
        location: formData.location,
        status: formData.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'domestic-transactions'), transactionData);
      console.log('New domestic transaction added with ID:', docRef.id);
      
      // Reset form
      setFormData(initialFormData);
      setShowAddForm(false);
      
      // Refresh data
      await fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction. Please try again.');
    }
  };

  // Delete transaction from Firestore
  const removeTransaction = async (id: string | number) => {
    console.log('Remove domestic transaction called with ID:', id);
    console.log('ID type:', typeof id);
    
    // More flexible ID validation - accept string IDs from Firestore
    if (id === null || id === undefined) {
      console.error('Invalid domestic transaction ID:', id);
      alert('Cannot delete transaction: Invalid ID');
      return;
    }
    
    // Convert to string for Firestore operations
    const stringId = typeof id === 'number' ? id.toString() : id;
    
    // Additional validation for empty strings
    if (typeof stringId === 'string' && stringId.trim() === '') {
      console.error('Empty domestic transaction ID:', stringId);
      alert('Cannot delete transaction: Invalid ID');
      return;
    }
    
    if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      try {
        console.log('Deleting domestic transaction with ID:', stringId);
        
        // Check if document exists before deletion
        const docRef = doc(db, 'domestic-transactions', stringId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          console.log('Document already deleted or does not exist');
          alert('Transaction has already been deleted.');
          await fetchTransactions(); // Refresh to show current state
          return;
        }
        
        // Perform the deletion
        await deleteDoc(docRef);
        console.log('Domestic transaction deleted successfully');
        
        // Force multiple refresh attempts to ensure UI sync
        console.log('Refreshing data...');
        await fetchTransactions();
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for propagation
        await fetchTransactions(); // Second refresh for certainty
        
        // Force state update to ensure UI reflects changes
        setDomesticData(prev => [...prev]); // Trigger re-render
        
        console.log('Domestic data refreshed after deletion');
        alert('Transaction deleted successfully!');
        
      } catch (error) {
        console.error('Error deleting domestic transaction:', error);
        alert(`Error deleting transaction: ${(error as Error).message || 'Unknown error occurred'}`);
        
        // Refresh on error to ensure consistency
        await fetchTransactions();
      }
    }
  };

  // Download as Excel
  const downloadExcel = () => {
    if (domesticData.length === 0) return;
    
    // Prepare data for export with Indian number formatting
    const exportData = domesticData.map((row, index) => ({
      'SL No': index + 1,
      'Date of Booking': row.dateOfBooking || '-',
      'Vendor': row.vendor || '-',
      'Grade': row.grade || '-',
      'Qty (Kg)': formatIndianNumber(row.qty || '0'),
      'Location': row.location || '-',
      'Status': row.status || '-'
    }));
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Domestic Transactions');
    
    // Generate filename
    const filename = `domestic_transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Export
    XLSX.writeFile(wb, filename);
  };

  // Download as PDF
  const downloadPDF = async () => {
    if (domesticData.length === 0) return;
    
    // Dynamically import jsPDF only when needed
    const jsPDFModule = await import('jspdf');
    const doc = new jsPDFModule.default();
    
    // Add company name
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Polymetalz', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'normal');
    doc.text('Domestic Transactions Report', 14, 35);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 45);
    
    // Prepare table data with Indian number formatting
    const tableData = domesticData.map((row, index) => [
      index + 1,
      row.dateOfBooking || '-',
      row.vendor || '-',
      row.grade || '-',
      formatIndianNumber(row.qty || '0'),
      row.location || '-',
      row.status || '-'
    ]);

    // Prepare column headers
    const headers = [[
      'SL No', 'Date', 'Vendor', 'Grade', 'Qty (Kg)', 'Location', 'Status'
    ]];
    
    // Generate table
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 55,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [243, 244, 246]
      }
    });
    
    // Save PDF
    doc.save(`domestic_transactions_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Fetch suppliers from Firestore
  const fetchSuppliers = async () => {
    try {
      const q = query(collection(db, 'suppliers'), orderBy('supplierName'));
      const snapshot = await getDocs(q);
      
      const supplierList: Supplier[] = [];
      snapshot.forEach((doc) => {
        supplierList.push({
          id: doc.id,
          ...doc.data()
        } as Supplier);
      });
      
      // Remove duplicates based on supplierName
      const uniqueSuppliers = supplierList.filter((supplier, index, self) =>
        index === self.findIndex(s => s.supplierName === supplier.supplierName)
      );
      
      setSuppliers(uniqueSuppliers);
      setFilteredSuppliers(uniqueSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  // Fetch grades from Firestore
  const fetchGrades = async () => {
    try {
      const q = query(collection(db, 'grades'), orderBy('gradeName'));
      const snapshot = await getDocs(q);
      
      const gradeList: Grade[] = [];
      snapshot.forEach((doc) => {
        gradeList.push({
          id: doc.id,
          ...doc.data()
        } as Grade);
      });
      
      setGrades(gradeList);
      console.log('Fetched grades:', gradeList);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  // Filter suppliers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(supplier =>
        supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.alias && supplier.alias.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  // Load data on component mount
  useEffect(() => {
    fetchSuppliers();
    fetchGrades();
    fetchTransactions();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏠 Domestic Transactions</h1>
              <p className="text-gray-600 mt-1">Manage domestic vendor transactions and local purchases</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {domesticData.length} Records
              </div>
              <button 
                onClick={() => {
                  if (showAddForm && editingTransaction) {
                    // Cancel edit mode
                    setEditingTransaction(null);
                    setFormData(initialFormData);
                    setSearchTerm('');
                    setShowDropdown(false);
                  }
                  setShowAddForm(!showAddForm);
                }}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-md flex items-center space-x-2"
              >
                <span>{showAddForm ? '❌' : '➕'}</span>
                <span>{showAddForm ? (editingTransaction ? 'Cancel Edit' : 'Cancel') : 'Add Transaction'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="mr-2">{editingTransaction ? '✏️' : '📝'}</span>
                {editingTransaction ? 'Edit Domestic Transaction' : 'Add New Domestic Transaction'}
              </h2>
              <p className="text-gray-600 mt-1">
                {editingTransaction ? 'Modify the domestic transaction details below' : 'Fill in the domestic transaction details below'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📅 Date of Booking</label>
                  <input 
                    type="date" 
                    value={formData.dateOfBooking} 
                    onChange={(e) => handleFormChange('dateOfBooking', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Vendor</label>
                  <div 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 bg-white cursor-pointer"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`${formData.vendor ? 'text-gray-900' : 'text-gray-500'}`}>
                        {formData.vendor || (suppliers.length === 0 ? 'Loading vendors...' : 'Select Vendor')}
                      </span>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <input
                          type="text"
                          placeholder="Search vendors..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          autoFocus
                        />
                      </div>
                      <div className="py-1">
                        {filteredSuppliers.length === 0 ? (
                          <div className="px-4 py-2 text-gray-500 text-sm">No vendors found</div>
                        ) : (
                          filteredSuppliers.map((supplier) => (
                            <div
                              key={supplier.id}
                              className={`px-4 py-2 cursor-pointer hover:bg-green-50 ${formData.vendor === supplier.supplierName ? 'bg-green-100 text-green-800' : 'text-gray-700'}`}
                              onClick={() => {
                                handleFormChange('vendor', supplier.supplierName);
                                setShowDropdown(false);
                                setSearchTerm('');
                              }}
                            >
                              <div className="font-medium">{supplier.supplierName}</div>
                              {supplier.alias && (
                                <div className="text-sm text-gray-500">{supplier.alias}</div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Column 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Grade</label>
                  <SearchableDropdown
                    options={grades.map(grade => ({ id: grade.id, name: grade.gradeName }))}
                    value={formData.grade}
                    onChange={(value: string) => handleFormChange('grade', value)}
                    placeholder={grades.length === 0 ? 'Loading grades...' : 'Select Grade'}
                    label=""
                    disabled={grades.length === 0}
                    searchKey="name"
                    displayKey="name"
                    returnKey="name" // Return the grade name instead of document ID
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📍 Location</label>
                  <select
                    value={formData.location}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">Select Location</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Kolkata">Kolkata</option>
                  </select>
                </div>
              </div>
              
              {/* Column 3 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🔢 Qty (Kg)</label>
                  <input 
                    type="number" 
                    value={formData.qty} 
                    onChange={(e) => handleFormChange('qty', e.target.value)}
                    placeholder="Enter quantity in Kg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📊 Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">Select Status</option>
                    <option value="Billing Pending">Billing Pending</option>
                    <option value="Billing Done">Billing Done</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              {editingTransaction && (
                <button 
                  onClick={() => {
                    setEditingTransaction(null);
                    setFormData(initialFormData);
                    setSearchTerm('');
                    setShowDropdown(false);
                  }}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition shadow-md flex items-center space-x-2"
                >
                  <span>❌</span>
                  <span>Cancel Edit</span>
                </button>
              )}
              <button 
                onClick={handleAddTransaction}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-md transition transform hover:scale-105 flex items-center space-x-2"
              >
                <span>{editingTransaction ? '🔄' : '💾'}</span>
                <span>{editingTransaction ? 'Update Transaction' : 'Save Transaction'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {!loading && domesticData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="mr-2">📋</span>
                  Domestic Transactions
                  <span className="ml-3 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    {domesticData.length} records
                  </span>
                </h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
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
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Booking</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty (Kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {domesticData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{domesticData.indexOf(row) + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.dateOfBooking || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.grade || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatIndianNumber(row.qty || '0')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.location || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.status === 'Billing Done' ? 'bg-green-100 text-green-800' :
                          row.status === 'Billing Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {row.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center space-x-2">
                        <button 
                          onClick={() => startEditTransaction(row)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Edit transaction"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => {
                            console.log('Delete button clicked');
                            console.log('Row data:', row);
                            console.log('Row ID:', row.id);
                            console.log('Row ID type:', typeof row.id);
                            removeTransaction(row.id);
                          }}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete transaction"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && domesticData.length === 0 && !showAddForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="mx-auto max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl text-gray-400">🏠</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">No Domestic Transactions Found</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Get started by adding your first domestic transaction. Track local vendor purchases and domestic supplies all in one place.
              </p>
              <button 
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2 mx-auto"
              >
                <span>➕</span>
                <span>Add Your First Transaction</span>
              </button>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Tip:</span> Domestic transactions are tracked in INR only with automatic amount calculation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}