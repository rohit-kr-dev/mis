"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Search, Edit2, Trash2, X, Check, Plus, Package } from 'lucide-react';

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

  // Real-time subscription to items collection
  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData: Item[] = [];
      snapshot.forEach((doc) => {
        itemsData.push({
          id: doc.id,
          ...doc.data()
        } as Item);
      });
      setItems(itemsData);
    }, (error) => {
      console.error('Error fetching items:', error);
      setMessage('Error loading items');
    });

    return () => unsubscribe();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Items Master
              </h1>
              <p className="text-gray-600 mt-1">Manage your inventory items efficiently</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-indigo-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Plus className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Add New Item</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Name */}
            <div>
              <label htmlFor="itemName" className="block text-sm font-semibold text-gray-700 mb-2">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors disabled:bg-gray-100"
                placeholder="Enter item name"
              />
            </div>

            {/* Material Type */}
            <div>
              <label htmlFor="materialType" className="block text-sm font-semibold text-gray-700 mb-2">
                Material Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="materialType"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors disabled:bg-gray-100"
                placeholder="Enter material type"
              />
            </div>

            {/* HSN Code */}
            <div>
              <label htmlFor="hsnCode" className="block text-sm font-semibold text-gray-700 mb-2">
                HSN Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="hsnCode"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors disabled:bg-gray-100"
                placeholder="Enter HSN code"
              />
            </div>

            {/* Product Category */}
            <div>
              <label htmlFor="productCategory" className="block text-sm font-semibold text-gray-700 mb-2">
                Product Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="productCategory"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors disabled:bg-gray-100"
                placeholder="Enter product category"
              />
            </div>

            {/* Company */}
            <div className="md:col-span-2">
              <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors disabled:bg-gray-100"
                placeholder="Enter company name"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Item...' : 'Add Item'}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`mt-4 p-4 rounded-xl font-medium ${
              message.includes('Error') || message.includes('fill') 
                ? 'bg-red-50 text-red-700 border-2 border-red-200' 
                : 'bg-green-50 text-green-700 border-2 border-green-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
          <div className="px-6 py-5 bg-gradient-to-r from-indigo-500 to-purple-600">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Items List</h2>
                <p className="text-indigo-100 mt-1">Total items: {items.length}</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-300 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="w-full md:w-80 pl-10 pr-4 py-2.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-indigo-200 focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-200">
                    SL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-200">
                    Item Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-200">
                    Material Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-200">
                    HSN Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-200">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-200">
                    Company
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg font-medium">
                          {searchTerm ? 'No items found matching your search' : 'No items found. Add your first item above.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-indigo-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.itemName}
                            onChange={(e) => setEditingItem({...editingItem, itemName: e.target.value})}
                            className="w-full px-2 py-1.5 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-900 font-semibold">{item.itemName}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.materialType}
                            onChange={(e) => setEditingItem({...editingItem, materialType: e.target.value})}
                            className="w-full px-2 py-1.5 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-700">{item.materialType}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.hsnCode}
                            onChange={(e) => setEditingItem({...editingItem, hsnCode: e.target.value})}
                            className="w-full px-2 py-1.5 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">{item.hsnCode}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.productCategory}
                            onChange={(e) => setEditingItem({...editingItem, productCategory: e.target.value})}
                            className="w-full px-2 py-1.5 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-700">{item.productCategory}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingItem?.id === item.id ? (
                          <input
                            type="text"
                            value={editingItem.company}
                            onChange={(e) => setEditingItem({...editingItem, company: e.target.value})}
                            className="w-full px-2 py-1.5 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-700 font-medium">{item.company}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {editingItem?.id === item.id ? (
                            <>
                              <button
                                onClick={handleUpdate}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
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
          {filteredItems.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-indigo-600">{filteredItems.length}</span> of <span className="font-semibold text-indigo-600">{items.length}</span> items
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}