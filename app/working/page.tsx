"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import SearchableDropdown from '@/components/SearchableDropdown';

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
  slNo: number | '';           // allow empty input
  category: string;
  branch: string;
  supplierName: string;
  alias: string;
  purchaseDate: string;
  billMonth: string;
  period: string;
  billNo: string;
  buyRate: number | '';        // allow empty input
  qty: number | '';            // allow empty input
  grade: string;
  itemName: string;
  company: string;
  productCategory: string;
  type: string;
  buyingTerms: string;
  dateForCN: string;
  cnMonth: string;
  ebiStatus: string;

  pp: number | '' | null;
  source: string | null;

  rateAsPerConfirmation: number | '' | null;
  rateAsPerPriceList: number | '' | null;

  priceType: string | null;
  location: string | null;

  mou: number | '' | null;
  qd: number | '' | null;
  ebiValue: number | '' | null;
  gsi: number | '' | null;
  scheme: number | '' | null;
  extra: number | '' | null;
  loading: number | '' | null;
  tpt: number | '' | null;
  insurance: number | '' | null;
  roundOff: number | '' | null;
  commission: number | '' | null;
  gstCn: number | '' | null;

  total: number;
  diff: number;

  status: string;
  remarks: string;

  createdAt: any;
  updatedAt: any;
}


