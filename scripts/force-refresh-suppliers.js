const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, disableNetwork, enableNetwork } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function forceRefreshSuppliers() {
  try {
    console.log('🔄 Force refreshing suppliers data...\n');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Disable network to clear cache, then re-enable
    console.log('1. Disabling network to clear cache...');
    await disableNetwork(db);
    
    console.log('2. Re-enabling network...');
    await enableNetwork(db);
    
    // Wait a bit for network to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('3. Fetching fresh suppliers data...');
    const suppliersQuery = query(collection(db, 'suppliers'), orderBy('supplierName', 'asc'));
    const suppliersSnapshot = await getDocs(suppliersQuery);
    
    console.log(`\n📊 Fresh supplier data:`);
    console.log(`Total suppliers: ${suppliersSnapshot.size}`);
    
    if (suppliersSnapshot.size === 0) {
      console.log('✅ No suppliers found - database is clean');
    } else {
      console.log('\nSupplier list:');
      suppliersSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ${data.supplierName || 'No name'} (${data.alias || 'No alias'})`);
        if (data.supplierName && data.supplierName.includes('ALPHA')) {
          console.log(`     ⚠️  ALERT: Found Alpha Supplier!`);
        }
      });
    }
    
    // Also check working sheet for supplier names
    console.log('\n4. Checking working sheet for supplier names...');
    const workingSheetSnapshot = await getDocs(collection(db, 'workingSheet'));
    const supplierNames = new Set();
    
    workingSheetSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.supplierName) {
        supplierNames.add(data.supplierName);
      }
    });
    
    console.log(`Unique supplier names in transactions: ${supplierNames.size}`);
    
    if (supplierNames.size > 0) {
      console.log('\nSupplier names in transactions:');
      Array.from(supplierNames).sort().forEach(name => {
        console.log(`  - ${name}`);
        if (name.includes('ALPHA')) {
          console.log(`    ⚠️  ALERT: Alpha Supplier found in transactions!`);
        }
      });
    }
    
    console.log('\n✅ Force refresh completed!');
    console.log('Please refresh your browser to see updated data.');
    
  } catch (error) {
    console.error('❌ Error during force refresh:', error);
  }
}

// Run the force refresh
forceRefreshSuppliers();