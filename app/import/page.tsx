"use client";

import { useState, useEffect } from 'react';

interface BookingData {
  id: number;
  dateOfBooking: string;
  vendor: string;
  port: string;
  grade: string;
  qty: string;
  commissionUSD: string;
  commissionINR: string;
  exchRate: string;
  customDuty: string;
  clearanceCharges: string;
  netLanded: string;
  status: string;
  completed: string;
}

export default function ImportPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData[]>([]);
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [formData, setFormData] = useState<BookingData>({
    id: 0,
    dateOfBooking: '',
    vendor: '',
    port: '',
    grade: '',
    qty: '',
    commissionUSD: '',
    commissionINR: '',
    exchRate: '',
    customDuty: '',
    clearanceCharges: '',
    netLanded: '',
    status: '',
    completed: ''
  });

  const handleFormChange = (field: keyof BookingData, value: string) => {
    setFormData(prev => {
      const updatedForm = { ...prev, [field]: value };
      
      // Get current values
      const usdValue = parseFloat(updatedForm.commissionUSD || '0');
      const inrValue = parseFloat(updatedForm.commissionINR || '0');
      const exchRate = parseFloat(updatedForm.exchRate || '0');
      
      // Live conversion logic
      if (field === 'commissionUSD' && value) {
        // When USD changes, update INR
        const newUsdValue = parseFloat(value);
        if (!isNaN(newUsdValue) && exchRate > 0) {
          updatedForm.commissionINR = (newUsdValue * exchRate).toFixed(2);
        } else if (!isNaN(newUsdValue)) {
          updatedForm.commissionINR = '0.00';
        }
      }
      
      if (field === 'commissionINR' && value) {
        // When INR changes, update USD
        const newInrValue = parseFloat(value);
        if (!isNaN(newInrValue) && exchRate > 0) {
          updatedForm.commissionUSD = (newInrValue / exchRate).toFixed(2);
        } else if (!isNaN(newInrValue)) {
          updatedForm.commissionUSD = '0.00';
        }
      }
      
      if (field === 'exchRate' && value) {
        // When exchange rate changes, recalculate both directions
        const newExchRate = parseFloat(value);
        if (!isNaN(newExchRate) && newExchRate > 0) {
          // Recalculate INR from existing USD
          if (usdValue > 0) {
            updatedForm.commissionINR = (usdValue * newExchRate).toFixed(2);
          }
          // If we have INR but no USD, recalculate USD
          else if (inrValue > 0) {
            updatedForm.commissionUSD = (inrValue / newExchRate).toFixed(2);
          }
        } else {
          // Invalid exchange rate, reset both if they exist
          if (usdValue > 0 || inrValue > 0) {
            updatedForm.commissionINR = '0.00';
            updatedForm.commissionUSD = '0.00';
          }
        }
      }
      
      return updatedForm;
    });
  };

  const handleAddTransaction = () => {
    // Ensure both commission fields are consistent before saving
    const usdValue = parseFloat(formData.commissionUSD || '0');
    const inrValue = parseFloat(formData.commissionINR || '0');
    const exchRate = parseFloat(formData.exchRate || '0');
    
    // Validate and sync commission values
    let finalUsd = formData.commissionUSD;
    let finalInr = formData.commissionINR;
    
    if (exchRate > 0) {
      // If we have USD but no INR, calculate INR
      if (usdValue > 0 && (isNaN(inrValue) || inrValue === 0)) {
        finalInr = (usdValue * exchRate).toFixed(2);
      }
      // If we have INR but no USD, calculate USD
      else if (inrValue > 0 && (isNaN(usdValue) || usdValue === 0)) {
        finalUsd = (inrValue / exchRate).toFixed(2);
      }
    }
    
    const newTransaction = {
      ...formData,
      commissionUSD: finalUsd,
      commissionINR: finalInr,
      id: Date.now()
    };
    
    setBookingData(prev => [...prev, newTransaction]);
    
    // Reset form
    setFormData({
      id: 0,
      dateOfBooking: '',
      vendor: '',
      port: '',
      grade: '',
      qty: '',
      commissionUSD: '',
      commissionINR: '',
      exchRate: '',
      customDuty: '',
      clearanceCharges: '',
      netLanded: '',
      status: '',
      completed: ''
    });
    
    setShowAddForm(false);
  };

  const removeTransaction = (id: number) => {
    setBookingData(prev => prev.filter(item => item.id !== id));
  };

  // Fetch live exchange rate
  const fetchExchangeRate = async () => {
    try {
      setLoadingRate(true);
      const API_KEY = '2b6e56cdcac338867b2edbe8';
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
      const data = await response.json();
      
      if (data.result === 'success' && data.conversion_rates?.INR) {
        const rate = data.conversion_rates.INR;
        setCurrentExchangeRate(rate);
        
        // Auto-fill exchange rate in form if it's empty
        if (!formData.exchRate) {
          setFormData(prev => ({
            ...prev,
            exchRate: rate.toFixed(4)
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
    } finally {
      setLoadingRate(false);
    }
  };

  // Fetch rate on component mount
  useEffect(() => {
    fetchExchangeRate();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchExchangeRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
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
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-md flex items-center space-x-2"
              >
                <span>{showAddForm ? '❌' : '➕'}</span>
                <span>{showAddForm ? 'Cancel' : 'Add Transaction'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="mr-2">📝</span>
                Add New Booking Transaction
              </h2>
              <p className="text-gray-600 mt-1">Fill in the transaction details below</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Column 1 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📅 Date of Booking</label>
                  <input 
                    type="date" 
                    value={formData.dateOfBooking} 
                    onChange={(e) => handleFormChange('dateOfBooking', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Vendor</label>
                  <select
                    value={formData.vendor}
                    onChange={(e) => handleFormChange('vendor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Select Vendor</option>
                    <option value="Synthetic">Synthetic</option>
                    <option value="Other Vendor">Other Vendor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Grade</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => handleFormChange('grade', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Select Grade</option>
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                  </select>
                </div>
                

              </div>
              
              {/* Column 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🚢 Port</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">⚖️ Qty (Kg)</label>
                  <input 
                    type="number" 
                    value={formData.qty} 
                    onChange={(e) => handleFormChange('qty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">💵 Commission (US $)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.commissionUSD} 
                    onChange={(e) => handleFormChange('commissionUSD', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              {/* Column 3 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">💱 Exch Rate</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.0001" 
                      value={formData.exchRate} 
                      onChange={(e) => handleFormChange('exchRate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20"
                      placeholder="e.g., 83.5000"
                      title="Exchange rate for converting between USD and INR"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {loadingRate ? '...' : currentExchangeRate ? `₹${currentExchangeRate.toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Live USD-INR rate: {loadingRate ? 'Loading...' : currentExchangeRate ? currentExchangeRate.toFixed(4) : 'Unavailable'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">💸 Custom Duty</label>
                  <select
                    value={formData.customDuty}
                    onChange={(e) => handleFormChange('customDuty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Select Custom Duty</option>
                    <option value="5%">5%</option>
                    <option value="7.5%">7.5%</option>
                    <option value="10%">10%</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📦 Net Landed (Kg)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.netLanded} 
                    onChange={(e) => handleFormChange('netLanded', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📊 Status</label>
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
              </div>
              
              {/* Column 4 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">💴 Commission (INR)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.commissionINR} 
                    onChange={(e) => handleFormChange('commissionINR', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🚛 Clearance Charges</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">✅ Completed</label>
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
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <span className="text-blue-500 mr-3 mt-0.5 text-lg">🔄</span>
                <div>
                  <h3 className="font-semibold text-blue-800 mb-2">Live Currency Conversion</h3>
                  <p className="text-sm text-blue-700 mb-2">Enter values in either Commission (US $) or Commission (INR) field along with the Exchange Rate for real-time conversion.</p>
                  <div className="text-xs text-blue-600 space-y-1">
                    <div>• Change USD value → INR updates automatically</div>
                    <div>• Change INR value → USD updates automatically</div>
                    <div>• Change Exchange Rate → Both values recalculate</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleAddTransaction}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-md transition transform hover:scale-105 flex items-center space-x-2"
              >
                <span>💾</span>
                <span>Save Transaction</span>
              </button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {bookingData.length > 0 && (
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comm ($)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comm (₹)</th>
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
                  {bookingData.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">{row.dateOfBooking || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.port || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.grade || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.qty || '0'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">${row.commissionUSD || '0.00'}</td>
                      <td className={`px-4 py-3 text-sm ${(!row.commissionINR || row.commissionINR === '0.00') && row.commissionUSD && row.commissionUSD !== '0.00' && (!row.exchRate || row.exchRate === '0.0000') ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                        ₹{row.commissionINR || '0.00'}
                        {(!row.commissionINR || row.commissionINR === '0.00') && row.commissionUSD && row.commissionUSD !== '0.00' && (!row.exchRate || row.exchRate === '0.0000') && (
                          <span className="ml-1 text-xs text-orange-500" title="Enter exchange rate to convert">⚠️</span>
                        )}
                      </td>
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
                      <td className="px-4 py-3 text-sm text-center">
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

        {bookingData.length === 0 && !showAddForm && (
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
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Tip:</span> You can auto-convert between USD and INR by entering either commission value along with the exchange rate.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}