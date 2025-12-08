"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';

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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
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

      // Clear form
      setItemName('');
      setMaterialType('');
      setHsnCode('');
      setProductCategory('');
      setCompany('');

      // Show success message
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Items Master</h1>
          <p className="text-gray-600 mt-2">Manage your inventory items</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Add New Item</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Name */}
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter item name"
              />
            </div>

            {/* Material Type */}
            <div>
              <label htmlFor="materialType" className="block text-sm font-medium text-gray-700 mb-2">
                Material Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="materialType"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter material type"
              />
            </div>

            {/* HSN Code */}
            <div>
              <label htmlFor="hsnCode" className="block text-sm font-medium text-gray-700 mb-2">
                HSN Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="hsnCode"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter HSN code"
              />
            </div>

            {/* Product Category */}
            <div>
              <label htmlFor="productCategory" className="block text-sm font-medium text-gray-700 mb-2">
                Product Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="productCategory"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter product category"
              />
            </div>

            {/* Company */}
            <div className="md:col-span-2">
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter company name"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Item...' : 'Add Item'}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`mt-4 p-3 rounded-md ${
              message.includes('Error') || message.includes('fill') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Items List</h2>
            <p className="text-sm text-gray-600 mt-1">Total items: {items.length}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    HSN Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Product Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Company
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No items found. Add your first item above.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.itemName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.materialType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.hsnCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.productCategory}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.company}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}