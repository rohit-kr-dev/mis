const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyDatabaseState() {
  try {
    console.log('📊 Checking current database state...\n');
    
    // Count total suppliers
    const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
    console.log(`Total suppliers in database: ${suppliersSnapshot.size}`);
    
    // Count total transactions
    const transactionsSnapshot = await getDocs(collection(db, 'workingSheet'));
    console.log(`Total transactions in database: ${transactionsSnapshot.size}`);
    
    // Check for any Alpha-related data
    console.log('\n🔍 Checking for Alpha Supplier related data...');
    
    let alphaSuppliers = 0;
    let alphaTransactions = 0;
    let alpPrefixTransactions = 0;
    
    // Check suppliers
    suppliersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.supplierName && data.supplierName.includes('ALPHA')) {
        alphaSuppliers++;
        console.log(`Found Alpha supplier: ${data.supplierName}`);
      }
    });
    
    // Check transactions
    transactionsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.supplierName && data.supplierName.includes('ALPHA')) {
        alphaTransactions++;
        console.log(`Found Alpha transaction: ${data.transactionId || 'Unknown ID'} - ${data.supplierName}`);
      }
      if (data.transactionId && data.transactionId.startsWith('ALP-')) {
        alpPrefixTransactions++;
        console.log(`Found ALP- transaction: ${data.transactionId}`);
      }
    });
    
    console.log('\n📋 Summary:');
    console.log(`- Alpha suppliers found: ${alphaSuppliers}`);
    console.log(`- Alpha transactions found: ${alphaTransactions}`);
    console.log(`- ALP- prefix transactions found: ${alpPrefixTransactions}`);
    
    if (alphaSuppliers === 0 && alphaTransactions === 0 && alpPrefixTransactions === 0) {
      console.log('\n✅ Database is clean - no Alpha Supplier data found!');
    } else {
      console.log('\n⚠️  Alpha Supplier data still exists in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

// Run verification
verifyDatabaseState();