export default function Working() {
  // Master data states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  
  // Transaction data state
  const [workingSheetData, setWorkingSheetData] = useState<WorkingSheetData[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  
  // File upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterType2, setFilterType2] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [requiredFilters, setRequiredFilters] = useState(0);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
 const [formData, setFormData] = useState<Partial<WorkingSheetData>>({
  slNo: '',
  category: '',
  branch: '',
  supplierName: '',
  purchaseDate: '',
  billNo: '',
  buyRate: '',
  qty: '',
  grade: '',
  itemName: '',
  company: '',
  productCategory: '',
  type: '',
  buyingTerms: '',
  dateForCN: '',
  ebiStatus: 'No',
  status: 'Open',
  remarks: '',
  pp: null,
  source: null,
  rateAsPerConfirmation: null,
  rateAsPerPriceList: null,
  priceType: null,
  location: null,
  mou: null,
  qd: null,
  ebiValue: null,
  gsi: null,
  scheme: null,
  extra: null,
  loading: null,
  tpt: null,
  insurance: null,
  roundOff: null,
  commission: null,
  gstCn: null,
  total: 0,
  diff: 0,
});


  // Edit state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<WorkingSheetData>>({});
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch master data ONCE on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        // Fetch suppliers with deduplication
        const suppliersSnapshot = await getDocs(
          query(collection(db, 'suppliers'), orderBy('supplierName', 'asc'))
        );
        const supplierMap = new Map<string, Supplier>();
        
        suppliersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const supplierName = data.supplierName;
          
          // Only add if supplier name doesn't exist in map (deduplication)
          if (supplierName && !supplierMap.has(supplierName)) {
            supplierMap.set(supplierName, {
              id: docSnap.id,
              supplierName: supplierName,
              alias: data.alias || supplierName
            });
          }
        });
        
        const suppliersData = Array.from(supplierMap.values()).sort((a, b) => 
          a.supplierName.localeCompare(b.supplierName)
        );
        setSuppliers(suppliersData);

        // Fetch items
        const itemsSnapshot = await getDocs(
          query(collection(db, 'items'), orderBy('itemName', 'asc'))
        );
        const itemsData: Item[] = [];
        itemsSnapshot.forEach((docSnap) => {
          itemsData.push({ id: docSnap.id, ...docSnap.data() } as Item);
        });
        setItems(itemsData);

        // Fetch periods
        const periodsSnapshot = await getDocs(collection(db, 'periods'));
        const periodsData: Period[] = [];
        periodsSnapshot.forEach((docSnap) => {
          periodsData.push({ id: docSnap.id, ...docSnap.data() } as Period);
        });
        
        // Sort periods chronologically
        const sortedPeriods = periodsData.sort((a, b) => {
          const parsePeriod = (period: string): { year: number; month: number } => {
            if (!period) return { year: 0, month: 0 };
            const [monthStr, yearStr] = period.split('-');
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIndex = months.indexOf(monthStr.toLowerCase());
            const year = parseInt('20' + yearStr);
            return { year, month: monthIndex };
          };
          
          const dateA = parsePeriod(a.period);
          const dateB = parsePeriod(b.period);
          
          if (dateA.year !== dateB.year) {
            return dateA.year - dateB.year;
          }
          return dateA.month - dateB.month;
        });
        
        setPeriods(sortedPeriods);

        // Fetch unique branches and types from workingSheet
        const workingSheetSnapshot = await getDocs(collection(db, 'workingSheet'));
        const branchesSet = new Set<string>();
        const typesSet = new Set<string>();
        
        workingSheetSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.branch) branchesSet.add(data.branch);
          if (data.type) typesSet.add(data.type);
        });
        
        setBranches(Array.from(branchesSet).sort());
        setTypes(Array.from(typesSet).sort());

        // Fetch unique companies from items
        const companiesSet = new Set<string>();
        itemsData.forEach(item => {
          if (item.company) companiesSet.add(item.company);
        });
        setCompanies(Array.from(companiesSet).sort());

        setLoading(false);
      } catch (error) {
        console.error('Error fetching master data:', error);
        setLoading(false);
      }
    };
    fetchMasterData();
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
    const item = items.find(i => i.itemName.toLowerCase() === grade.toLowerCase());
    if (item) {
      return {
        itemName: item.itemName,
        company: item.company || '',
        productCategory: item.productCategory || ''
      };
    }
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
    return fields.reduce((sum: number, val) => sum + (typeof val === 'number' ? val : 0), 0);
  };

  const calculateDiff = (data: Partial<WorkingSheetData>): number => {
    const buyRate = data.buyRate || 0;
    const rateConfirm = data.rateAsPerConfirmation || 0;
    const ratePriceList = data.rateAsPerPriceList || 0;
    const total = calculateTotal(data);
    return buyRate - rateConfirm - ratePriceList - total;
  };

  const convertTimestampToDateString = (timestamp: any): string => {
    if (!timestamp) return '';
    if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toISOString().split('T')[0];
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString().split('T')[0];
    }
    return timestamp;
  };

  const convertToTimestamp = (dateStr: string) => {
    if (!dateStr) return null;
    return new Date(dateStr);
  };

  // Check filter requirements
  const appliedFiltersCount = useMemo(() => {
    let count = 0;
    if (filterSupplier) count++;
    if (filterPeriod) count++;
    if (filterBranch) count++;
    if (filterType) count++;
    if (filterType2) count++;
    if (filterCompany) count++;
    if (filterStatus) count++;
    return count;
  }, [filterSupplier, filterPeriod, filterBranch, filterType, filterType2, filterCompany, filterStatus]);

  const filtersRequirementMet = useMemo(() => {
    return appliedFiltersCount >= requiredFilters;
  }, [appliedFiltersCount, requiredFilters]);

  // Get unique values for filters
  const uniqueBranches = useMemo(() => branches, [branches]);
  const uniqueTypes = useMemo(() => types, [types]);
  const uniqueCompanies = useMemo(() => companies, [companies]);

 // Manual fetch function - ONLY called when user clicks "Load Data"
  const fetchWorkingSheetData = async () => {
    if (!filtersRequirementMet) {
      setWorkingSheetData([]);
      setDataFetched(false);
      return;
    }

    // Prevent double-fetching
    if (loadingData) return;

    setLoadingData(true);
    setDataFetched(false);

    try {
      // Fetch ALL data first (or with single filter to minimize index requirements)
      let workingSheetQuery;
      
      // Only apply ONE filter to Firebase query to avoid needing multiple indexes
      // We'll filter the rest in-memory
      // Prioritize the filter that user selected most recently or give preference to certain filters
      
      // Check if any filter is applied, and use the one that's selected
      // Allow user to choose which filter to apply to Firebase by checking in sequence
      // But we'll improve this to work more intuitively
      if (filterPeriod) {  // Period filter has priority for your use case
        workingSheetQuery = query(
          collection(db, 'workingSheet'), 
          where('cnMonth', '==', filterPeriod),  // Changed to use cnMonth instead of billMonth
          orderBy('slNo', 'asc')
        );
      } else if (filterSupplier) {
        workingSheetQuery = query(
          collection(db, 'workingSheet'), 
          where('supplierName', '==', filterSupplier),
          orderBy('slNo', 'asc')
        );
      } else if (filterBranch) {
        workingSheetQuery = query(
          collection(db, 'workingSheet'), 
          where('branch', '==', filterBranch),
          orderBy('slNo', 'asc')
        );
      } else if (filterType) {
        workingSheetQuery = query(
          collection(db, 'workingSheet'), 
          where('type', '==', filterType),
          orderBy('slNo', 'asc')
        );
      } else if (filterCompany) {
        workingSheetQuery = query(
          collection(db, 'workingSheet'), 
          where('company', '==', filterCompany),
          orderBy('slNo', 'asc')
        );
      } else {
        // No filters - get all data
        workingSheetQuery = query(collection(db, 'workingSheet'), orderBy('slNo', 'asc'));
      }

      const snapshot = await getDocs(workingSheetQuery);
      const allData: WorkingSheetData[] = [];
      const seenIds = new Set<string>();
      
      snapshot.forEach((docSnap) => {
        // Skip if we've already seen this document ID
        if (seenIds.has(docSnap.id)) {
          console.warn('Duplicate document ID detected:', docSnap.id);
          return;
        }
        seenIds.add(docSnap.id);
        
        const docData = docSnap.data();
        allData.push({ 
          id: docSnap.id, 
          slNo: docData.slNo || 0,
          category: docData.category || '',
          branch: docData.branch || '',
          supplierName: docData.supplierName || '',
          alias: docData.alias || '',
          purchaseDate: convertTimestampToDateString(docData.purchaseDate),
          billMonth: docData.billMonth || '',
          period: docData.cnMonth || '',  // Changed to use cnMonth instead of billMonth
          billNo: docData.billNo || '',
          buyRate: docData.buyRate || 0,
          qty: docData.qty || 0,
          grade: docData.grade || '',
          itemName: docData.grade || '',
          company: docData.company || '',
          productCategory: docData.productCategory || '',
          type: docData.type || '',
          buyingTerms: docData.buyingTerms || '',
          dateForCN: convertTimestampToDateString(docData.dateForCN),
          cnMonth: docData.cnMonth || '',
          ebiStatus: docData.ebiStatus || 'No',
          pp: docData.pp || null,
          source: docData.source || null,
          rateAsPerConfirmation: docData.rateAsPerConfirmation || null,
          rateAsPerPriceList: docData.rateAsPerPriceList || null,
          priceType: docData.priceType || null,
          location: docData.location || null,
          mou: docData.mou || null,
          qd: docData.qd || null,
          ebiValue: docData.ebiValue || null,
          gsi: docData.gsi || null,
          scheme: docData.scheme || null,
          extra: docData.extra || null,
          loading: docData.loading || null,
          tpt: docData.tpt || null,
          insurance: docData.insurance || null,
          roundOff: docData.roundOff || null,
          commission: docData.commission || null,
          gstCn: docData.gstCn || null,
          total: docData.total || 0,
          diff: docData.diff || 0,
          status: docData.status || 'Pending',
          remarks: docData.remarks || '',
          createdAt: docData.createdAt,
          updatedAt: docData.updatedAt
        } as WorkingSheetData);
      });
      
      // Apply remaining filters in-memory (client-side filtering)
      const filteredData = allData.filter(row => {
        if (filterSupplier && row.supplierName !== filterSupplier) return false;
        if (filterPeriod && row.period !== filterPeriod) return false;  // Changed to use period (which now uses cnMonth)
        if (filterBranch && row.branch !== filterBranch) return false;
        // If Type 2 is selected, it takes precedence for Domestic/Import values
        if (filterType2) {
          if (row.type !== filterType2) return false;
        } else if (filterType && row.type !== filterType) {
          return false;
        }
        if (filterCompany && row.company !== filterCompany) return false;
        // Handle status filter - "Verified & Closed" matches both Verified and Closed
        if (filterStatus) {
          if (filterStatus === 'Verified & Closed') {
            if (row.status !== 'Verified' && row.status !== 'Closed') return false;
          } else {
            if (row.status !== filterStatus) return false;
          }
        }
        return true;
      });
      
      // Remove any duplicates based on document ID (just in case)
      const uniqueData = Array.from(new Map(filteredData.map(item => [item.id, item])).values());
      
      console.log('Fetched records:', allData.length);
      console.log('After filtering:', filteredData.length);
      console.log('After deduplication:', uniqueData.length);
      console.log('Unique IDs in final data:', new Set(uniqueData.map(r => r.id)).size);
      
      setWorkingSheetData(uniqueData);
      setDataFetched(true);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching workingSheet:', error);
      setWorkingSheetData([]);
      setDataFetched(false);
    } finally {
      setLoadingData(false);
    }
  };

  // Handle filter changes - mark data as stale
  const handleFilterChange = (filterType: string, value: string) => {
    setDataFetched(false);
    
    switch (filterType) {
      case 'supplier':
        setFilterSupplier(value);
        break;
      case 'period':
        setFilterPeriod(value);
        break;
      case 'branch':
        setFilterBranch(value);
        break;
      case 'type':
        setFilterType(value);
        break;
      case 'type2':
        setFilterType2(value);
        break;
      case 'company':
        setFilterCompany(value);
        break;
      case 'status':
        setFilterStatus(value);
        break;
    }
  };

  // Download as Excel
  const downloadExcel = () => {
    if (workingSheetData.length === 0) return;
    
    // Prepare data for export
    const exportData = workingSheetData.map((row, index) => {
      const rowData: any = {
        'Sl No': row.slNo || 0,
        'Category': row.category || '',
        'Branch': row.branch || '',
        'Supplier': row.supplierName || '',
        'Alias': row.alias || '',
        'Purchase Date': row.purchaseDate || '',
        'Bill Month': row.billMonth || '',
        'Bill No': row.billNo || '',
        'Buy Rate': row.buyRate || 0,
        'Qty': row.qty || 0,
        'Grade': row.grade || '',
        'Item Name': row.itemName || '',
        'Company': row.company || '',
        'Product Category': row.productCategory || '',
        'Type': row.type || '',
        'Buying Terms': row.buyingTerms || '',
        'Date for CN': row.dateForCN || '',
        'CN Month': row.cnMonth || '',
        'EBI Status': row.ebiStatus || '',
        'PP': row.pp || '',
        'Source': row.source || '',
        'Rate As Per Confirmation': row.rateAsPerConfirmation || '',
        'Rate As Per Price List': row.rateAsPerPriceList || '',
        'Price Type': row.priceType || '',
        'Location': row.location || '',
        'MOU': row.mou || '',
        'QD': row.qd || '',
        'EBI Value': row.ebiValue || '',
        'GSI': row.gsi || '',
        'Scheme': row.scheme || '',
        'Extra': row.extra || '',
        'Loading': row.loading || '',
        'TPT': row.tpt || '',
        'Insurance': row.insurance || '',
        'Round Off': row.roundOff || '',
        'Commission': row.commission || '',
        'GST CN': row.gstCn || '',
        'Total': row.total || 0,
        'Diff': row.diff || 0,
        'Status': row.status || '',
        'Remarks': row.remarks || ''
      };
      return rowData;
    });
    
    // Add totals row
    const totalsRow: any = {
      'Sl No': '',
      'Category': '',
      'Branch': '',
      'Supplier': '',
      'Alias': '',
      'Purchase Date': '',
      'Bill Month': '',
      'Bill No': '',
      'Buy Rate': '',
      'Qty': '',
      'Grade': '',
      'Item Name': '',
      'Company': '',
      'Product Category': '',
      'Type': 'TOTALS',
      'Buying Terms': '',
      'Date for CN': '',
      'CN Month': '',
      'EBI Status': '',
      'PP': '',
      'Source': '',
      'Rate As Per Confirmation': '',
      'Rate As Per Price List': '',
      'Price Type': '',
      'Location': '',
      'MOU': '',
      'QD': '',
      'EBI Value': '',
      'GSI': '',
      'Scheme': '',
      'Extra': '',
      'Loading': '',
      'TPT': '',
      'Insurance': '',
      'Round Off': '',
      'Commission': '',
      'GST CN': '',
      'Total': summary.totalOfTotal || 0,
      'Diff': summary.totalDiff || 0,
      'Status': '',
      'Remarks': ''
    };
    exportData.push(totalsRow);
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Working Sheet');
    
    // Generate filename
    const filename = `working_sheet_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Export
    XLSX.writeFile(wb, filename);
  };

  // Download as PDF
  const downloadPDF = async () => {
    console.log('PDF button clicked!');
    console.log('workingSheetData length:', workingSheetData.length);
    console.log('dataFetched:', dataFetched);
    
    if (!dataFetched) {
      console.log('Data not fetched yet, showing alert');
      alert('Please load data first by clicking "Load Data from Firebase"');
      return;
    }
    
    if (workingSheetData.length === 0) {
      console.log('No data available, showing alert');
      alert('No data available to export to PDF');
      return;
    }
    
    try {
      console.log('Starting PDF generation...');
      
      // Create PDF document
      const doc = new jsPDF();
      console.log('jsPDF created successfully');
      
      // Add company name
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Polymetalz', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
      
      // Add title
      doc.setFontSize(16);
      doc.setFont(undefined, 'normal');
      doc.text('Working Sheet Report', 14, 35);
      
      // Add filters info
      doc.setFontSize(10);
      let yPos = 45;
      
      const filters = [];
      if (filterSupplier) filters.push(`Supplier: ${filterSupplier}`);
      if (filterPeriod) filters.push(`Period: ${filterPeriod}`);
      if (filterBranch) filters.push(`Branch: ${filterBranch}`);
      if (filterType) filters.push(`Type: ${filterType}`);
      if (filterType2) filters.push(`Type 2: ${filterType2}`);
      if (filterCompany) filters.push(`Company: ${filterCompany}`);
      if (filterStatus) filters.push(`Status: ${filterStatus}`);
      
      filters.forEach(filter => {
        doc.text(filter, 14, yPos);
        yPos += 5;
      });
      
      yPos += 5;
      
      // Prepare table data with formatted currency
      const tableData = workingSheetData.map(row => [
        row.slNo || '',
        row.supplierName || '',
        row.alias || '',
        row.purchaseDate || '',
        row.billMonth || '',
        row.billNo || '',
        formatCurrency(row.buyRate || 0),
        row.qty || '',
        row.grade || '',
        row.company || '',
        row.productCategory || '',
        formatCurrency(row.total || 0),
        formatCurrency(row.diff || 0),
        row.status || ''
      ]);
      
      // Calculate totals
      const totalOfTotal = workingSheetData.reduce((sum, row) => sum + Number(row.total || 0), 0);
      const totalDiff = workingSheetData.reduce((sum, row) => sum + Number(row.diff || 0), 0);
      
      // Add totals row with formatted currency
      tableData.push([
        '', '', '', '', '', '', '', '', '', '', 'TOTALS',
        formatCurrency(totalOfTotal),
        formatCurrency(totalDiff),
        ''
      ]);
      
      // Column headers
      const headers = [
        ['Sl No', 'Supplier', 'Alias', 'Purchase Date', 'Bill Month', 'Bill No',
         'Buy Rate', 'Qty', 'Grade', 'Company', 'Category', 'Total', 'Diff', 'Status']
      ];
      
      console.log('Generating table with autoTable function...');
      
      console.log('Starting table at yPos:', yPos);
      
      // Generate table using autoTable FUNCTION (not method)
      autoTable(doc, {
        head: headers,
        body: tableData,
        startY: yPos + 10,
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
      
      console.log('Saving PDF...');
      const filename = `working_sheet_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      console.log('PDF saved successfully as:', filename);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF: ' + (error as Error).message);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterSupplier('');
    setFilterPeriod('');
    setFilterBranch('');
    setFilterType('');
    setFilterType2('');
    setFilterCompany('');
    setFilterStatus('');
    setWorkingSheetData([]);
    setDataFetched(false);
  };

  // Handle form changes with auto-lookup
  const handleFormChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };

    if (field === 'supplierName') {
      updated.alias = lookupAlias(value);
    }

    if (field === 'grade') {
      const details = lookupItemDetails(value);
      updated.itemName = details.itemName;
      updated.company = details.company;
      updated.productCategory = details.productCategory;
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

    setFormData(updated);
  };

  // Handle add transaction
  const handleAddTransaction = async () => {
    try {
      const dataToSave = {
        ...formData,
        alias: lookupAlias(formData.supplierName || ''),
        billMonth: formatDateToMonth(formData.purchaseDate || ''),
        period: formatDateToMonth(formData.dateForCN || ''),  // Changed to use dateForCN (which becomes cnMonth) instead of purchaseDate
        cnMonth: formatDateToMonth(formData.dateForCN || ''),
        purchaseDate: convertToTimestamp(formData.purchaseDate || ''),
        dateForCN: convertToTimestamp(formData.dateForCN || ''),
        total: calculateTotal(formData),
        diff: calculateDiff(formData),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'workingSheet'), dataToSave);
      
      // Mark data as stale - user needs to reload
      setDataFetched(false);
      
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
        status: 'Open',
        remarks: '',
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

    if (field === 'supplierName') {
      updated.alias = lookupAlias(value);
    }

    if (field === 'grade') {
      const details = lookupItemDetails(value);
      updated.itemName = details.itemName;
      updated.company = details.company;
      updated.productCategory = details.productCategory;
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
      const { id: _, createdAt, ...dataToUpdate } = editData as any;
      
      // Ensure period is updated based on dateForCN (which creates cnMonth)
      const updatedData = {
        ...dataToUpdate,
        period: formatDateToMonth(dataToUpdate.dateForCN || ''),  // Update period to match cnMonth
        purchaseDate: convertToTimestamp(dataToUpdate.purchaseDate),
        dateForCN: convertToTimestamp(dataToUpdate.dateForCN),
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'workingSheet', id), updatedData);
      
      // Mark data as stale
      setDataFetched(false);
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
        setDataFetched(false); // Mark data as stale
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  // Summary calculations
  const summary = useMemo(() => {
    const totalTransactions = workingSheetData.length;
    const totalPurchaseAmount = workingSheetData.reduce((sum: number, row) => sum + (Number(row.buyRate || 0) * Number(row.qty || 0)), 0);
    const totalOfTotal = workingSheetData.reduce((sum: number, row) => sum + Number(row.total || 0), 0);
    const totalDiff = workingSheetData.reduce((sum: number, row) => sum + Number(row.diff || 0), 0);
    return { totalTransactions, totalPurchaseAmount, totalOfTotal, totalDiff };
  }, [workingSheetData]);

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    console.log(`Formatting ${amount} -> ${formatted}`);
    return formatted;
  };

  // Pagination
  const totalPages = Math.ceil(workingSheetData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = workingSheetData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Handle Excel file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadMessage('Starting upload...');

    try {
      // Check file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('Please upload a valid Excel file (.xlsx or .xls)');
      }

      setUploadMessage('Preparing file for upload...');
      setUploadProgress(10);

      // Create FormData to send file to API
      const formData = new FormData();
      formData.append('file', file);

      setUploadMessage('Uploading file to server...');
      setUploadProgress(30);

      // Send to API route
      const response = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const result = await response.json();
      
      setUploadProgress(100);
      setUploadMessage(result.message);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh data
      setDataFetched(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setIsUploading(false);
      }, 3000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage(`Error: ${(error as Error).message}`);
      setIsUploading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700 font-medium">Loading master data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Working Sheet</h1>
            <p className="text-gray-600 mt-2">Transaction management with auto-calculations</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`px-4 py-3 flex items-center gap-2 font-medium rounded-lg shadow-lg transition transform hover:scale-105 ${
                isUploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
              }`}
            >
              <Upload size={20} />
              {isUploading ? 'Uploading...' : 'Upload Excel'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-lg transition transform hover:scale-105"
            >
              {showAddForm ? '✕ Close Form' : '+ Add Transaction'}
            </button>
          </div>
        </div>
        
        {/* Upload Progress */}
        {isUploading && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading and processing Excel file...</span>
              <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            {uploadMessage && (
              <p className="mt-2 text-sm text-gray-600">{uploadMessage}</p>
            )}
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Add New Transaction</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <input
  type="number"
  min="0"
  placeholder="Sl No"
  value={formData.slNo}
  onChange={(e) => {
    const value = e.target.value;
    handleFormChange('slNo', value === '' ? '' : Number(value));
  }}
  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
/>

<select
  value={formData.category || ''}
  onChange={(e) => handleFormChange('category', e.target.value)}
  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
>
  <option value="">Select Category</option>
  <option value="Purchase">Purchase</option>
  <option value="Purchase Return">Purchase Return</option>
</select>
              <select
  value={formData.branch || ''}
  onChange={(e) => handleFormChange('branch', e.target.value)}
  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
>
  <option value="">Select Branch</option>
  <option value="Bangalore WH">Bangalore WH</option>
  <option value="Chennai Office">Chennai Office</option>
  <option value="Head Office">Head Office</option>
  <option value="Chennai WH">Chennai WH</option>
</select>

              
              <select 
                value={formData.supplierName || ''} 
                onChange={(e) => handleFormChange('supplierName', e.target.value)} 
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.supplierName}>{s.supplierName}</option>
                ))}
              </select>

              <input type="text" placeholder="Alias  " value={formData.alias || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
              <input type="date" placeholder="Purchase Date" value={formData.purchaseDate} onChange={(e) => handleFormChange('purchaseDate', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Bill Month  " value={formData.billMonth || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
              <input type="text" placeholder="Bill No" value={formData.billNo} onChange={(e) => handleFormChange('billNo', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              
              <input
  type="number"
  min="0"
  placeholder="Buy Rate"
  value={formData.buyRate}
  onChange={(e) => {
    const value = e.target.value;
    handleFormChange('buyRate', value === '' ? '' : Number(value));
  }}
  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
/>

<input
  type="number"
  min="0"
  placeholder="Qty"
  value={formData.qty}
  onChange={(e) => {
    const value = e.target.value;
    handleFormChange('qty', value === '' ? '' : Number(value));
  }}
  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
/>

              
              <input type="text" placeholder="Grade" value={formData.grade} onChange={(e) => handleFormChange('grade', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Company  " value={formData.company || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
              <select
  value={formData.productCategory || ''}
  onChange={(e) => handleFormChange('productCategory', e.target.value)}
  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
>
  <option value="">Select Product Category</option>
  <option value="Purchase">Purchase</option>
  <option value="Purchase Return">Purchase Return</option>
</select>

              
              <select value={formData.type} onChange={(e) => handleFormChange('type', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Select Type</option>
              <option value="Domestic">Domestic</option>
              <option value="Import">Import</option>
              <option value="Discounts">Discounts</option>
              <option value="Outright with Discounts">Outright with Discounts</option>
              <option value="Outright">Outright</option>
                 </select>

              <input type="text" placeholder="Buying Terms" value={formData.buyingTerms} onChange={(e) => handleFormChange('buyingTerms', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              
              <input type="date" placeholder="Date for CN" value={formData.dateForCN} onChange={(e) => handleFormChange('dateForCN', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="CN Month  " value={formData.cnMonth || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
              
              <select value={formData.ebiStatus || 'No'} onChange={(e) => handleFormChange('ebiStatus', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="No">EBI: No</option>
                <option value="Yes">EBI: Yes</option>
              </select>
              
              <input type="number" placeholder="PP" value={formData.pp || ''} onChange={(e) => handleFormChange('pp', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Source" value={formData.source || ''} onChange={(e) => handleFormChange('source', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              
              <input type="number" placeholder="Rate As Per Confirmation" value={formData.rateAsPerConfirmation || ''} onChange={(e) => handleFormChange('rateAsPerConfirmation', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Rate As Per Price List" value={formData.rateAsPerPriceList || ''} onChange={(e) => handleFormChange('rateAsPerPriceList', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Price Type" value={formData.priceType || ''} onChange={(e) => handleFormChange('priceType', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Location" value={formData.location || ''} onChange={(e) => handleFormChange('location', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              
              <input type="number" placeholder="MOU" value={formData.mou || ''} onChange={(e) => handleFormChange('mou', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="QD" value={formData.qd || ''} onChange={(e) => handleFormChange('qd', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="EBI Value" value={formData.ebiValue || ''} onChange={(e) => handleFormChange('ebiValue', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="GSI" value={formData.gsi || ''} onChange={(e) => handleFormChange('gsi', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Scheme" value={formData.scheme || ''} onChange={(e) => handleFormChange('scheme', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Extra" value={formData.extra || ''} onChange={(e) => handleFormChange('extra', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Loading" value={formData.loading || ''} onChange={(e) => handleFormChange('loading', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="TPT" value={formData.tpt || ''} onChange={(e) => handleFormChange('tpt', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Insurance" value={formData.insurance || ''} onChange={(e) => handleFormChange('insurance', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Round Off" value={formData.roundOff || ''} onChange={(e) => handleFormChange('roundOff', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Commission" value={formData.commission || ''} onChange={(e) => handleFormChange('commission', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="GST CN" value={formData.gstCn || ''} onChange={(e) => handleFormChange('gstCn', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              
              <select value={formData.status} onChange={(e) => handleFormChange('status', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select Status</option>
                <option value="Open">Open</option>
                <option value="Verified">Verified</option>
                <option value="Closed">Closed</option>
              </select>
              <input type="text" placeholder="Remarks" value={formData.remarks} onChange={(e) => handleFormChange('remarks', e.target.value)} className="px-3 py-2 border rounded-lg md:col-span-2 focus:ring-2 focus:ring-blue-500" />
              
              <div className="md:col-span-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-sm font-medium">Total: {formatCurrency(formData.total || 0)}</div>
                <div className="text-sm font-medium">Diff: {formatCurrency(formData.diff || 0)}</div>
              </div>
            </div>
            
            <button onClick={handleAddTransaction} className="mt-4 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-md transition transform hover:scale-105">
              💾 Save Transaction
            </button>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingRow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">✏️ Edit Transaction</h2>
                <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input type="number" placeholder="Sl No" value={editData.slNo} onChange={(e) => handleEditChange('slNo', Number(e.target.value))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
<select
  value={editData.category || ''}
  onChange={(e) => handleEditChange('category', e.target.value)}
  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
>
  <option value="">Select Product Category</option>
  <option value="Purchase">Purchase</option>
  <option value="Purchase Return">Purchase Return</option>
</select>
                      <select
                        value={editData.branch || ''}
                        onChange={(e) => handleEditChange('branch', e.target.value)}
                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select Branch</option>
                        <option value="Bangalore WH">Bangalore WH</option>
                        <option value="Chennai Office">Chennai Office</option>
                        <option value="Head Office">Head Office</option>
                        <option value="Chennai WH">Chennai WH</option>
                      </select>
                  
                  <select 
                    value={editData.supplierName || ''} 
                    onChange={(e) => handleEditChange('supplierName', e.target.value)} 
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.supplierName}>{s.supplierName}</option>
                    ))}
                  </select>

                  <input type="text" placeholder="Alias  " value={editData.alias || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
                  <input type="date" placeholder="Purchase Date" value={editData.purchaseDate} onChange={(e) => handleEditChange('purchaseDate', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="text" placeholder="Bill Month  " value={editData.billMonth || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
                  <input type="text" placeholder="Bill No" value={editData.billNo} onChange={(e) => handleEditChange('billNo', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  
                  <input type="number" placeholder="Buy Rate" value={editData.buyRate} onChange={(e) => handleEditChange('buyRate', Number(e.target.value))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Qty" value={editData.qty} onChange={(e) => handleEditChange('qty', Number(e.target.value))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  
                  <input type="text" placeholder="Grade" value={editData.grade} onChange={(e) => handleEditChange('grade', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="text" placeholder="Item Name  " value={editData.itemName || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
                  <input type="text" placeholder="Company  " value={editData.company || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
                  <input type="text" placeholder="Product Category  " value={editData.productCategory || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
                  
                  <input type="text" placeholder="Type" value={editData.type} onChange={(e) => handleEditChange('type', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="text" placeholder="Buying Terms" value={editData.buyingTerms} onChange={(e) => handleEditChange('buyingTerms', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  
                  <input type="date" placeholder="Date for CN" value={editData.dateForCN} onChange={(e) => handleEditChange('dateForCN', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="text" placeholder="CN Month  " value={editData.cnMonth || ''} disabled className="px-3 py-2 border rounded-lg bg-gray-100" />
                  
                  <select value={editData.ebiStatus || 'No'} onChange={(e) => handleEditChange('ebiStatus', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="No">EBI: No</option>
                    <option value="Yes">EBI: Yes</option>
                  </select>
                  
                  <input type="number" placeholder="PP" value={editData.pp || ''} onChange={(e) => handleEditChange('pp', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="text" placeholder="Source" value={editData.source || ''} onChange={(e) => handleEditChange('source', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  
                  <input type="number" placeholder="Rate As Per Confirmation" value={editData.rateAsPerConfirmation || ''} onChange={(e) => handleEditChange('rateAsPerConfirmation', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Rate As Per Price List" value={editData.rateAsPerPriceList || ''} onChange={(e) => handleEditChange('rateAsPerPriceList', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="text" placeholder="Price Type" value={editData.priceType || ''} onChange={(e) => handleEditChange('priceType', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="text" placeholder="Location" value={editData.location || ''} onChange={(e) => handleEditChange('location', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  
                  <input type="number" placeholder="MOU" value={editData.mou || ''} onChange={(e) => handleEditChange('mou', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="QD" value={editData.qd || ''} onChange={(e) => handleEditChange('qd', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="EBI Value" value={editData.ebiValue || ''} onChange={(e) => handleEditChange('ebiValue', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="GSI" value={editData.gsi || ''} onChange={(e) => handleEditChange('gsi', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Scheme" value={editData.scheme || ''} onChange={(e) => handleEditChange('scheme', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Extra" value={editData.extra || ''} onChange={(e) => handleEditChange('extra', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Loading" value={editData.loading || ''} onChange={(e) => handleEditChange('loading', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="TPT" value={editData.tpt || ''} onChange={(e) => handleEditChange('tpt', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Insurance" value={editData.insurance || ''} onChange={(e) => handleEditChange('insurance', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Round Off" value={editData.roundOff || ''} onChange={(e) => handleEditChange('roundOff', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Commission" value={editData.commission || ''} onChange={(e) => handleEditChange('commission', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="GST CN" value={editData.gstCn || ''} onChange={(e) => handleEditChange('gstCn', e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  
                  <select value={editData.status} onChange={(e) => handleEditChange('status', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Select Status</option>
                    <option value="Open">Open</option>
                    <option value="Verified">Verified</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <input type="text" placeholder="Remarks" value={editData.remarks} onChange={(e) => handleEditChange('remarks', e.target.value)} className="px-3 py-2 border rounded-lg md:col-span-2 focus:ring-2 focus:ring-blue-500" />
                  
                  <div className="md:col-span-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium">Total: {formatCurrency(editData.total || 0)}</div>
                    <div className="text-sm font-medium">Diff: {formatCurrency(editData.diff || 0)}</div>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-3">
                  <button onClick={() => saveEdit(editingRow)} className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-md transition transform hover:scale-105">
                    💾 Save Changes
                  </button>
                  <button onClick={cancelEdit} className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 shadow-md transition">
                    ✖️ Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">🔍 Filter Records</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={clearFilters}
                className="w-full sm:w-auto px-4 py-2 text-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition shadow-md"
              >
                ✖️ Clear Filters
              </button>
              {dataFetched && workingSheetData.length > 0 && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Filter Requirement Selector */}
          <div className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              ⚙️ Minimum Filters Required:
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setRequiredFilters(1);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 1
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 1 Filter
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(2);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 2
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 2 Filters
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(3);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 3
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 3 Filters
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(4);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 4
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 4 Filters
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(5);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 5
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                At Least 5 Filters
              </button>
              <button
                onClick={() => {
                  setRequiredFilters(6);
                  setDataFetched(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-md ${
                  requiredFilters === 6
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                All 6 Filters Required
              </button>
            </div>
          </div>

          {/* Filter Status Indicator */}
          {!filtersRequirementMet && (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800 mb-1">
                    Filters Required
                  </p>
                  <p className="text-xs text-yellow-700">
                    You have applied {appliedFiltersCount} filter{appliedFiltersCount !== 1 ? 's' : ''}. 
                    Please apply at least {requiredFilters} filter{requiredFilters !== 1 ? 's' : ''} and click "Load Data".
                    <span className="block mt-1 font-medium">💡 Data is only fetched when you click the button - saving Firebase reads!</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs sm:text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
            💡 <span className="font-semibold">Note:</span> Select filters and click "Load Data" to fetch from Firebase. 
            {requiredFilters === 6 && ' All six filters must be selected.'}
            {requiredFilters === 5 && ' At least five filters must be selected.'}
            {requiredFilters === 4 && ' At least four filters must be selected.'}
            {requiredFilters === 3 && ' At least three filters must be selected.'}
            {requiredFilters === 2 && ' At least two filters must be selected.'}
            {requiredFilters === 1 && ' At least one filter must be selected.'}
            <span className="block mt-1 text-green-700 font-medium">🔥 Uses ONE Firebase filter + client-side filtering to avoid complex indexes!</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Supplier {filterSupplier && <span className="text-green-600">✓</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={filterSupplier}
                  onChange={(e) => handleFilterChange('supplier', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white pr-10"
                  onFocus={() => setIsSupplierDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsSupplierDropdownOpen(false), 200)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setFilterSupplier('');
                    setIsSupplierDropdownOpen(false);
                  }}
                >
                  {filterSupplier ? '✕' : '🔍'}
                </button>
                
                {/* Dropdown with filtered suppliers */}
                {isSupplierDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div 
                      className="px-3 py-2 text-sm text-gray-500 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setFilterSupplier('');
                        setIsSupplierDropdownOpen(false);
                      }}
                    >
                      -- All Suppliers --
                    </div>
                    {suppliers
                      .filter(supplier => 
                        supplier.supplierName.toLowerCase().includes(filterSupplier.toLowerCase())
                      )
                      .map(supplier => (
                        <div
                          key={supplier.id}
                          className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            setFilterSupplier(supplier.supplierName);
                            setIsSupplierDropdownOpen(false);
                          }}
                        >
                          {supplier.supplierName}
                        </div>
                      ))
                    }
                    {suppliers.filter(supplier => 
                      supplier.supplierName.toLowerCase().includes(filterSupplier.toLowerCase())
                    ).length === 0 && filterSupplier && (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No suppliers found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Period {filterPeriod && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={filterPeriod}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Periods --</option>
                {periods.map(p => (
                  <option key={p.id} value={p.period}>{p.period}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏪 Branch {filterBranch && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={filterBranch}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Branches --</option>
                {uniqueBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📦 Type {filterType && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={filterType}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Types --</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <SearchableDropdown
                options={uniqueCompanies.map(company => ({ id: company, name: company }))}
                value={filterCompany}
                onChange={(value) => handleFilterChange('company', value)}
                placeholder="-- All Companies --"
                label="🏢 Company"
              />
            </div>
          </div>

          {/* Status Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📦 Type 2 {filterType2 && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={filterType2}
                onChange={(e) => handleFilterChange('type2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Types 2 --</option>
                <option value="Domestic">Domestic</option>
                <option value="Import">Import</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Status {filterStatus && <span className="text-green-600">✓</span>}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">-- All Statuses --</option>
                <option value="Open">Open</option>
                <option value="Verified & Closed">Verified & Closed</option>
              </select>
            </div>

            <div className="sm:col-span-1 md:col-span-2 lg:col-span-3"></div> {/* Empty space to maintain alignment */}
          </div>



          {/* Load Data Button */}
          <div className="flex justify-center">
            <button
              onClick={fetchWorkingSheetData}
              disabled={!filtersRequirementMet || loadingData}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition shadow-lg transform hover:scale-105 ${
                !filtersRequirementMet || loadingData
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              {loadingData ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Loading Data...
                </span>
              ) : (
                '🚀 Load Data from Firebase'
              )}
            </button>
          </div>

          {!dataFetched && filtersRequirementMet && !loadingData && (
            <p className="text-center text-sm text-orange-600 mt-3 font-medium">
              ⚠️ Click "Load Data" to fetch results
            </p>
          )}
        </div>

        {/* Content Area */}
        {!dataFetched && !loadingData ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Ready to Load Data
            </h3>
            <p className="text-gray-600 text-base mb-4">
              {!filtersRequirementMet 
                ? `Please select at least ${requiredFilters} filter${requiredFilters !== 1 ? 's' : ''} and click "Load Data" to view transactions.`
                : 'Click the "Load Data" button above to fetch data from Firebase.'}
            </p>
            <div className="bg-green-50 p-4 rounded-lg inline-block">
              <p className="text-sm text-green-800">
                <span className="font-semibold">💰 Current Firebase Reads:</span> 0
              </p>
              <p className="text-xs text-green-600 mt-1">
                No transaction data fetched yet - your quota is safe!
              </p>
            </div>
          </div>
        ) : loadingData ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600">Fetching filtered data from Firebase...</p>
            <p className="text-xs text-gray-500 mt-2">This only happens when you click "Load Data"</p>
          </div>
        ) : workingSheetData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500 text-base sm:text-lg">
              📭 No data available for the selected filters.
            </p>
          </div>
        ) : (
          <>
            {/* Rows per page selector */}
            <div className="bg-white rounded-t-xl shadow-lg px-4 py-3 border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                📊 Showing {startIndex + 1}-{Math.min(endIndex, workingSheetData.length)} of {workingSheetData.length} records
              </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-lg overflow-hidden border-x border-gray-200">
              <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 border text-xs">Sl No</th>
                      <th className="px-2 py-2 border text-xs">Supplier</th>
                      <th className="px-2 py-2 border text-xs">Alias</th>
                      <th className="px-2 py-2 border text-xs">Purchase Date</th>
                      <th className="px-2 py-2 border text-xs">Bill Month</th>
                      <th className="px-2 py-2 border text-xs">CN Month</th>
                      <th className="px-2 py-2 border text-xs">Bill No</th>
                      <th className="px-2 py-2 border text-xs">Buy Rate</th>
                      <th className="px-2 py-2 border text-xs">Qty</th>
                      <th className="px-2 py-2 border text-xs">Grade</th>
                      <th className="px-2 py-2 border text-xs">Company</th>
                      <th className="px-2 py-2 border text-xs">Category</th>
                      <th className="px-2 py-2 border text-xs">Total</th>
                      <th className="px-2 py-2 border text-xs">Diff</th>
                      <th className="px-2 py-2 border text-xs">Status</th>
                      <th className="px-2 py-2 border text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map(row => (
                      <tr key={row.id} className={`${row.diff !== 0 ? 'bg-yellow-50' : ''} hover:bg-blue-50 transition`}>
                        <td className="px-2 py-2 border text-gray-700">{row.slNo || 0}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.supplierName || ''}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.alias || ''}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.purchaseDate || ''}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.billMonth || ''}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.cnMonth || ''}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.billNo || ''}</td>
                        <td className="px-2 py-2 border text-right text-gray-700">{formatCurrency(row.buyRate || 0)}</td>
                        <td className="px-2 py-2 border text-right text-gray-700">{row.qty || 0}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.grade || ''}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.company || ''}</td>
                        <td className="px-2 py-2 border text-gray-700">{row.productCategory || ''}</td>
                        <td className="px-2 py-2 border text-right font-medium text-blue-700">{formatCurrency(row.total || 0)}</td>
                        <td className="px-2 py-2 border text-right font-medium text-gray-700">{formatCurrency(row.diff || 0)}</td>
                        <td className="px-2 py-2 border text-gray-700">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            row.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            row.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {row.status || ''}
                          </span>
                        </td>
                        <td className="px-2 py-2 border">
                          <div className="flex gap-1">
                            <button 
                              onClick={() => startEdit(row)} 
                              className="px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs rounded hover:from-blue-700 hover:to-blue-800 transition"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDelete(row.id)} 
                              className="px-2 py-1 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs rounded hover:from-red-700 hover:to-red-800 transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Table Footer with Totals */}
              <div className="border-t-2 border-gray-800 bg-gray-50">
                <div className="flex px-4 py-3 text-sm font-semibold text-gray-800">
                  <div className="w-[4.16%] flex items-center justify-center border-r">Total</div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-end border-r pr-2"></div>
                  <div className="w-[8.33%] flex items-center justify-end font-bold pr-2 text-blue-700">
                    {formatCurrency(
                      workingSheetData.reduce((sum, row) => sum + (typeof row.qty === 'number' ? row.qty : 0), 0)
                    )}
                  </div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-end border-r pr-2 text-blue-700 font-bold">
                    {formatCurrency(
                      workingSheetData.reduce((sum, row) => sum + (typeof row.total === 'number' ? row.total : 0), 0)
                    )}
                  </div>
                  <div className="w-[8.33%] flex items-center justify-end border-r pr-2"></div>
                  <div className="w-[8.33%] flex items-center justify-start border-r pl-2"></div>
                  <div className="w-[8.33%] flex items-center justify-center"></div>
                </div>
              </div>
            </div>

            {/* Pagination */}
            <div className="bg-white rounded-b-xl shadow-lg px-4 py-4 border border-t-0 border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm text-gray-600">
                  Page <span className="font-bold text-blue-600">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        goToPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}