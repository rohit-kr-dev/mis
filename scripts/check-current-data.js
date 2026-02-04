// Script to check current data in Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit, where } = require('firebase/firestore');

// Firebase config - same as in your lib/firebase.ts
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

async function checkCurrentData() {
  try {
    console.log('🔍 Checking current data in workingSheet collection...\n');
    
    // Get total count
    const allDocs = await getDocs(collection(db, 'workingSheet'));
    console.log(`📊 Total records in database: ${allDocs.size}`);
    
    if (allDocs.empty) {
      console.log('⚠️  No records found in database');
      return;
    }
    
    // Get highest SL No
    const maxQuery = query(collection(db, 'workingSheet'), orderBy('slNo', 'desc'), limit(1));
    const maxSnapshot = await getDocs(maxQuery);
    const maxSlNo = maxSnapshot.docs[0]?.data().slNo || 0;
    console.log(`📈 Highest SL No: ${maxSlNo}`);
    
    // Get lowest SL No
    const minQuery = query(collection(db, 'workingSheet'), orderBy('slNo', 'asc'), limit(1));
    const minSnapshot = await getDocs(minQuery);
    const minSlNo = minSnapshot.docs[0]?.data().slNo || 0;
    console.log(`📉 Lowest SL No: ${minSlNo}`);
    
    // Show sample records (first 5 and last 5)
    console.log('\n📋 Sample records (first 5):');
    const firstQuery = query(collection(db, 'workingSheet'), orderBy('slNo', 'asc'), limit(5));
    const firstSnapshot = await getDocs(firstQuery);
    firstSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  SL No: ${data.slNo}, Supplier: ${data.supplierName}, Date: ${data.purchaseDate}`);
    });
    
    console.log('\n📋 Sample records (last 5):');
    const lastQuery = query(collection(db, 'workingSheet'), orderBy('slNo', 'desc'), limit(5));
    const lastSnapshot = await getDocs(lastQuery);
    lastSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  SL No: ${data.slNo}, Supplier: ${data.supplierName}, Date: ${data.purchaseDate}`);
    });
    
    // Check for duplicates
    console.log('\n🔍 Checking for potential duplicates...');
    const allRecords = [];
    allDocs.forEach(doc => {
      allRecords.push(doc.data());
    });
    
    const slNoCount = {};
    allRecords.forEach(record => {
      slNoCount[record.slNo] = (slNoCount[record.slNo] || 0) + 1;
    });
    
    const duplicates = Object.entries(slNoCount).filter(([slNo, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate SL Nos:`);
      duplicates.forEach(([slNo, count]) => {
        console.log(`  SL No ${slNo}: ${count} occurrences`);
      });
    } else {
      console.log('✅ No duplicates found');
    }
    
    console.log('\n✅ Data check completed');
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

// Run the check
checkCurrentData();