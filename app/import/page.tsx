'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import SearchableDropdown from '@/components/SearchableDropdown';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [filteredData, setFilteredData] = useState<BookingData[]>([]); // For filtered results
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [customPort, setCustomPort] = useState(''); // For custom port input
  const [filters, setFilters] = useState({
    completed: '', // Filter for completed status
    status: ''     // Filter for general status
  });
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
        // clearance charges + commission converted + commission converted) / 1000
        
        const part1 = bookingRate * exchRate;
        const part2 = bookingRate * exchRate * (calculatedCustomDuty / 100);
        const part3 = clearanceCharges;
        const part4 = getConvertedCommission(); // Commission Converted (INR value)
        const part5 = getConvertedCommission(); // Commission Converted (INR value) - added again
        
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

  // Format number with Indian comma separators
  const formatIndianNumber = (num: string | number): string => {
    const number = typeof num === 'string' ? parseFloat(num) || 0 : num;
    if (number === 0) return '0';
    
    // Handle the case where number is between 0 and 1 (like 0.5)
    if (number > 0 && number < 1) {
      return number.toString(); // Return as is for numbers like 0.5
    }
    
    // Convert to string and split at decimal point
    const [integer, decimal] = number.toString().split('.');
    
    // Format integer part with Indian numbering system
    let formatted = '';
    const reversed = integer.split('').reverse();
    
    for (let i = 0; i < reversed.length; i++) {
      if (i === 3 || (i > 3 && (i - 3) % 2 === 0)) {
        formatted = ',' + formatted;
      }
      formatted = reversed[i] + formatted;
    }
    
    // Add decimal part if exists
    if (decimal) {
      formatted += '.' + decimal;
    }
    
    return formatted;
  };

  // Format currency with 2 decimal places and Indian commas
  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return formatIndianNumber(num.toFixed(2));
  };

  // Download as Excel
  const downloadExcel = () => {
    if (filteredData.length === 0) return;
    
    // Prepare data for export
    const exportData = filteredData.map((row, index) => ({
      'SL No': index + 1,
      'Date of Booking': row.dateOfBooking || '-',
      'Vendor': row.vendor || '-',
      'Port': row.port || '-',
      'Grade': row.grade || '-',
      'Qty (Kg)': formatIndianNumber(row.qty || '0'),
      'Booking Rate': formatCurrency(row.bookingRate || '0.00'),
      'Net Landed (Kg)': formatCurrency(row.netLanded || '0.00'),
      'Status': row.status || '-',
      'Completed': row.completed || '-'
    }));
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Booking Transactions');
    
    // Generate filename
    const filename = `booking_transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Export
    XLSX.writeFile(wb, filename);
  };

  // Download as PDF
  const downloadPDF = async () => {
    if (filteredData.length === 0) return;
    
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
    doc.text('Booking Transactions Report', 14, 35);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 45);
    
    // Format currency function for PDF (using existing formatCurrency)
    const formatCurrencyForPDF = (amount: string) => {
      return formatCurrency(amount);
    };
    
    // Prepare table data
    const tableData = filteredData.map((row, index) => [
      index + 1,
      row.dateOfBooking || '-',
      row.vendor || '-',
      row.port || '-',
      row.grade || '-',
      formatIndianNumber(row.qty || '0'),
      formatCurrencyForPDF(row.bookingRate || '0'),
      formatCurrencyForPDF(row.netLanded || '0'),
      row.status || '-',
      row.completed || '-'
    ]);

    // Prepare column headers
    const headers = [[
      'SL No', 'Date', 'Vendor', 'Port', 'Grade', 'Qty (Kg)', 
      'Booking Rate', 'Net Landed', 'Status', 'Completed'
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
        fillColor: [59, 130, 246],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [243, 244, 246]
      }
    });
    
    // Save PDF
    doc.save(`booking_transactions_${new Date().toISOString().split('T')[0]}.pdf`);
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
    console.log('=== FETCH TRANSACTIONS DEBUG ===');
    try {
      setLoading(true);
      const q = query(collection(db, 'import-transactions'), orderBy('createdAt', 'desc'));
      console.log('Querying collection: import-transactions');
      
      const snapshot = await getDocs(q);
      console.log('Firestore returned', snapshot.size, 'documents');
      
      const transactions: BookingData[] = [];
      snapshot.forEach((doc) => {
        console.log('Document ID:', doc.id);
        console.log('Document data:', doc.data());
        
        // Create the transaction data object
        const baseData = doc.data();
        
        // Explicitly set the ID to the document ID
        const transactionData: BookingData = {
          id: doc.id,  // This should be the Firestore document ID
          dateOfBooking: baseData.dateOfBooking || '',
          vendor: baseData.vendor || '',
          port: baseData.port || '',
          grade: baseData.grade || '',
          qty: baseData.qty || '',
          commission: baseData.commission || '',
          commissionCurrency: baseData.commissionCurrency || 'USD',
          exchRate: baseData.exchRate || '',
          customDuty: baseData.customDuty || '',
          calculatedCustomDuty: baseData.calculatedCustomDuty || '',
          bookingRate: baseData.bookingRate || '',
          clearanceCharges: baseData.clearanceCharges || '',
          netLanded: baseData.netLanded || '',
          status: baseData.status || '',
          completed: baseData.completed || ''
        };
        
        console.log('Processed transaction ID:', transactionData.id);
        console.log('Processed transaction:', transactionData);
        transactions.push(transactionData);
      });
      
      console.log('Final transactions array length:', transactions.length);
      console.log('Setting bookingData with', transactions.length, 'items');
      setBookingData(transactions);
      console.log('✅ Booking data updated successfully');
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      console.error('Error details:', error);
    } finally {
      setLoading(false);
      console.log('=== END FETCH TRANSACTIONS DEBUG ===');
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
      
      // Use addDoc which returns the reference to the new document with its ID
      const docRef = await addDoc(collection(db, 'import-transactions'), transactionData);
      console.log('New transaction added with ID:', docRef.id);
      
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
    console.log('Starting edit for transaction:', transaction);
    console.log('Transaction ID:', transaction.id);
    console.log('Transaction type:', typeof transaction.id);
    
    setEditingTransaction(transaction);
    setFormData({
      ...transaction
      // Don't override the ID - keep the original Firestore document ID
    });
    
    console.log('FormData after setting:', { ...transaction });
    setShowAddForm(true);
  };

  // Update transaction in Firestore
  const updateTransaction = async () => {
    console.log('=== UPDATE TRANSACTION DEBUG ===');
    console.log('Editing transaction:', editingTransaction);
    console.log('FormData:', formData);
    
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
      
      // Remove the id field from the data being sent to Firestore
      // as Firestore documents shouldn't have their own ID in the data
      const { id, ...cleanTransactionData } = transactionData;
      
      // Use the original document ID from editingTransaction
      // The ID should already be the correct Firestore document ID
      const docId = editingTransaction.id;
      
      console.log('Document ID to update:', docId);
      console.log('Document ID type:', typeof docId);
      console.log('Transaction data to save:', cleanTransactionData);
      
      if (!docId) {
        throw new Error('Document ID is missing');
      }
      
      await updateDoc(doc(db, 'import-transactions', docId.toString()), cleanTransactionData);
      
      console.log('Document updated successfully');
      
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
    console.log('=== END UPDATE TRANSACTION DEBUG ===');
  };

  // Delete transaction from Firestore - Using actual document ID
  const removeTransaction = async (id: string | number) => {
    console.log('=== DELETE TRANSACTION ATTEMPT ===');
    console.log('Target ID:', id);
    
    // Validate ID
    if (!id && id !== 0) {
      console.error('Invalid transaction ID:', id);
      alert('Cannot delete transaction: Invalid ID');
      return;
    }
    
    // Find the transaction object in our data array
    const transaction = bookingData.find(t => {
      const tIdString = typeof t.id === 'number' ? t.id.toString() : t.id;
      const targetIdString = typeof id === 'number' ? id.toString() : id;
      return tIdString === targetIdString;
    });
    
    if (!transaction) {
      console.error('Transaction not found in local data');
      alert('Cannot delete transaction: Transaction not found');
      return;
    }
    
    // The transaction.id should already be the Firestore document ID
    // as set in fetchTransactions (line 356: id: doc.id)
    const docId = typeof transaction.id === 'number' ? transaction.id.toString() : transaction.id;
    
    console.log('Using document ID for deletion:', docId);
    
    if (window.confirm(`Delete transaction for ${transaction.vendor || 'Unknown'}?`)) {
      try {
        console.log('Starting deletion process...');
        
        // Attempt to delete from Firestore using the actual document ID
        const docRef = doc(db, 'import-transactions', docId);
        console.log('Attempting to delete document:', docRef.path);
        
        // Check if document exists before deletion
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          console.log('Document already deleted from Firestore:', docId);
          alert('Transaction has already been deleted from the database.');
        } else {
          // Document exists, so delete it
          await deleteDoc(docRef);
          console.log('Document deleted from Firestore');
          alert('Transaction deleted successfully!');
        }
        
        // Refresh data to get current state
        console.log('Refreshing data...');
        await fetchTransactions();
        console.log('=== DELETION PROCESS COMPLETE ===');
        
      } catch (error) {
        console.error('❌ Deletion failed:', error);
        alert(`Deletion failed: ${(error as Error).message || 'An unknown error occurred'}`);
        
        // Refresh data on error to ensure consistency
        await fetchTransactions();
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

  // Apply filters to booking data
  useEffect(() => {
    let filtered = [...bookingData];
    
    // Apply completed filter
    if (filters.completed) {
      filtered = filtered.filter(item => item.completed === filters.completed);
    }
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.vendor && item.vendor.toLowerCase().includes(term)) ||
        (item.grade && item.grade.toLowerCase().includes(term)) ||
        (item.port && item.port.toLowerCase().includes(term))
      );
    }
    
    setFilteredData(filtered);
  }, [bookingData, filters, searchTerm]);

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
            
            {/* Row 1: Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date of Booking</label>
                <input 
                  type="date" 
                  value={formData.dateOfBooking} 
                  onChange={(e) => handleFormChange('dateOfBooking', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                />
              </div>
              
              <div>
                <SearchableDropdown
                  options={suppliers.map(supplier => ({
                    id: supplier.supplierName,
                    name: supplier.supplierName,
                    alias: supplier.alias
                  }))}
                  value={formData.vendor}
                  onChange={(value) => handleFormChange('vendor', value)}
                  placeholder="Select Vendor"
                  label="🏢 Vendor"
                  displayKey="name"
                  searchKey="name"
                />
              </div>
              
              <div>
                <SearchableDropdown
                  options={grades.map(grade => ({
                    id: grade.gradeName,
                    name: grade.gradeName
                  }))}
                  value={formData.grade}
                  onChange={(value) => handleFormChange('grade', value)}
                  placeholder="Select Grade"
                  label="🏷️ Grade"
                  displayKey="name"
                  searchKey="name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📊 Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white h-10"
                >
                  <option value="">Select Status</option>
                  <option value="Not Yet Arrived">Not Yet Arrived</option>
                  <option value="Arrived">Arrived</option>
                </select>
              </div>
            </div>
            
            {/* Row 2: Port, Qty and Financial Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🚢 Port</label>
                <select
                  value={formData.port}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue === 'other') {
                      setFormData(prev => ({ ...prev, port: '' }));
                      setCustomPort('');
                    } else {
                      handleFormChange('port', selectedValue);
                      setCustomPort('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white h-10"
                >
                  <option value="">Select Port</option>
                  <option value="Chennai">Chennai</option>
                  <option value="JNPT">JNPT</option>
                  <option value="Delivered-BLR">Delivered-BLR</option>
                  <option value="other">Other (Specify below)</option>
                </select>
                
                {/* Custom Port Input */}
                {(!formData.port || formData.port === '' || formData.port === 'other') && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customPort}
                      onChange={(e) => setCustomPort(e.target.value)}
                      onBlur={() => {
                        if (customPort.trim()) {
                          handleFormChange('port', customPort.trim());
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customPort.trim()) {
                          handleFormChange('port', customPort.trim());
                          e.preventDefault();
                        }
                      }}
                      placeholder="Enter custom port name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-10"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Press Enter or click away to save
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">⚖️ Qty (Kg)</label>
                <input 
                  type="text" 
                  value={formData.qty ? formatIndianNumber(formData.qty) : ''}
                  onChange={(e) => {
                    let rawValue = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = rawValue.split('.');
                    if (parts.length > 2) {
                      rawValue = parts[0] + '.' + parts.slice(1).join('');
                    }
                    handleFormChange('qty', rawValue);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💱 Exchange Rate</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.exchRate || ''}
                    onChange={(e) => {
                      let rawValue = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = rawValue.split('.');
                      if (parts.length > 2) {
                        rawValue = parts[0] + '.' + parts.slice(1).join('');
                      }
                      handleFormChange('exchRate', rawValue);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20 h-10"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">💸 Commission</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={formData.commission ? formatCurrency(formData.commission) : ''}
                    onChange={(e) => {
                      let rawValue = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = rawValue.split('.');
                      if (parts.length > 2) {
                        rawValue = parts[0] + '.' + parts.slice(1).join('');
                      }
                      handleFormChange('commission', rawValue);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                    placeholder="0.00"
                  />
                  <select
                    value={formData.commissionCurrency}
                    onChange={(e) => handleFormChange('commissionCurrency', e.target.value)}
                    className="w-24 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white h-10"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Row 3: Additional Costs and Final Calculations */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🚛 Clearance Charges</label>
                <input 
                  type="text" 
                  value={formData.clearanceCharges ? formatCurrency(formData.clearanceCharges) : ''}
                  onChange={(e) => {
                    let rawValue = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = rawValue.split('.');
                    if (parts.length > 2) {
                      rawValue = parts[0] + '.' + parts.slice(1).join('');
                    }
                    handleFormChange('clearanceCharges', rawValue);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🎫 Booking Rate</label>
                <input 
                  type="text" 
                  value={formData.bookingRate ? formatCurrency(formData.bookingRate) : ''}
                  onChange={(e) => {
                    let rawValue = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = rawValue.split('.');
                    if (parts.length > 2) {
                      rawValue = parts[0] + '.' + parts.slice(1).join('');
                    }
                    handleFormChange('bookingRate', rawValue);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📦 Net Landed (Kg)</label>
                <input 
                  type="text" 
                  value={formData.netLanded ? formatCurrency(formData.netLanded) : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 h-10"
                  placeholder="0.00"
                />
                <div className="text-[10px] text-gray-500 mt-1">
                  Formula: ((BR × ER) + (BR × ER × CD%) + CC + CCV) ÷ 1000
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">🧮 Commission Converted (INR)</label>
                <input 
                  type="text" 
                  value={getConvertedCommission() ? formatCurrency(getConvertedCommission()) : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 h-10"
                  placeholder="0.00"
                />
                <div className="text-[10px] text-gray-500 truncate">
                  {formData.commissionCurrency === 'USD' 
                    ? `$${formData.commission || '0.00'} → ₹${formData.exchRate || '0.0000'}` 
                    : `₹${formData.commission || '0.00'}`}
                </div>
              </div>
            </div>
            
            {/* Row 4: Duty and Completion */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💸 Custom Duty (%)</label>
                <select
                  value={formData.customDuty}
                  onChange={(e) => handleFormChange('customDuty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white h-10"
                >
                  <option value="">Select Duty</option>
                  <option value="5">5</option>
                  <option value="7.5">7.5</option>
                  <option value="10">10</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">🧮 Calculated Duty</label>
                <input 
                  type="text" 
                  value={formData.calculatedCustomDuty ? formatCurrency(formData.calculatedCustomDuty) : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 h-10"
                  placeholder="0.00"
                />
                <div className="text-[10px] text-gray-500 mt-1">
                  Duty + 10%
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">✅ Completed</label>
                <select
                  value={formData.completed}
                  onChange={(e) => handleFormChange('completed', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white h-10"
                >
                  <option value="">Select Completion</option>
                  <option value="Pending">Pending</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              
              <div></div>
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
                    setCustomPort(''); // Clear custom port input
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
        {!loading && filteredData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="mr-2">📋</span>
                  Booking Transactions
                  <span className="ml-3 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {filteredData.length} records
                  </span>
                </h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Filter Controls */}
                  <div className="flex flex-wrap gap-2">
                    {/* Completed Status Filter */}
                    <select
                      value={filters.completed}
                      onChange={(e) => setFilters(prev => ({ ...prev, completed: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">All Completion Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Done">Done</option>
                    </select>
                    
                    {/* General Status Filter */}
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="Not Yet Arrived">Not Yet Arrived</option>
                      <option value="Arrived">Arrived</option>
                    </select>
                    
                    {/* Reset Filters Button */}
                    {(filters.completed || filters.status) && (
                      <button
                        onClick={() => setFilters({ completed: '', status: '' })}
                        className="px-3 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-1"
                      >
                        <span>🔄</span>
                        <span>Reset Filters</span>
                      </button>
                    )}
                    
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search vendor, grade, port..."
                        className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Export Buttons */}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty (Kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Rate</th>
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
                  {filteredData.map((row, index) => {
                    console.log(`Row ${index} data:`, row);
                    console.log(`Row ${index} ID:`, row.id);
                    console.log(`Row ${index} ID type:`, typeof row.id);
                    return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.dateOfBooking || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.port || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.grade || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatIndianNumber(row.qty || '0')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(row.bookingRate || '0.00')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(row.commission || '0.00')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.commissionCurrency || 'USD'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.exchRate || '0.0000'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.customDuty || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(row.clearanceCharges || '0.00')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(row.netLanded || '0.00')}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state when filters return no results */}
        {!loading && bookingData.length > 0 && filteredData.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="mx-auto max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl text-gray-400">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">No Matching Transactions Found</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                No transactions match your current filter criteria. Try adjusting your filters or reset them to see all transactions.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setFilters({ completed: '', status: '' })}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition shadow-md flex items-center justify-center gap-2"
                >
                  <span>🔄</span>
                  <span>Reset All Filters</span>
                </button>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md transition transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span>➕</span>
                  <span>Add New Transaction</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no data at all */}
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
                onClick={() => {
                  setShowAddForm(true);
                  setCustomPort(''); // Clear custom port when opening form
                }}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md transition transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>➕</span>
                <span>Add Transaction</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}