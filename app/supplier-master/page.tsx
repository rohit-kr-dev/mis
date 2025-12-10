"use client";

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Edit2, Trash2, X, Check, Plus } from 'lucide-react';

export default function SupplierMasterPage() {
  // Form states
  const [supplierName, setSupplierName] = useState('');
  const [alias, setAlias] = useState('');
  const [supplierMessage, setSupplierMessage] = useState('');
  const [supplierLoading, setSupplierLoading] = useState(false);

  const [period, setPeriod] = useState('');
  const [periodMessage, setPeriodMessage] = useState('');
  const [periodLoading, setPeriodLoading] = useState(false);

  const [type, setType] = useState('');
  const [typeMessage, setTypeMessage] = useState('');
  const [typeLoading, setTypeLoading] = useState(false);

  // Data states
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [workingSheet, setWorkingSheet] = useState<any[]>([]);
  const [existingCompanies, setExistingCompanies] = useState<string[]>([]);

  // Search states
  const [supplierSearch, setSupplierSearch] = useState('');
  const [periodSearch, setPeriodSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');

  // Edit states
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);
  const [editingType, setEditingType] = useState<any>(null);

  // Subscribe to collections
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'suppliers'),
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setSuppliers(data);
      },
      (error) => console.error('Error fetching suppliers:', error)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'periods'),
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setPeriods(data);
      },
      (error) => console.error('Error fetching periods:', error)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'types'),
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setTypes(data);
      },
      (error) => console.error('Error fetching types:', error)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setItems(data);
      },
      (error) => console.error('Error fetching items:', error)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'workingSheet'),
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setWorkingSheet(data);
      },
      (error) => console.error('Error fetching workingSheet:', error)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'supplierWiseMonthly'),
      (snapshot) => {
        const companies = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.company) {
            companies.add(data.company);
          }
        });
        setExistingCompanies(Array.from(companies));
      },
      (error) => console.error('Error fetching existing companies:', error)
    );
    return () => unsubscribe();
  }, []);

  const vlookupType = (company: string): string => {
    if (!company.trim()) return '';
    const item = items.find(i => i.company?.toLowerCase() === company.toLowerCase());
    return item?.materialType || 'Unknown';
  };

  const generateSingleCombination = async (companyName: string, periodValue: string, supplierData: any) => {
    const type = vlookupType(companyName);

    const discounts = workingSheet
      .filter((record: any) => 
        record.supplierName === supplierData.supplierName &&
        record.company?.toLowerCase() === companyName.toLowerCase() &&
        record.type === 'Discounts' &&
        record.cnMonth === periodValue
      )
      .reduce((sum: number, record: any) => sum + (record.qty || 0), 0);

    const outrightWithDiscounts = workingSheet
      .filter((record: any) => 
        record.supplierName === supplierData.supplierName &&
        record.company?.toLowerCase() === companyName.toLowerCase() &&
        record.type === 'Outright with Discounts' &&
        record.cnMonth === periodValue
      )
      .reduce((sum: number, record: any) => sum + (record.qty || 0), 0);

    const outright = workingSheet
      .filter((record: any) => 
        record.supplierName === supplierData.supplierName &&
        record.company?.toLowerCase() === companyName.toLowerCase() &&
        record.type === 'Outright' &&
        record.cnMonth === periodValue
      )
      .reduce((sum: number, record: any) => sum + (record.qty || 0), 0);

    const total = discounts + outrightWithDiscounts + outright;

    await addDoc(collection(db, 'supplierWiseMonthly'), {
      month: periodValue,
      supplier: supplierData.supplierName,
      type: type,
      company: companyName,
      discounts: discounts,
      outrightWithDiscounts: outrightWithDiscounts,
      outright: outright,
      total: total,
      createdAt: new Date()
    });
  };

  const handleSupplierSubmit = async () => {
    if (!supplierName.trim() || !alias.trim()) {
      setSupplierMessage('Please fill in all fields');
      setTimeout(() => setSupplierMessage(''), 3000);
      return;
    }
    
    setSupplierLoading(true);
    
    try {
      const docRef = await addDoc(collection(db, 'suppliers'), {
        supplierName: supplierName.trim(),
        alias: alias.trim(),
        createdAt: new Date(),
      });

      if (existingCompanies.length > 0 && periods.length > 0) {
        const newSupplierData = {
          id: docRef.id,
          supplierName: supplierName.trim(),
          alias: alias.trim()
        };

        let combinationsCreated = 0;
        for (const company of existingCompanies) {
          for (const periodData of periods) {
            await generateSingleCombination(company, periodData.period, newSupplierData);
            combinationsCreated++;
          }
        }

        setSupplierMessage(`Supplier added! Generated ${combinationsCreated} combinations`);
      } else {
        setSupplierMessage('Supplier added successfully!');
      }
      
      setSupplierName('');
      setAlias('');
      setTimeout(() => setSupplierMessage(''), 5000);
    } catch (error) {
      console.error('Error adding supplier:', error);
      setSupplierMessage('Error adding supplier. Please try again.');
      setTimeout(() => setSupplierMessage(''), 3000);
    } finally {
      setSupplierLoading(false);
    }
  };

  const handlePeriodSubmit = async () => {
    if (!period.trim()) {
      setPeriodMessage('Please fill in the period field');
      setTimeout(() => setPeriodMessage(''), 3000);
      return;
    }
    
    setPeriodLoading(true);
    
    try {
      await addDoc(collection(db, 'periods'), {
        period: period.trim(),
        createdAt: new Date(),
      });

      if (existingCompanies.length > 0 && suppliers.length > 0) {
        const newPeriod = period.trim();
        
        let combinationsCreated = 0;
        for (const company of existingCompanies) {
          for (const supplierData of suppliers) {
            await generateSingleCombination(company, newPeriod, supplierData);
            combinationsCreated++;
          }
        }

        setPeriodMessage(`Period added! Generated ${combinationsCreated} combinations`);
      } else {
        setPeriodMessage('Period added successfully!');
      }
      
      setPeriod('');
      setTimeout(() => setPeriodMessage(''), 5000);
    } catch (error) {
      console.error('Error adding period:', error);
      setPeriodMessage('Error adding period. Please try again.');
      setTimeout(() => setPeriodMessage(''), 3000);
    } finally {
      setPeriodLoading(false);
    }
  };

  const handleTypeSubmit = async () => {
    if (!type.trim()) {
      setTypeMessage('Please fill in the type field');
      setTimeout(() => setTypeMessage(''), 3000);
      return;
    }
    
    setTypeLoading(true);
    
    try {
      await addDoc(collection(db, 'types'), {
        type: type.trim(),
        createdAt: new Date(),
      });
      
      setTypeMessage('Type added successfully!');
      setType('');
      setTimeout(() => setTypeMessage(''), 3000);
    } catch (error) {
      console.error('Error adding type:', error);
      setTypeMessage('Error adding type. Please try again.');
      setTimeout(() => setTypeMessage(''), 3000);
    } finally {
      setTypeLoading(false);
    }
  };

  // Delete functions
  const handleDeleteSupplier = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteDoc(doc(db, 'suppliers', id));
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (confirm('Are you sure you want to delete this period?')) {
      try {
        await deleteDoc(doc(db, 'periods', id));
      } catch (error) {
        console.error('Error deleting period:', error);
      }
    }
  };

  const handleDeleteType = async (id: string) => {
    if (confirm('Are you sure you want to delete this type?')) {
      try {
        await deleteDoc(doc(db, 'types', id));
      } catch (error) {
        console.error('Error deleting type:', error);
      }
    }
  };

  // Update functions
  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    
    try {
      await updateDoc(doc(db, 'suppliers', editingSupplier.id), {
        supplierName: editingSupplier.supplierName,
        alias: editingSupplier.alias,
      });
      setEditingSupplier(null);
    } catch (error) {
      console.error('Error updating supplier:', error);
    }
  };

  const handleUpdatePeriod = async () => {
    if (!editingPeriod) return;
    
    try {
      await updateDoc(doc(db, 'periods', editingPeriod.id), {
        period: editingPeriod.period,
      });
      setEditingPeriod(null);
    } catch (error) {
      console.error('Error updating period:', error);
    }
  };

  const handleUpdateType = async () => {
    if (!editingType) return;
    
    try {
      await updateDoc(doc(db, 'types', editingType.id), {
        type: editingType.type,
      });
      setEditingType(null);
    } catch (error) {
      console.error('Error updating type:', error);
    }
  };

  // Filter functions
  const filteredSuppliers = suppliers.filter(s => 
    s.supplierName?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.alias?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredPeriods = periods.filter(p => 
    p.period?.toLowerCase().includes(periodSearch.toLowerCase())
  );

  const filteredTypes = types.filter(t => 
    t.type?.toLowerCase().includes(typeSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Supplier Master
          </h1>
          <p className="text-gray-600">Manage suppliers, periods, and types with ease</p>
        </div>

        {/* Info Banner */}
        {existingCompanies.length > 0 && (
          <div className="mb-8 p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
            <p className="text-sm text-white">
              <strong>🚀 Auto-Combination Enabled:</strong> New suppliers or periods will auto-generate {existingCompanies.length} combinations
            </p>
          </div>
        )}
        
        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Supplier Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Add Supplier</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  disabled={supplierLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-100"
                  placeholder="Enter supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alias <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  disabled={supplierLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-100"
                  placeholder="Enter alias"
                />
              </div>
              <button
                onClick={handleSupplierSubmit}
                disabled={supplierLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {supplierLoading ? 'Adding...' : 'Add Supplier'}
              </button>
              {supplierMessage && (
                <p className={`text-sm font-medium ${supplierMessage.includes('Error') || supplierMessage.includes('fill') ? 'text-red-600' : 'text-green-600'}`}>
                  {supplierMessage}
                </p>
              )}
            </div>
          </div>

          {/* Period Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-green-100 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Add Period</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Period <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  disabled={periodLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors disabled:bg-gray-100"
                  placeholder="e.g., Q1 2024"
                />
              </div>
              <button
                onClick={handlePeriodSubmit}
                disabled={periodLoading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {periodLoading ? 'Adding...' : 'Add Period'}
              </button>
              {periodMessage && (
                <p className={`text-sm font-medium ${periodMessage.includes('Error') || periodMessage.includes('fill') ? 'text-red-600' : 'text-green-600'}`}>
                  {periodMessage}
                </p>
              )}
            </div>
          </div>

          {/* Type Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-purple-100 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Plus className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Add Type</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={typeLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors disabled:bg-gray-100"
                  placeholder="Enter type"
                />
              </div>
              <button
                onClick={handleTypeSubmit}
                disabled={typeLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {typeLoading ? 'Adding...' : 'Add Type'}
              </button>
              {typeMessage && (
                <p className={`text-sm font-medium ${typeMessage.includes('Error') || typeMessage.includes('fill') ? 'text-red-600' : 'text-green-600'}`}>
                  {typeMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tables Section */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-gray-900">Current Data</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Suppliers Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
                <h3 className="text-lg font-bold text-white">Suppliers ({suppliers.length})</h3>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="Search suppliers..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">SL</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Alias</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            No suppliers found
                          </td>
                        </tr>
                      ) : (
                        filteredSuppliers.map((supplier, idx) => (
                          <tr key={supplier.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-600 font-medium">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm">
                              {editingSupplier?.id === supplier.id ? (
                                <input
                                  type="text"
                                  value={editingSupplier.supplierName}
                                  onChange={(e) => setEditingSupplier({...editingSupplier, supplierName: e.target.value})}
                                  className="w-full px-2 py-1 border rounded"
                                />
                              ) : (
                                <span className="text-gray-900 font-medium">{supplier.supplierName}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {editingSupplier?.id === supplier.id ? (
                                <input
                                  type="text"
                                  value={editingSupplier.alias}
                                  onChange={(e) => setEditingSupplier({...editingSupplier, alias: e.target.value})}
                                  className="w-full px-2 py-1 border rounded"
                                />
                              ) : (
                                <span className="text-gray-700">{supplier.alias}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {editingSupplier?.id === supplier.id ? (
                                  <>
                                    <button
                                      onClick={handleUpdateSupplier}
                                      className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingSupplier(null)}
                                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setEditingSupplier(supplier)}
                                      className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSupplier(supplier.id)}
                                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
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
              </div>
            </div>

            {/* Periods Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-green-100">
              <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600">
                <h3 className="text-lg font-bold text-white">Periods ({periods.length})</h3>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={periodSearch}
                    onChange={(e) => setPeriodSearch(e.target.value)}
                    placeholder="Search periods..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">SL</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Period</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredPeriods.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                            No periods found
                          </td>
                        </tr>
                      ) : (
                        filteredPeriods.map((period, idx) => (
                          <tr key={period.id} className="hover:bg-green-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-600 font-medium">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm">
                              {editingPeriod?.id === period.id ? (
                                <input
                                  type="text"
                                  value={editingPeriod.period}
                                  onChange={(e) => setEditingPeriod({...editingPeriod, period: e.target.value})}
                                  className="w-full px-2 py-1 border rounded"
                                />
                              ) : (
                                <span className="text-gray-900 font-medium">{period.period}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {editingPeriod?.id === period.id ? (
                                  <>
                                    <button
                                      onClick={handleUpdatePeriod}
                                      className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingPeriod(null)}
                                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setEditingPeriod(period)}
                                      className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePeriod(period.id)}
                                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
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
              </div>
            </div>

            {/* Types Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-purple-100">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600">
                <h3 className="text-lg font-bold text-white">Types ({types.length})</h3>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    placeholder="Search types..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">SL</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTypes.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                            No types found
                          </td>
                        </tr>
                      ) : (
                        filteredTypes.map((type, idx) => (
                          <tr key={type.id} className="hover:bg-purple-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-600 font-medium">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm">
                              {editingType?.id === type.id ? (
                                <input
                                  type="text"
                                  value={editingType.type}
                                  onChange={(e) => setEditingType({...editingType, type: e.target.value})}
                                  className="w-full px-2 py-1 border rounded"
                                />
                              ) : (
                                <span className="text-gray-900 font-medium">{type.type}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {editingType?.id === type.id ? (
                                  <>
                                    <button
                                      onClick={handleUpdateType}
                                      className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingType(null)}
                                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setEditingType(type)}
                                      className="p-1.5 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteType(type.id)}
                                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
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
              </div>
            </div>
          </div>
        </div>

        {/* Existing Companies Section */}
        {existingCompanies.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Existing Companies ({existingCompanies.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {existingCompanies.map((company, index) => (
                <div 
                  key={index} 
                  className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 font-medium hover:shadow-md transition-shadow"
                >
                  {company}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}