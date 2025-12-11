"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Search, Edit2, Trash2, X, Check, Plus, Package, RefreshCw, Sparkles } from 'lucide-react';

interface Item {
  id: string;
  itemName: string;
  materialType: string;
  hsnCode: string;
  productCategory: string;
  company: string;
  createdAt: any;
  updatedAt: any;
}

export default function ItemsMasterPage() {
  // Form state
  const [itemName, setItemName] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [company, setCompany] = useState('');
  
  // UI state
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Manual fetch function - only loads when called
  const fetchItems = async () => {
    setFetchLoading(true);
    try {
      const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const itemsData: Item[] = [];
      snapshot.forEach((doc) => {
        itemsData.push({
          id: doc.id,
          ...doc.data()
        } as Item);
      });
      
      setItems(itemsData);
      setDataLoaded(true);
      setMessage('Data loaded successfully!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error fetching items:', error);
      setMessage('Error loading items');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setFetchLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!itemName.trim() || !materialType.trim() || !hsnCode.trim() || 
        !productCategory.trim() || !company.trim()) {
      setMessage('Please fill in all fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'items'), {
        itemName: itemName.trim(),
        materialType: materialType.trim(),
        hsnCode: hsnCode.trim(),
        productCategory: productCategory.trim(),
        company: company.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setItemName('');
      setMaterialType('');
      setHsnCode('');
      setProductCategory('');
      setCompany('');

      setMessage('Item added successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      // Auto-refresh data after adding
      if (dataLoaded) {
        await fetchItems();
      }
    } catch (error) {
      console.error('Error adding item:', error);
      setMessage('Error adding item. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'items', id));
        setMessage('Item deleted successfully!');
        setTimeout(() => setMessage(''), 2000);
        
        // Refresh data after delete
        await fetchItems();
      } catch (error) {
        console.error('Error deleting item:', error);
        setMessage('Error deleting item');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingItem) return;
    
    try {
      await updateDoc(doc(db, 'items', editingItem.id), {
        itemName: editingItem.itemName,
        materialType: editingItem.materialType,
        hsnCode: editingItem.hsnCode,
        productCategory: editingItem.productCategory,
        company: editingItem.company,
        updatedAt: serverTimestamp(),
      });
      setEditingItem(null);
      setMessage('Item updated successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      // Refresh data after update
      await fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
      setMessage('Error updating item');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.materialType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header with Sparkle Effect */}
        <div className="mb-8 relative">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
          
          <div className="relative flex items-center gap-4 mb-2">
            <div className="p-4 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform">
              <Package className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Items Master
                </h1>
                <Sparkles className="w-8 h-8 text-fuchsia-500 animate-pulse" />
              </div>
              <p className="text-gray-600 mt-2 text-lg">Manage your inventory items with optimized Firebase reads</p>
            </div>
          </div>
        </div>

        {/* Form Card with Glass Effect */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border-2 border-purple-100 hover:shadow-purple-200/50 transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-xl">
              <Plus className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">Add New Item</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Name */}
            <div className="group">
              <label htmlFor="itemName" className="block text-sm font-bold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all disabled:bg-gray-100 hover:border-purple-300"
                placeholder="Enter item name"
              />
            </div>

            {/* Material Type */}
            <div className="group">
              <label htmlFor="materialType" className="block text-sm font-bold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                Material Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="materialType"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all disabled:bg-gray-100 hover:border-purple-300"
                placeholder="Enter material type"
              />
            </div>

            {/* HSN Code */}
            <div className="group">
              <label htmlFor="hsnCode" className="block text-sm font-bold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                HSN Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="hsnCode"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all disabled:bg-gray-100 hover:border-purple-300"
                placeholder="Enter HSN code"
              />
            </div>

            {/* Product Category */}
            <div className="group">
              <label htmlFor="productCategory" className="block text-sm font-bold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                Product Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="productCategory"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all disabled:bg-gray-100 hover:border-purple-300"
                placeholder="Enter product category"
              />
            </div>

            {/* Company */}
            <div className="md:col-span-2 group">
              <label htmlFor="company" className="block text-sm font-bold text-gray-700 mb-2 group-hover:text-purple-600 transition-colors">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all disabled:bg-gray-100 hover:border-purple-300"
                placeholder="Enter company name"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 transition-all shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              {loading ? 'Adding Item...' : 'Add Item'}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-xl font-semibold shadow-lg transform transition-all ${
              message.includes('Error') || message.includes('fill') 
                ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-2 border-red-300' 
                : 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 border-2 border-green-300'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Items Table with Beautiful Styling */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border-2 border-purple-100">
          <div className="px-8 py-6 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                  Items List
                  {dataLoaded && <span className="text-xl font-normal text-purple-100">({items.length} total)</span>}
                </h2>
                <p className="text-purple-100 mt-2 text-sm">
                  {dataLoaded ? 'Click refresh to update data' : 'Click "Load Items" to fetch data'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search items..."
                    className="w-full sm:w-72 pl-12 pr-4 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all font-medium"
                  />
                </div>
                <button
                  onClick={fetchItems}
                  disabled={fetchLoading}
                  className="px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                >
                  <RefreshCw className={`w-5 h-5 ${fetchLoading ? 'animate-spin' : ''}`} />
                  {fetchLoading ? 'Loading...' : dataLoaded ? 'Refresh' : 'Load Items'}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-purple-700 uppercase tracking-wider border-b-2 border-purple-200">
                    SL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-purple-700 uppercase tracking-wider border-b-2 border-purple-200">
                    Item Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-purple-700 uppercase tracking-wider border-b-2 border-purple-200">
                    Material Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-purple-700 uppercase tracking-wider border-b-2 border-purple-200">
                    HSN Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-purple-700 uppercase tracking-wider border-b-2 border-purple-200">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-purple-700 uppercase tracking-wider border-b-2 border-purple-200">
                    Company
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black text-purple-700 uppercase tracking-wider border-b-2 border-purple-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-purple-100">
                {!dataLoaded ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-6 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-3xl mb-6">
                          <Package className="w-20 h-20 text-purple-400" />
                        </div>
                        <p className="text-gray-700 text-xl font-bold mb-2">
                          No data loaded yet
                        </p>
                        <p className="text-gray-500 text-sm mb-6">
                          Click the "Load Items" button above to fetch your items
                        </p>
                        <button
                          onClick={fetchItems}
                          disabled={fetchLoading}
                          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-fuchsia-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                          {fetchLoading ? 'Loading...' : 'Load Items'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-6 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-3xl mb-4">
                          <Package className="w-20 h-20 text-purple-400" />
                        </div>
                        <p className="text-gray-700 text-xl font-bold mb-2">
                          {searchTerm ? 'No items found matching your search' : 'No items found'}
                        </p>
                        <p className="text-gray-500">
                          {searchTerm ? 'Try adjusting your search terms' : 'Add your first item using the form above'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-fuchsia-50 transition-all group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-100 to-fuchsia-100 text-purple-700 font-bold rounded-lg group-hover:from-purple-200 group-hover:to-fuchsia-200 transition-all">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.itemName}
                            onChange={(e) => setEditingItem({...editingItem, itemName: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                          />
                        ) : (
                          <span className="text-gray-900 font-bold text-base">{item.itemName}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.materialType}
                            onChange={(e) => setEditingItem({...editingItem, materialType: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                          />
                        ) : (
                          <span className="text-gray-700 font-medium">{item.materialType}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.hsnCode}
                            onChange={(e) => setEditingItem({...editingItem, hsnCode: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                          />
                        ) : (
                          <span className="inline-block text-gray-700 font-mono font-semibold bg-gradient-to-r from-purple-50 to-fuchsia-50 px-3 py-1.5 rounded-lg border border-purple-200">{item.hsnCode}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.productCategory}
                            onChange={(e) => setEditingItem({...editingItem, productCategory: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                          />
                        ) : (
                          <span className="text-gray-700 font-medium">{item.productCategory}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.company}
                            onChange={(e) => setEditingItem({...editingItem, company: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                          />
                        ) : (
                          <span className="text-gray-700 font-semibold">{item.company}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {editingItem?.id === item.id ? (
                            <>
                              <button
                                onClick={handleUpdate}
                                className="p-2.5 bg-gradient-to-br from-green-100 to-emerald-100 text-green-600 rounded-lg hover:from-green-200 hover:to-emerald-200 transition-all transform hover:scale-110 shadow-md"
                                title="Save"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="p-2.5 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all transform hover:scale-110 shadow-md"
                                title="Cancel"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-2.5 bg-gradient-to-br from-purple-100 to-fuchsia-100 text-purple-600 rounded-lg hover:from-purple-200 hover:to-fuchsia-200 transition-all transform hover:scale-110 shadow-md"
                                title="Edit"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2.5 bg-gradient-to-br from-red-100 to-rose-100 text-red-600 rounded-lg hover:from-red-200 hover:to-rose-200 transition-all transform hover:scale-110 shadow-md"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {dataLoaded && filteredItems.length > 0 && (
            <div className="px-8 py-5 bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-50 border-t-2 border-purple-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  Showing <span className="text-lg font-bold text-purple-600">{filteredItems.length}</span> of <span className="text-lg font-bold text-purple-600">{items.length}</span> items
                </p>
                <button
                  onClick={fetchItems}
                  disabled={fetchLoading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold rounded-lg hover:from-purple-700 hover:to-fuchsia-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchLoading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}