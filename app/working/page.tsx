"use client";

import { useState, useEffect, useMemo } from 'react';

// Import Firebase
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

// Interfaces
interface Supplier {
  id: string;
  supplierName: string;
  alias: string;
}

interface Item {
  id: string;
  itemName: string;
  materialType: string;
  company: string;
  productCategory: string;
}

interface Period {
  id: string;
  period: string;
}

interface WorkingSheetData {
  id: string;
  slNo: number;
  category: string;
  branch: string;
  supplierName: string;
  alias: string;
  purchaseDate: string;
  billMonth: string;
  period: string;
  billNo: string;
  buyRate: number;
  qty: number;
  grade: string;
  itemName: string;
  company: string;
  productCategory: string;
  type: string;
  buyingTerms: string;
  dateForCN: string;
  cnMonth: string;
  ebiStatus: string; // "Yes" or "No" - after CN Month
  pp: number | null;
  source: string | null;
  rateAsPerConfirmation: number | null;
  rateAsPerPriceList: number | null;
  priceType: string | null;
  location: string | null;
  mou: number | null;
  qd: number | null;
  ebiValue: number | null; // Number value - after QD
  gsi: number | null;
  scheme: number | null;
  extra: number | null;
  loading: number | null;
  tpt: number | null;
  insurance: number | null;
  roundOff: number | null;
  commission: number | null;
  gstCn: number | null;
  total: number;
  diff: number;
  status: string;
  remarks: string;
  createdAt: any;
  updatedAt: any;
}

