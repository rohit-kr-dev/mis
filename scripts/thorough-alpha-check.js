const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function thoroughAlphaCheck() {
  try {
    console.log('🔍 Thorough Alpha Supplier Check\n');
    
    // Check 1: Direct suppliers collection
    console.log('1. Checking suppliers collection...');
    const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
    console.log(`Total suppliers: ${suppliersSnapshot.size}`);
    
    suppliersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. ${data.supplierName || 'No name'} (${data.alias || 'No alias'})`);
      if (data.supplierName && data.supplierName.includes('ALPHA')) {
        console.log(`     ⚠️  FOUND ALPHA SUPPLIER: ${data.supplierName}`);
      }
    });
    
    // Check 2: Working sheet collection for supplier names
    console.log('\n2. Checking workingSheet collection for supplier names...');
    const workingSheetSnapshot = await getDocs(collection(db, 'workingSheet'));
    console.log(`Total transactions: ${workingSheetSnapshot.size}`);
    
    const supplierNames = new Set();
    workingSheetSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.supplierName) {
        supplierNames.add(data.supplierName);
        if (data.supplierName.includes('ALPHA')) {
          console.log(`   ⚠️  FOUND ALPHA TRANSACTION: ${data.transactionId || 'No ID'} - ${data.supplierName}`);
        }
      }
    });
    
    console.log(`\nUnique supplier names found in transactions: ${supplierNames.size}`);
    const sortedNames = Array.from(supplierNames).sort();
    sortedNames.forEach(name => {
      if (name.includes('ALPHA')) {
        console.log(`  ⚠️  ALPHA SUPPLIER IN TRANSACTIONS: ${name}`);
      }
    });
    
    // Check 3: Check if there are any documents with ALP- prefix
    console.log('\n3. Checking for ALP- prefix transactions...');
    let alpCount = 0;
    workingSheetSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.transactionId && data.transactionId.startsWith('ALP-')) {
        alpCount++;
        console.log(`   ALP Transaction: ${data.transactionId} - ${data.supplierName || 'No supplier'}`);
      }
    });
    console.log(`Total ALP- transactions found: ${alpCount}`);
    
    // Check 4: Search with different query approaches
    console.log('\n4. Running targeted queries...');
    
    // Query for exact match
    const exactQuery = query(collection(db, 'suppliers'), where('supplierName', '==', 'ALPHA SUPPLIER'));
    const exactSnapshot = await getDocs(exactQuery);
    console.log(`Exact match 'ALPHA SUPPLIER': ${exactSnapshot.size} records`);
    
    // Query for partial match in working sheet
    const alphaTransactionsQuery = query(
      collection(db, 'workingSheet'),
      where('supplierName', '>=', 'ALPHA'),
      where('supplierName', '<=', 'ALPHZ')
    );
    const alphaTransactionsSnapshot = await getDocs(alphaTransactionsQuery);
    console.log(`Alpha transactions (range query): ${alphaTransactionsSnapshot.size} records`);
    
    alphaTransactionsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   ${data.transactionId} - ${data.supplierName}`);
    });
    
    console.log('\n📋 SUMMARY:');
    console.log('============');
    console.log('If you see any Alpha suppliers listed above, they still exist in your database.');
    console.log('If everything shows 0 counts, then Alpha Supplier has been successfully removed.');
    
  } catch (error) {
    console.error('❌ Error during thorough check:', error);
  }
}

// Run the thorough check
thoroughAlphaCheck();