"use client";

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function SupplierMasterPage() {
  // Form 1 - Suppliers
  const [supplierName, setSupplierName] = useState('');
  const [alias, setAlias] = useState('');
  const [supplierMessage, setSupplierMessage] = useState('');
  const [supplierLoading, setSupplierLoading] = useState(false);

  // Form 2 - Periods
  const [period, setPeriod] = useState('');
  const [periodMessage, setPeriodMessage] = useState('');
  const [periodLoading, setPeriodLoading] = useState(false);

  // Form 3 - Types
  const [type, setType] = useState('');
  const [typeMessage, setTypeMessage] = useState('');
  const [typeLoading, setTypeLoading] = useState(false);

  // Real-time data from Firestore
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [workingSheet, setWorkingSheet] = useState<any[]>([]);
  const [existingCompanies, setExistingCompanies] = useState<string[]>([]);

  // Subscribe to suppliers collection
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

  // Subscribe to periods collection
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

  // Subscribe to types collection
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

  // Subscribe to items collection
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

  // Subscribe to workingSheet collection
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

  // Get all existing companies
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

  // VLOOKUP function
  const vlookupType = (company: string): string => {
    if (!company.trim()) return '';
    const item = items.find(i => i.company?.toLowerCase() === company.toLowerCase());
    return item?.materialType || 'Unknown';
  };

  // Generate combination for a single company-period-supplier
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

  // Handler for Supplier Form
  const handleSupplierSubmit = async () => {
    if (!supplierName.trim() || !alias.trim()) {
      setSupplierMessage('Please fill in all fields');
      setTimeout(() => setSupplierMessage(''), 3000);
      return;
    }
    
    setSupplierLoading(true);
    
    try {
      // Add the supplier
      const docRef = await addDoc(collection(db, 'suppliers'), {
        supplierName: supplierName.trim(),
        alias: alias.trim(),
        createdAt: new Date(),
      });

      // Generate combinations for all existing companies with this new supplier
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

        setSupplierMessage(`Supplier added! Generated ${combinationsCreated} combinations (${existingCompanies.length} companies × ${periods.length} periods)`);
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

  // Handler for Period Form
  const handlePeriodSubmit = async () => {
    if (!period.trim()) {
      setPeriodMessage('Please fill in the period field');
      setTimeout(() => setPeriodMessage(''), 3000);
      return;
    }
    
    setPeriodLoading(true);
    
    try {
      // Add the period
      await addDoc(collection(db, 'periods'), {
        period: period.trim(),
        createdAt: new Date(),
      });

      // Generate combinations for all existing companies with this new period
      if (existingCompanies.length > 0 && suppliers.length > 0) {
        const newPeriod = period.trim();
        
        let combinationsCreated = 0;
        for (const company of existingCompanies) {
          for (const supplierData of suppliers) {
            await generateSingleCombination(company, newPeriod, supplierData);
            combinationsCreated++;
          }
        }

        setPeriodMessage(`Period added! Generated ${combinationsCreated} combinations (${existingCompanies.length} companies × ${suppliers.length} suppliers)`);
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

  // Handler for Type Form
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

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Master</h1>
      <p className="text-gray-600 mb-2">Manage suppliers, periods, and types independently</p>
      {existingCompanies.length > 0 && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Auto-Combination Enabled:</strong> When you add a new Supplier or Period, combinations will be automatically created for all {existingCompanies.length} existing companies.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form 1 - Suppliers Collection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Supplier</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="supplierName" className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="supplierName"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                disabled={supplierLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter supplier name"
              />
            </div>
            <div>
              <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-1">
                Alias <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                disabled={supplierLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter alias"
              />
            </div>
            <button
              onClick={handleSupplierSubmit}
              disabled={supplierLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
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

        {/* Form 2 - Periods Collection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Period</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
                Period <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={periodLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                placeholder="Enter period (e.g., Q1 2024)"
              />
            </div>
            <button
              onClick={handlePeriodSubmit}
              disabled={periodLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors font-medium disabled:bg-green-400 disabled:cursor-not-allowed"
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

        {/* Form 3 - Types Collection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Type</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={typeLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                placeholder="Enter type"
              />
            </div>
            <button
              onClick={handleTypeSubmit}
              disabled={typeLoading}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors font-medium disabled:bg-purple-400 disabled:cursor-not-allowed"
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
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Data</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Suppliers Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <h3 className="text-lg font-semibold text-blue-900">Suppliers ({suppliers.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Alias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No suppliers added yet
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{supplier.supplierName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{supplier.alias}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Periods Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-100">
              <h3 className="text-lg font-semibold text-green-900">Periods ({periods.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {periods.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500 text-sm">
                        No periods added yet
                      </td>
                    </tr>
                  ) : (
                    periods.map((period) => (
                      <tr key={period.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{period.period}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Types Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
              <h3 className="text-lg font-semibold text-purple-900">Types ({types.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {types.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500 text-sm">
                        No types added yet
                      </td>
                    </tr>
                  ) : (
                    types.map((type) => (
                      <tr key={type.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{type.type}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Companies Info */}
      {existingCompanies.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Existing Companies ({existingCompanies.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {existingCompanies.map((company, index) => (
              <div key={index} className="bg-white px-3 py-2 rounded border border-gray-200 text-sm text-gray-700">
                {company}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}