export default function Working() {
  // Data states
  const [workingSheetData, setWorkingSheetData] = useState<WorkingSheetData[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  // Filter states
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<WorkingSheetData>>({
    slNo: 0,
    category: '',
    branch: '',
    supplierName: '',
    purchaseDate: '',
    billNo: '',
    buyRate: 0,
    qty: 0,
    grade: '',
    itemName: '',
    type: '',
    buyingTerms: '',
    dateForCN: '',
    ebiStatus: 'No',
    status: 'Pending',
    remarks: ''
  });

  // Edit state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<WorkingSheetData>>({});
  const [showEditModal, setShowEditModal] = useState(false);

  // Real-time subscriptions
  useEffect(() => {
    const q = query(collection(db, 'workingSheet'), orderBy('slNo', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: WorkingSheetData[] = [];
      snapshot.forEach((docSnap) => {
        const docData = docSnap.data();
        
        // Helper function to convert Firestore Timestamp to YYYY-MM-DD format
        const convertTimestampToDateString = (timestamp: any): string => {
          if (!timestamp) return '';
          if (timestamp.seconds) {
            const date = new Date(timestamp.seconds * 1000);
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
          }
          if (timestamp instanceof Date) {
            return timestamp.toISOString().split('T')[0];
          }
          return timestamp; // Already a string
        };
        
        // Convert Firestore Timestamps to date strings
        data.push({ 
          id: docSnap.id, 
          ...docData,
          purchaseDate: convertTimestampToDateString(docData.purchaseDate),
          dateForCN: convertTimestampToDateString(docData.dateForCN),
          createdAt: docData.createdAt,
          updatedAt: docData.updatedAt
        } as WorkingSheetData);
      });
      setWorkingSheetData(data);
      console.log('Working sheet loaded:', data); // Debug log
    }, (error) => {
      console.error('Error fetching workingSheet:', error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('supplierName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Supplier[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Supplier);
      });
      setSuppliers(data);
      console.log('Suppliers loaded:', data); // Debug log
    }, (error) => {
      console.error('Error fetching suppliers:', error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('itemName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Item[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Item);
      });
      setItems(data);
      console.log('Items loaded:', data); // Debug log
    }, (error) => {
      console.error('Error fetching items:', error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'periods'), orderBy('period', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Period[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Period);
      });
      setPeriods(data);
      console.log('Periods loaded:', data); // Debug log
    }, (error) => {
      console.error('Error fetching periods:', error);
    });
    return () => unsubscribe();
  }, []);

  // Utility functions
  const formatDateToMonth = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]}-${date.getFullYear().toString().slice(-2)}`;
  };

  const lookupAlias = (supplierName: string): string => {
    const supplier = suppliers.find(s => s.supplierName === supplierName);
    return supplier?.alias || supplierName;
  };

  const lookupItemDetails = (grade: string): { itemName: string; company: string; productCategory: string } => {
    // Match grade with itemName in items collection
    const item = items.find(i => i.itemName.toLowerCase() === grade.toLowerCase());
    if (item) {
      console.log('Item found for grade:', grade, item); // Debug log
      return {
        itemName: item.itemName,
        company: item.company || '',
        productCategory: item.productCategory || ''
      };
    }
    console.log('No item found for grade:', grade); // Debug log
    return {
      itemName: grade,
      company: '',
      productCategory: ''
    };
  };

  const calculateTotal = (data: Partial<WorkingSheetData>): number => {
    const fields = [
      data.mou, data.qd, data.ebiValue, data.gsi, data.scheme,
      data.extra, data.loading, data.tpt, data.insurance,
      data.roundOff, data.commission, data.gstCn
    ];
    return fields.reduce((sum, val) => sum + (val || 0), 0);
  };

  const calculateDiff = (data: Partial<WorkingSheetData>): number => {
    const buyRate = data.buyRate || 0;
    const rateConfirm = data.rateAsPerConfirmation || 0;
    const ratePriceList = data.rateAsPerPriceList || 0;
    const total = calculateTotal(data);
    return buyRate - rateConfirm - ratePriceList - total;
  };

  // Handle form changes with auto-lookup
  const handleFormChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };

    // Auto-lookup alias
    if (field === 'supplierName') {
      updated.alias = lookupAlias(value);
    }

    // Auto-lookup item details from grade
    if (field === 'grade') {
      const details = lookupItemDetails(value);
      updated.itemName = details.itemName;
      updated.company = details.company;
      updated.productCategory = details.productCategory;
      console.log('Grade changed to:', value, 'Details:', details); // Debug log
    }

    // Auto-calculate billMonth and period
    if (field === 'purchaseDate') {
      const month = formatDateToMonth(value);
      updated.billMonth = month;
      updated.period = month;
    }

    // Auto-calculate cnMonth
    if (field === 'dateForCN') {
      updated.cnMonth = formatDateToMonth(value);
    }

    // Recalculate total and diff
    updated.total = calculateTotal(updated);
    updated.diff = calculateDiff(updated);

    setFormData(updated);
  };

  // Handle add transaction
  const handleAddTransaction = async () => {
    try {
      // Helper to convert date string to Firestore Timestamp
      const convertToTimestamp = (dateStr: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date;
      };
      
      const dataToSave = {
        ...formData,
        alias: lookupAlias(formData.supplierName || ''),
        billMonth: formatDateToMonth(formData.purchaseDate || ''),
        period: formatDateToMonth(formData.purchaseDate || ''),
        cnMonth: formatDateToMonth(formData.dateForCN || ''),
        purchaseDate: convertToTimestamp(formData.purchaseDate || ''),
        dateForCN: convertToTimestamp(formData.dateForCN || ''),
        total: calculateTotal(formData),
        diff: calculateDiff(formData),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'workingSheet'), dataToSave);
      
      // Reset form
      setFormData({
        slNo: 0,
        category: '',
        branch: '',
        supplierName: '',
        purchaseDate: '',
        billNo: '',
        buyRate: 0,
        qty: 0,
        grade: '',
        itemName: '',
        type: '',
        buyingTerms: '',
        dateForCN: '',
        ebiStatus: 'No',
        status: 'Pending',
        remarks: ''
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  // Handle edit
  const startEdit = (row: WorkingSheetData) => {
    setEditingRow(row.id);
    setEditData({ ...row });
    setShowEditModal(true);
  };

  const handleEditChange = (field: string, value: any) => {
    const updated = { ...editData, [field]: value };

    // Same auto-lookup logic as form
    if (field === 'supplierName') {
      updated.alias = lookupAlias(value);
    }

    if (field === 'grade') {
      const details = lookupItemDetails(value);
      updated.itemName = details.itemName;
      updated.company = details.company;
      updated.productCategory = details.productCategory;
      console.log('Edit - Grade changed to:', value, 'Details:', details); // Debug log
    }

    if (field === 'purchaseDate') {
      const month = formatDateToMonth(value);
      updated.billMonth = month;
      updated.period = month;
    }

    if (field === 'dateForCN') {
      updated.cnMonth = formatDateToMonth(value);
    }

    updated.total = calculateTotal(updated);
    updated.diff = calculateDiff(updated);

    setEditData(updated);
  };

  const saveEdit = async (id: string) => {
    try {
      // Helper to convert date string to Firestore Timestamp
      const convertToTimestamp = (dateStr: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date;
      };
      
      const { id: _, createdAt, ...dataToUpdate } = editData as any;
      await updateDoc(doc(db, 'workingSheet', id), {
        ...dataToUpdate,
        purchaseDate: convertToTimestamp(dataToUpdate.purchaseDate),
        dateForCN: convertToTimestamp(dataToUpdate.dateForCN),
        updatedAt: serverTimestamp()
      });
      setEditingRow(null);
      setEditData({});
      setShowEditModal(false);
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditData({});
    setShowEditModal(false);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteDoc(doc(db, 'workingSheet', id));
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  // Filtered data
  const filteredData = useMemo(() => {
    return workingSheetData.filter(row => {
      if (filterSupplier && row.supplierName !== filterSupplier) return false;
      if (filterPeriod && row.period !== filterPeriod) return false;
      if (filterBranch && row.branch !== filterBranch) return false;
      if (filterType && row.type !== filterType) return false;
      return true;
    });
  }, [workingSheetData, filterSupplier, filterPeriod, filterBranch, filterType]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalTransactions = filteredData.length;
    const totalPurchaseAmount = filteredData.reduce((sum, row) => sum + (row.buyRate * row.qty), 0);
    const totalOfTotal = filteredData.reduce((sum, row) => sum + row.total, 0);
    const totalDiff = filteredData.reduce((sum, row) => sum + row.diff, 0);
    return { totalTransactions, totalPurchaseAmount, totalOfTotal, totalDiff };
  }, [filteredData]);

  // Get unique values for filters
  const uniqueBranches = useMemo(() => 
    Array.from(new Set(workingSheetData.map(d => d.branch))).filter(Boolean),
    [workingSheetData]
  );

  const uniqueTypes = useMemo(() => 
    Array.from(new Set(workingSheetData.map(d => d.type))).filter(Boolean),
    [workingSheetData]
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    // Handle Firestore Timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    // Handle regular Date
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Sheet</h1>
            <p className="text-gray-600 mt-2">Transaction management with auto-calculations</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
          >
            {showAddForm ? '✕ Close Form' : '+ Add Transaction'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Transaction</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="number" placeholder="Sl No" value={formData.slNo} onChange={(e) => handleFormChange('slNo', Number(e.target.value))} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="Category" value={formData.category} onChange={(e) => handleFormChange('category', e.target.value)} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="Branch" value={formData.branch} onChange={(e) => handleFormChange('branch', e.target.value)} className="px-3 py-2 border rounded" />
              
              <select 
                value={formData.supplierName || ''} 
                onChange={(e) => handleFormChange('supplierName', e.target.value)} 
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.supplierName}>
                    {s.supplierName}
                  </option>
                ))}
              </select>

              <input type="text" placeholder="Alias (auto)" value={formData.alias || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
              <input type="date" placeholder="Purchase Date" value={formData.purchaseDate} onChange={(e) => handleFormChange('purchaseDate', e.target.value)} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="Bill Month (auto)" value={formData.billMonth || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
              <input type="text" placeholder="Bill No" value={formData.billNo} onChange={(e) => handleFormChange('billNo', e.target.value)} className="px-3 py-2 border rounded" />
              
              <input type="number" placeholder="Buy Rate" value={formData.buyRate} onChange={(e) => handleFormChange('buyRate', Number(e.target.value))} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="Qty" value={formData.qty} onChange={(e) => handleFormChange('qty', Number(e.target.value))} className="px-3 py-2 border rounded" />
              
              <input type="text" placeholder="Grade" value={formData.grade} onChange={(e) => handleFormChange('grade', e.target.value)} className="px-3 py-2 border rounded" />
              {/* <input type="text" placeholder="Item Name (auto)" value={formData.itemName || ''} disabled className="px-3 py-2 border rounded bg-gray-100" /> */}
              <input type="text" placeholder="Company (auto)" value={formData.company || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
              <input type="text" placeholder="Product Category (auto)" value={formData.productCategory || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
              
              <input type="text" placeholder="Type" value={formData.type} onChange={(e) => handleFormChange('type', e.target.value)} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="Buying Terms" value={formData.buyingTerms} onChange={(e) => handleFormChange('buyingTerms', e.target.value)} className="px-3 py-2 border rounded" />
              
              <input type="date" placeholder="Date for CN" value={formData.dateForCN} onChange={(e) => handleFormChange('dateForCN', e.target.value)} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="CN Month (auto)" value={formData.cnMonth || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
              
              <select value={formData.ebiStatus || 'No'} onChange={(e) => handleFormChange('ebiStatus', e.target.value)} className="px-3 py-2 border rounded">
                <option value="No">EBI: No</option>
                <option value="Yes">EBI: Yes</option>
              </select>
              
              <input type="number" placeholder="PP" value={formData.pp || ''} onChange={(e) => handleFormChange('pp', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="Source" value={formData.source || ''} onChange={(e) => handleFormChange('source', e.target.value)} className="px-3 py-2 border rounded" />
              
              <input type="number" placeholder="Rate As Per Confirmation" value={formData.rateAsPerConfirmation || ''} onChange={(e) => handleFormChange('rateAsPerConfirmation', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="Rate As Per Price List" value={formData.rateAsPerPriceList || ''} onChange={(e) => handleFormChange('rateAsPerPriceList', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="Price Type" value={formData.priceType || ''} onChange={(e) => handleFormChange('priceType', e.target.value)} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="Location" value={formData.location || ''} onChange={(e) => handleFormChange('location', e.target.value)} className="px-3 py-2 border rounded" />
              
              <input type="number" placeholder="MOU" value={formData.mou || ''} onChange={(e) => handleFormChange('mou', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="QD" value={formData.qd || ''} onChange={(e) => handleFormChange('qd', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="EBI Value" value={formData.ebiValue || ''} onChange={(e) => handleFormChange('ebiValue', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="GSI" value={formData.gsi || ''} onChange={(e) => handleFormChange('gsi', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="Scheme" value={formData.scheme || ''} onChange={(e) => handleFormChange('scheme', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="Extra" value={formData.extra || ''} onChange={(e) => handleFormChange('extra', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="Loading" value={formData.loading || ''} onChange={(e) => handleFormChange('loading', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="TPT" value={formData.tpt || ''} onChange={(e) => handleFormChange('tpt', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="Insurance" value={formData.insurance || ''} onChange={(e) => handleFormChange('insurance', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="Round Off" value={formData.roundOff || ''} onChange={(e) => handleFormChange('roundOff', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="Commission" value={formData.commission || ''} onChange={(e) => handleFormChange('commission', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              <input type="number" placeholder="GST CN" value={formData.gstCn || ''} onChange={(e) => handleFormChange('gstCn', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
              
              <input type="text" placeholder="Status" value={formData.status} onChange={(e) => handleFormChange('status', e.target.value)} className="px-3 py-2 border rounded" />
              <input type="text" placeholder="Remarks" value={formData.remarks} onChange={(e) => handleFormChange('remarks', e.target.value)} className="px-3 py-2 border rounded md:col-span-2" />
              
              <div className="md:col-span-2 p-3 bg-blue-50 rounded">
                <div className="text-sm font-medium">Total: {formatCurrency(formData.total || 0)}</div>
                <div className="text-sm font-medium">Diff: {formatCurrency(formData.diff || 0)}</div>
              </div>
            </div>
            
            <button onClick={handleAddTransaction} className="mt-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Save Transaction
            </button>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingRow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Edit Transaction</h2>
                <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input type="number" placeholder="Sl No" value={editData.slNo} onChange={(e) => handleEditChange('slNo', Number(e.target.value))} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Category" value={editData.category} onChange={(e) => handleEditChange('category', e.target.value)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Branch" value={editData.branch} onChange={(e) => handleEditChange('branch', e.target.value)} className="px-3 py-2 border rounded" />
                  
                  <select 
                    value={editData.supplierName || ''} 
                    onChange={(e) => handleEditChange('supplierName', e.target.value)} 
                    className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.supplierName}>
                        {s.supplierName}
                      </option>
                    ))}
                  </select>

                  <input type="text" placeholder="Alias (auto)" value={editData.alias || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
                  <input type="date" placeholder="Purchase Date" value={editData.purchaseDate} onChange={(e) => handleEditChange('purchaseDate', e.target.value)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Bill Month (auto)" value={editData.billMonth || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
                  <input type="text" placeholder="Bill No" value={editData.billNo} onChange={(e) => handleEditChange('billNo', e.target.value)} className="px-3 py-2 border rounded" />
                  
                  <input type="number" placeholder="Buy Rate" value={editData.buyRate} onChange={(e) => handleEditChange('buyRate', Number(e.target.value))} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="Qty" value={editData.qty} onChange={(e) => handleEditChange('qty', Number(e.target.value))} className="px-3 py-2 border rounded" />
                  
                  <input type="text" placeholder="Grade" value={editData.grade} onChange={(e) => handleEditChange('grade', e.target.value)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Item Name (auto)" value={editData.itemName || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
                  <input type="text" placeholder="Company (auto)" value={editData.company || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
                  <input type="text" placeholder="Product Category (auto)" value={editData.productCategory || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
                  
                  <input type="text" placeholder="Type" value={editData.type} onChange={(e) => handleEditChange('type', e.target.value)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Buying Terms" value={editData.buyingTerms} onChange={(e) => handleEditChange('buyingTerms', e.target.value)} className="px-3 py-2 border rounded" />
                  
                  <input type="date" placeholder="Date for CN" value={editData.dateForCN} onChange={(e) => handleEditChange('dateForCN', e.target.value)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="CN Month (auto)" value={editData.cnMonth || ''} disabled className="px-3 py-2 border rounded bg-gray-100" />
                  
                  <select value={editData.ebiStatus || 'No'} onChange={(e) => handleEditChange('ebiStatus', e.target.value)} className="px-3 py-2 border rounded">
                    <option value="No">EBI: No</option>
                    <option value="Yes">EBI: Yes</option>
                  </select>
                  
                  <input type="number" placeholder="PP" value={editData.pp || ''} onChange={(e) => handleEditChange('pp', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Source" value={editData.source || ''} onChange={(e) => handleEditChange('source', e.target.value)} className="px-3 py-2 border rounded" />
                  
                  <input type="number" placeholder="Rate As Per Confirmation" value={editData.rateAsPerConfirmation || ''} onChange={(e) => handleEditChange('rateAsPerConfirmation', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="Rate As Per Price List" value={editData.rateAsPerPriceList || ''} onChange={(e) => handleEditChange('rateAsPerPriceList', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Price Type" value={editData.priceType || ''} onChange={(e) => handleEditChange('priceType', e.target.value)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Location" value={editData.location || ''} onChange={(e) => handleEditChange('location', e.target.value)} className="px-3 py-2 border rounded" />
                  
                  <input type="number" placeholder="MOU" value={editData.mou || ''} onChange={(e) => handleEditChange('mou', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="QD" value={editData.qd || ''} onChange={(e) => handleEditChange('qd', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="EBI Value" value={editData.ebiValue || ''} onChange={(e) => handleEditChange('ebiValue', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="GSI" value={editData.gsi || ''} onChange={(e) => handleEditChange('gsi', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="Scheme" value={editData.scheme || ''} onChange={(e) => handleEditChange('scheme', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="Extra" value={editData.extra || ''} onChange={(e) => handleEditChange('extra', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="Loading" value={editData.loading || ''} onChange={(e) => handleEditChange('loading', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="TPT" value={editData.tpt || ''} onChange={(e) => handleEditChange('tpt', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="Insurance" value={editData.insurance || ''} onChange={(e) => handleEditChange('insurance', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="Round Off" value={editData.roundOff || ''} onChange={(e) => handleEditChange('roundOff', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="Commission" value={editData.commission || ''} onChange={(e) => handleEditChange('commission', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  <input type="number" placeholder="GST CN" value={editData.gstCn || ''} onChange={(e) => handleEditChange('gstCn', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded" />
                  
                  <input type="text" placeholder="Status" value={editData.status} onChange={(e) => handleEditChange('status', e.target.value)} className="px-3 py-2 border rounded" />
                  <input type="text" placeholder="Remarks" value={editData.remarks} onChange={(e) => handleEditChange('remarks', e.target.value)} className="px-3 py-2 border rounded md:col-span-2" />
                  
                  <div className="md:col-span-2 p-3 bg-blue-50 rounded">
                    <div className="text-sm font-medium">Total: {formatCurrency(editData.total || 0)}</div>
                    <div className="text-sm font-medium">Diff: {formatCurrency(editData.diff || 0)}</div>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-3">
                  <button onClick={() => saveEdit(editingRow)} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Save Changes
                  </button>
                  <button onClick={cancelEdit} className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className="px-3 py-2 border rounded">
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.supplierName}>{s.supplierName}</option>)}
            </select>
            <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="px-3 py-2 border rounded">
              <option value="">All Periods</option>
              {periods.map(p => <option key={p.id} value={p.period}>{p.period}</option>)}
            </select>
            <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-2 border rounded">
              <option value="">All Branches</option>
              {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border rounded">
              <option value="">All Types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => { setFilterSupplier(''); setFilterPeriod(''); setFilterBranch(''); setFilterType(''); }} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Reset
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm opacity-90">Total Transactions</h3>
            <p className="text-3xl font-bold">{summary.totalTransactions}</p>
          </div>
          <div className="bg-linear-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm opacity-90">Purchase Amount</h3>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalPurchaseAmount)}</p>
          </div>
          <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm opacity-90">Total of TOTAL</h3>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalOfTotal)}</p>
          </div>
          <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
            <h3 className="text-sm opacity-90">Total DIFF</h3>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalDiff)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 border text-xs">Sl No</th>
                  <th className="px-2 py-2 border text-xs">Supplier</th>
                  <th className="px-2 py-2 border text-xs">Alias</th>
                  <th className="px-2 py-2 border text-xs">Purchase Date</th>
                  <th className="px-2 py-2 border text-xs">Bill Month</th>
                  <th className="px-2 py-2 border text-xs">Bill No</th>
                  <th className="px-2 py-2 border text-xs">Buy Rate</th>
                  <th className="px-2 py-2 border text-xs">Qty</th>
                  <th className="px-2 py-2 border text-xs">Grade</th>
                  {/* <th className="px-2 py-2 border text-xs">Item Name</th> */}
                  <th className="px-2 py-2 border text-xs">Company</th>
                  <th className="px-2 py-2 border text-xs">Category</th>
                  <th className="px-2 py-2 border text-xs">Total</th>
                  <th className="px-2 py-2 border text-xs">Diff</th>
                  <th className="px-2 py-2 border text-xs">Status</th>
                  <th className="px-2 py-2 border text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(row => (
                  <tr key={row.id} className={`${row.diff !== 0 ? 'bg-yellow-50' : ''} hover:bg-gray-50`}>
                    <td className="px-2 py-2 border">{row.slNo || 0}</td>
                    <td className="px-2 py-2 border">{row.supplierName || ''}</td>
                    <td className="px-2 py-2 border">{row.alias || ''}</td>
                    <td className="px-2 py-2 border">{row.purchaseDate || ''}</td>
                    <td className="px-2 py-2 border">{row.billMonth || ''}</td>
                    <td className="px-2 py-2 border">{row.billNo || ''}</td>
                    <td className="px-2 py-2 border text-right">{formatCurrency(row.buyRate || 0)}</td>
                    <td className="px-2 py-2 border text-right">{row.qty || 0}</td>
                    <td className="px-2 py-2 border">{row.grade || ''}</td>
                    {/* <td className="px-2 py-2 border">{row.itemName || ''}</td> */}
                    <td className="px-2 py-2 border">{row.company || ''}</td>
                    <td className="px-2 py-2 border">{row.productCategory || ''}</td>
                    <td className="px-2 py-2 border text-right font-medium">{formatCurrency(row.total || 0)}</td>
                    <td className="px-2 py-2 border text-right font-medium">{formatCurrency(row.diff || 0)}</td>
                    <td className="px-2 py-2 border">{row.status || ''}</td>
                    <td className="px-2 py-2 border">
                      <button onClick={() => startEdit(row)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded mr-1">Edit</button>
                      <button onClick={() => handleDelete(row.id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}