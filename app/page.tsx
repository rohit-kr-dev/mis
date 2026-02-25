import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

// Define the type for our transaction data
interface WorkingSheetData {
  id: string;
  supplierName?: string;
  billNo?: string;
  purchaseDate?: any; // Firestore timestamp
  status?: string;
  total?: number;
  grade?: string;
  [key: string]: any; // Allow other properties
}

// Format currency function with Indian numbering system (10,00,000 format)
function formatCurrency(amount: number) {
  // Convert to absolute value and handle the Indian numbering system
  const absAmount = Math.abs(amount);
  
  // Format with Indian comma separators
  return absAmount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}

async function getLastTransaction(): Promise<WorkingSheetData | null> {
  try {
    const transactionsQuery = query(
      collection(db, 'workingSheet'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(transactionsQuery);
    
    if (!snapshot.empty) {
      const lastDoc = snapshot.docs[0];
      const data = lastDoc.data();
      return { id: lastDoc.id, ...data } as WorkingSheetData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching last transaction:', error);
    return null;
  }
}


async function getStats() {
  try {
    const snapshot = await getDocs(collection(db, 'workingSheet'));
    const data = snapshot.docs.map(doc => doc.data() as WorkingSheetData);
    
    // Count total transactions
    const totalTransactions = data.length;
    
    // Count open transactions
    const openTransactions = data.filter(item => item.status?.toLowerCase() === 'open').length;
    
    // Count verified & closed transactions
    const verifiedClosedTransactions = data.filter(item => 
      item.status?.toLowerCase().includes('verified') || 
      item.status?.toLowerCase().includes('closed')
    ).length;
    
    return {
      totalTransactions,
      openTransactions,
      verifiedClosedTransactions
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      totalTransactions: 0,
      openTransactions: 0,
      verifiedClosedTransactions: 0
    };
  }
}

export default async function HomePage() {
  const lastTransaction = await getLastTransaction();
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Material Management Information System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive solution for tracking materials, suppliers, and transactions
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Transactions</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalTransactions}</p>
            <div className="mt-2 text-sm text-gray-500">All records in system</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Open Transactions</h3>
            <p className="text-3xl font-bold text-green-600">{stats.openTransactions}</p>
            <div className="mt-2 text-sm text-gray-500">Active/pending transactions</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Verified & Closed</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.verifiedClosedTransactions}</p>
            <div className="mt-2 text-sm text-gray-500">Completed transactions</div>
          </div>
        </div>

        {/* Last Updated Date */}
        {lastTransaction && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 mb-8 text-white">
            <h3 className="text-xl font-semibold mb-3">Last Updated</h3>
            <div className="text-2xl font-bold">
              {lastTransaction.purchaseDate ? 
                (typeof lastTransaction.purchaseDate === 'object' && lastTransaction.purchaseDate?.seconds ? 
                  new Date(lastTransaction.purchaseDate.seconds * 1000).toLocaleDateString() : 
                  (typeof lastTransaction.purchaseDate === 'string' || typeof lastTransaction.purchaseDate === 'number') ?
                  new Date(lastTransaction.purchaseDate).toLocaleDateString() : 'N/A') 
                : 'N/A'}
            </div>
          </div>
        )}

        {/* Reports Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">📋 Reports & Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            <Link href="/supplier-wise-monthly" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 group">
              <div className="text-4xl font-bold text-green-600 mb-4 group-hover:scale-110 transition-transform">📈</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Supplier Wise Monthly</h3>
              <p className="text-gray-600 mb-4">View monthly transactions by supplier</p>
              <div className="text-green-600 font-medium">View &raquo;</div>
            </Link>

            <Link href="/supplier-wise-yearly" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 group">
              <div className="text-4xl font-bold text-purple-600 mb-4 group-hover:scale-110 transition-transform">📅</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Supplier Wise Yearly</h3>
              <p className="text-gray-600 mb-4">View yearly transactions by supplier</p>
              <div className="text-purple-600 font-medium">View &raquo;</div>
            </Link>

            <Link href="/supplier-grade-wise-yearly" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 group">
              <div className="text-4xl font-bold text-indigo-600 mb-4 group-hover:scale-110 transition-transform">📊</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Supplier Grade Wise Yearly</h3>
              <p className="text-gray-600 mb-4">View yearly transactions by supplier and grade</p>
              <div className="text-indigo-600 font-medium">View &raquo;</div>
            </Link>

            <Link href="/total-suppliers-monthly" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 group">
              <div className="text-4xl font-bold text-yellow-600 mb-4 group-hover:scale-110 transition-transform">📊</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Total Suppliers Monthly</h3>
              <p className="text-gray-600 mb-4">Comprehensive monthly supplier analysis</p>
              <div className="text-yellow-600 font-medium">View &raquo;</div>
            </Link>

            <Link href="/all-suppliers-monthly" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 group">
              <div className="text-4xl font-bold text-red-600 mb-4 group-hover:scale-110 transition-transform">🏢</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">All Suppliers Monthly</h3>
              <p className="text-gray-600 mb-4">Compare all suppliers across different types</p>
              <div className="text-red-600 font-medium">View &raquo;</div>
            </Link>
          </div>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link href="/working" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 group">
            <div className="text-4xl font-bold text-blue-600 mb-4 group-hover:scale-110 transition-transform">🔧</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Working Sheet</h3>
            <p className="text-gray-600 mb-4">Manage daily transactions with auto-calculations</p>
            <div className="text-blue-600 font-medium">View &raquo;</div>
          </Link>

          <Link href="/items-master" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 group">
            <div className="text-4xl font-bold text-indigo-600 mb-4 group-hover:scale-110 transition-transform">📦</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Items Master</h3>
            <p className="text-gray-600 mb-4">Manage master list of items and materials</p>
            <div className="text-indigo-600 font-medium">View &raquo;</div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/working" className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors">
              <div className="text-2xl mb-2">➕</div>
              <div className="font-medium text-gray-800">Add Transaction</div>
            </Link>
            <Link href="/supplier-master" className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium text-gray-800">Manage Suppliers</div>
            </Link>
            <Link href="/items-master" className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors">
              <div className="text-2xl mb-2">🏷️</div>
              <div className="font-medium text-gray-800">Manage Items</div>
            </Link>
            <Link href="/working" className="p-4 bg-yellow-50 rounded-lg text-center hover:bg-yellow-100 transition-colors">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-gray-800">Generate Report</div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Material Management Information System &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}