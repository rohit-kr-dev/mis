{/* Refactored Form Layout for Import Page */}
{/* This is the corrected responsive layout structure */}

<div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-4 gap-6">
  {/* Left Section - Basic Info */}
  <div className="space-y-6">
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">📋</span>
        Basic Information
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date of Booking</label>
          <input 
            type="date" 
            value={formData.dateOfBooking} 
            onChange={(e) => handleFormChange('dateOfBooking', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">🏢 Vendor</label>
          <div 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white cursor-pointer"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${formData.vendor === supplier.supplierName ? 'bg-blue-100 text-blue-800' : 'text-gray-700'}`}
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
        
        <div>
          <SearchableDropdown
            options={grades.map(grade => ({ id: grade.id, name: grade.gradeName }))}
            value={formData.grade}
            onChange={(value) => handleFormChange('grade', value)}
            placeholder={grades.length === 0 ? 'Loading grades...' : 'Select Grade'}
            label="🏷️ Grade"
            disabled={grades.length === 0}
            searchKey="name"
            displayKey="name"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🚢</span>
        Shipment Details
      </h3>
      <div className="space-y-4">
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
      </div>
    </div>
  </div>
  
  {/* Middle Section - Financial Details */}
  <div className="lg:col-span-2 space-y-6">
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">💰</span>
        Financial Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Exchange Rate & Commission */}
        <div className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">💸 Commission</label>
            <div className="flex space-x-2">
              <input 
                type="number" 
                step="0.01" 
                value={formData.commission}
                onChange={(e) => handleFormChange('commission', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              <select
                value={formData.commissionCurrency}
                onChange={(e) => handleFormChange('commissionCurrency', e.target.value)}
                className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Right Column - Duty & Charges */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💸 Custom Duty</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">🧮 Calculated Custom Duty (L + 10%)</label>
            <input 
              type="number" 
              step="0.01" 
              value={formData.calculatedCustomDuty || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Formula: L + (L × 10%) where L = Custom Duty (percentage)</p>
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
        </div>
      </div>
    </div>
    
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">📈</span>
        Cost Calculation
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          <span className="font-medium">Formula:</span> ((Booking Rate × Exchange Rate) + (Booking Rate × Exchange Rate × Calculated Duty) + Clearance Charges + (Custom Duty × Exchange Rate) + Commission INR) ÷ 1000
        </p>
      </div>
    </div>
  </div>
  
  {/* Right Section - Status & Completion */}
  <div className="space-y-6">
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">✅</span>
        Status Tracking
      </h3>
      <div className="space-y-4">
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
    </div>
    
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-start">
        <span className="text-blue-500 mr-3 mt-0.5 text-lg">🔄</span>
        <div>
          <h3 className="font-semibold text-blue-800 mb-2">Live Currency Conversion</h3>
          <p className="text-sm text-blue-700 mb-3">Enter values in either Commission (US $) or Commission (INR) field along with the Exchange Rate for real-time conversion.</p>
          <div className="text-xs text-blue-600 space-y-1">
            <div>• Change USD value → INR updates automatically</div>
            <div>• Change INR value → USD updates automatically</div>
            <div>• Change Exchange Rate → Both values recalculate</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>