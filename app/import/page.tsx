"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import SearchableDropdown from '@/components/SearchableDropdown';

interface BookingData {
  id: string | number;
  dateOfBooking: string;
  vendor: string;
  port: string;
  grade: string;
  qty: string;
  commission: string;
  commissionCurrency: string;
  exchRate: string;
  customDuty: string;
  calculatedCustomDuty?: string;
  bookingRate?: string;
  clearanceCharges: string;
  netLanded: string;
  status: string;
  completed: string;
}

interface Supplier {
  id: string;
  supplierName: string;
  alias?: string;
}

interface Grade {
  id: string;
  gradeName: string;
}

export default function ImportPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [formData, setFormData] = useState<BookingData>({
    id: 0,
    dateOfBooking: '',
    vendor: '',
    port: '',
    grade: '',
    qty: '',
    commission: '',
    commissionCurrency: 'USD',
    exchRate: '',
    customDuty: '',
    calculatedCustomDuty: '',
    bookingRate: '',
    clearanceCharges: '',
    netLanded: '',
    status: '',
    completed: ''
  });

  const handleFormChange = (field: keyof BookingData, value: string) => {
    setFormData(prev => {
      const updatedForm = { ...prev, [field]: value };
      
      // Get current values
      const commissionValue = parseFloat(updatedForm.commission || '0');
      const exchRate = parseFloat(updatedForm.exchRate || '0');
      
      // Calculate custom duty when customDuty changes
      if (field === 'customDuty' && value) {
        const customDutyPercent = parseFloat(value);
        if (!isNaN(customDutyPercent)) {
          // Formula: Custom Duty + (Custom Duty * 10%)
          const calculatedValue = customDutyPercent + (customDutyPercent * 0.10);
          updatedForm.calculatedCustomDuty = calculatedValue.toFixed(2);
        } else {
          updatedForm.calculatedCustomDuty = '';
        }
      }
      
      // Calculate net landed when relevant fields change
      if (
        field === 'bookingRate' || 
        field === 'exchRate' || 
        field === 'calculatedCustomDuty' || 
        field === 'clearanceCharges' || 
        field === 'customDuty' || 
        field === 'commission'
      ) {
        const bookingRate = parseFloat(updatedForm.bookingRate || '0');
        const exchRate = parseFloat(updatedForm.exchRate || '0');
        const calculatedCustomDuty = parseFloat(updatedForm.calculatedCustomDuty || '0');
        const clearanceCharges = parseFloat(updatedForm.clearanceCharges || '0');
        const customDutyPercent = parseFloat(updatedForm.customDuty) || 0; // Now as raw number (e.g., 10)
        const commissionValue = parseFloat(updatedForm.commission || '0');
        
        // Determine commission value based on currency
        let commissionINRValue = commissionValue;
        if (updatedForm.commissionCurrency === 'USD' && exchRate > 0) {
          commissionINRValue = commissionValue * exchRate;
        }
        
        // Net Landed formula:
        // ((booking rate * exchange rate) + (booking rate * exchange rate * calculated custom duty%) + 
        // clearance charges + (select custom duty % * exchange rate) + commission converted) / 1000
        
        const part1 = bookingRate * exchRate;
        const part2 = bookingRate * exchRate * (calculatedCustomDuty / 100);
        const part3 = clearanceCharges;
        const part4 = customDutyPercent * exchRate; // Select Custom Duty % * Exchange Rate
        const part5 = getConvertedCommission(); // Use converted commission value
        
        const netLandedValue = (part1 + part2 + part3 + part4 + part5) / 1000;
        
        if (!isNaN(netLandedValue) && isFinite(netLandedValue)) {
          updatedForm.netLanded = netLandedValue.toFixed(2);
        } else {
          updatedForm.netLanded = '';
        }
      }
      
      return updatedForm;
    });
  };

  const getConvertedCommission = () => {
    const commission = parseFloat(formData.commission) || 0;
    const exchangeRate = parseFloat(formData.exchRate) || 0;
    
    if (formData.commissionCurrency === 'USD' && commission > 0 && exchangeRate > 0) {
      return commission * exchangeRate;
    } else if (formData.commissionCurrency === 'INR' && commission > 0) {
      return commission;
    }
    return 0;
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
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  // Fetch transactions from Firestore
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'import-transactions'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const transactions: BookingData[] = [];
      snapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        } as BookingData);
      });
      
      setBookingData(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save transaction to Firestore
  const handleAddTransaction = async () => {
    if (editingTransaction) {
      await updateTransaction();
      return;
    }
    
    try {
      const transactionData = {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'import-transactions'), transactionData);
      
      // Reset form
      setFormData({
        id: 0,
        dateOfBooking: '',
        vendor: '',
        port: '',
        grade: '',
        qty: '',
        commission: '',
        commissionCurrency: 'USD',
        exchRate: '',
        customDuty: '',
        calculatedCustomDuty: '',
        bookingRate: '',
        clearanceCharges: '',
        netLanded: '',
        status: '',
        completed: ''
      });
      
      setShowAddForm(false);
      
      // Refresh data
      await fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction. Please try again.');
    }
  };

  // Edit transaction
  const startEditTransaction = (transaction: BookingData) => {
    setEditingTransaction(transaction);
    setFormData({
      ...transaction,
      id: 0
    });
    setShowAddForm(true);
  };

  // Update transaction in Firestore
  const updateTransaction = async () => {
    if (!editingTransaction) {
      console.error('No editing transaction found');
      alert('Error: No transaction selected for update');
      return;
    }
    
    try {
      const transactionData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      
      const idString = typeof editingTransaction.id === 'number' ? editingTransaction.id.toString() : editingTransaction.id;
      
      await updateDoc(doc(db, 'import-transactions', idString), transactionData);
      
      // Reset form and editing state
      setFormData({
        id: 0,
        dateOfBooking: '',
        vendor: '',
        port: '',
        grade: '',
        qty: '',
        commission: '',
        commissionCurrency: 'USD',
        exchRate: '',
        customDuty: '',
        calculatedCustomDuty: '',
        bookingRate: '',
        clearanceCharges: '',
        netLanded: '',
        status: '',
        completed: ''
      });
      
      setEditingTransaction(null);
      setShowAddForm(false);
      
      // Refresh data
      await fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert(`Error updating transaction: ${(error as Error).message || 'Unknown error occurred'}`);
    }
  };

  // Delete transaction from Firestore
  const removeTransaction = async (id: string | number) => {
    if (!id || id === '' || (typeof id === 'string' && id.trim() === '')) {
      console.error('Invalid transaction ID:', id);
      alert('Cannot delete transaction: Invalid ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        const idString = typeof id === 'number' ? id.toString() : id;
        await deleteDoc(doc(db, 'import-transactions', idString));
        await fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction. Please try again.');
      }
    }
  };

  // Fetch live exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (!formData.exchRate) {
        setLoadingRate(true);
        try {
          const response = await fetch('/api/exchange-rate');
          const data = await response.json();
          if (data.rate) {
            setCurrentExchangeRate(data.rate);
          }
        } catch (error) {
          console.error('Error fetching exchange rate:', error);
        } finally {
          setLoadingRate(false);
        }
      }
    };

    fetchExchangeRate();
  }, [formData.exchRate]);

  // Initialize data
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
              <h1 className="text-2xl font-bold text-gray-900">📥 Import Booking Data</h1>
              <p className="text-gray-600 mt-1">Manage and import booking transaction records</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {bookingData.length} Records
              </div>
              <button 
                onClick={() => {
                  if (showAddForm && editingTransaction) {
                    setEditingTransaction(null);
                    setFormData({
                      id: 0,
                      dateOfBooking: '',
                      vendor: '',
                      port: '',
                      grade: '',
                      qty: '',
                      commission: '',
                      commissionCurrency: 'USD',
                      exchRate: '',
                      customDuty: '',
                      calculatedCustomDuty: '',
                      bookingRate: '',
                      clearanceCharges: '',
                      netLanded: '',
                      status: '',
                      completed: ''
                    });
                  }
                  setShowAddForm(!showAddForm);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-md flex items-center space-x-2"
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
                {editingTransaction ? 'Edit Booking Transaction' : 'Add New Booking Transaction'}
              </h2>
              <p className="text-gray-600 mt-1">
                {editingTransaction ? 'Modify the transaction details below' : 'Fill in the transaction details below'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date of Booking</label>
                <input 
                  type="date" 
                  value={formData.dateOfBooking} 
                  onChange={(e) => handleFormChange('dateOfBooking', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🏢 Vendor</label>
                <select
                  value={formData.vendor}
                  onChange={(e) => handleFormChange('vendor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Vendor</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.supplierName}>
                      {supplier.supplierName}
                      {supplier.alias && ` (${supplier.alias})`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🏷️ Grade</label>
                <select
                  value={formData.grade}
                  onChange={(e) => handleFormChange('grade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Grade</option>
                  {grades.map(grade => (
                    <option key={grade.id} value={grade.gradeName}>
                      {grade.gradeName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🚢 Port</label>
                <select
                  value={formData.port}
                  onChange={(e) => handleFormChange('port', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Port</option>
                  <option value="Chennai">Chennai</option>
                  <option value="JNPT">JNPT</option>
                  <option value="Delivered-BLR">Delivered-BLR</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">⚖️ Qty (Kg)</label>
                <input 
                  type="number" 
                  value={formData.qty} 
                  onChange={(e) => handleFormChange('qty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💱 Exchange Rate</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.0001" 
                    value={formData.exchRate} 
                    onChange={(e) => handleFormChange('exchRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20"
                    placeholder="e.g., 83.5000"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {loadingRate ? '...' : currentExchangeRate ? `₹${currentExchangeRate.toFixed(2)}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">💸 Commission</label>
                <div className="flex space-x-1">
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.commission}
                    onChange={(e) => handleFormChange('commission', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                  <select
                    value={formData.commissionCurrency}
                    onChange={(e) => handleFormChange('commissionCurrency', e.target.value)}
                    className="w-20 px-1 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">💱 Commission Converted (INR)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={getConvertedCommission() || ''}
                  readOnly
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                  placeholder="0.00"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.commissionCurrency === 'USD' 
                    ? `From $${formData.commission || '0.00'} at ₹${formData.exchRate || '0.0000'}` 
                    : `INR: ₹${formData.commission || '0.00'}`}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">💸 Custom Duty</label>
                <select
                  value={formData.customDuty}
                  onChange={(e) => handleFormChange('customDuty', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Duty</option>
                  <option value="5">5</option>
                  <option value="7.5">7.5</option>
                  <option value="10">10</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">🧮 Calculated Duty Value</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.calculatedCustomDuty || ''}
                  readOnly
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                  placeholder="0.00"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Duty + (Duty × 10%)
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🚛 Clearance Charges</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.clearanceCharges} 
                  onChange={(e) => handleFormChange('clearanceCharges', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🎫 Booking Rate</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.bookingRate || ''}
                  onChange={(e) => handleFormChange('bookingRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📦 Net Landed (Kg)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.netLanded || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                  placeholder="0.00"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Formula: ((Booking Rate × Exchange Rate) + (Booking Rate × Exchange Rate × Calculated Duty %) + Clearance Charges + (Custom Duty × Exchange Rate) + Commission Converted) ÷ 1000
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📊 Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Status</option>
                  <option value="Not Yet Arrived">Not Yet Arrived</option>
                  <option value="Arrived">Arrived</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">✅ Completed</label>
                <select
                  value={formData.completed}
                  onChange={(e) => handleFormChange('completed', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Completion</option>
                  <option value="Pending">Pending</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              {editingTransaction && (
                <button 
                  onClick={() => {
                    setEditingTransaction(null);
                    setFormData({
                      id: 0,
                      dateOfBooking: '',
                      vendor: '',
                      port: '',
                      grade: '',
                      qty: '',
                      commission: '',
                      commissionCurrency: 'USD',
                      exchRate: '',
                      customDuty: '',
                      calculatedCustomDuty: '',
                      bookingRate: '',
                      clearanceCharges: '',
                      netLanded: '',
                      status: '',
                      completed: ''
                    });
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
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {!loading && bookingData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">📋</span>
                Booking Transactions
                <span className="ml-3 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {bookingData.length} records
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty (Kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comm Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exch Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charges</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Landed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookingData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">{row.dateOfBooking || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.port || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.grade || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.qty || '0'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.commission || '0.00'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.commissionCurrency || 'USD'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.exchRate || '0.0000'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.customDuty || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.clearanceCharges || '0.00'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.netLanded || '0.00'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.status === 'Arrived' ? 'bg-green-100 text-green-800' :
                          row.status === 'Not Yet Arrived' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {row.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.completed === 'Done' ? 'bg-green-100 text-green-800' :
                          row.completed === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {row.completed || 'N/A'}
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
                          onClick={() => removeTransaction(row.id)}
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

        {!loading && bookingData.length === 0 && !showAddForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="mx-auto max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl text-gray-400">📋</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">No Booking Transactions Found</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Get started by adding your first booking transaction. Track vendor bookings, commissions, and delivery status all in one place.
              </p>
              <button 
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2 mx-auto"
              >
                <span>➕</span>
                <span>Add Your First Transaction</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}