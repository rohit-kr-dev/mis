const admin = require('firebase-admin');

// Use service account for admin SDK
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function directDatabaseCheck() {
  try {
    console.log('🔍 Direct Database Check using Admin SDK\n');
    
    // Check suppliers collection
    console.log('1. Checking suppliers collection...');
    const suppliersSnapshot = await db.collection('suppliers').get();
    console.log(`Total suppliers: ${suppliersSnapshot.size}`);
    
    let supplierIndex = 0;
    suppliersSnapshot.forEach((doc) => {
      const data = doc.data();
      supplierIndex++;
      console.log(`  ${supplierIndex}. ${data.supplierName || 'No name'} (${data.alias || 'No alias'})`);
      if (data.supplierName && data.supplierName.includes('ALPHA')) {
        console.log(`     ⚠️  FOUND ALPHA SUPPLIER: ${data.supplierName}`);
      }
    });
    
    // Check working sheet collection
    console.log('\n2. Checking workingSheet collection...');
    const workingSheetSnapshot = await db.collection('workingSheet').get();
    console.log(`Total transactions: ${workingSheetSnapshot.size}`);
    
    const supplierNames = new Set();
    const cnMonths = new Set(); // Track CN months specifically
    const billMonths = new Set(); // Track bill months for comparison
    
    workingSheetSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.supplierName) {
        supplierNames.add(data.supplierName);
        if (data.supplierName.includes('ALPHA')) {
          console.log(`   ⚠️  FOUND ALPHA TRANSACTION: ${data.transactionId || 'No ID'} - ${data.supplierName}`);
        }
      }
      
      // Track CN months (which you want to focus on)
      if (data.cnMonth) {
        cnMonths.add(data.cnMonth);
      }
      
      // Track bill months for comparison
      if (data.billMonth) {
        billMonths.add(data.billMonth);
      }
    });
    
    console.log(`\nUnique supplier names in transactions: ${supplierNames.size}`);
    if (supplierNames.size > 0) {
      const sortedNames = Array.from(supplierNames).sort();
      sortedNames.forEach(name => {
        if (name.includes('ALPHA')) {
          console.log(`  ⚠️  ALPHA SUPPLIER IN TRANSACTIONS: ${name}`);
        }
      });
    }
    
    // Show CN month data analysis (now prioritized)
    console.log(`\nUnique CN Months in transactions: ${cnMonths.size}`);
    if (cnMonths.size > 0) {
      const sortedCnMonths = Array.from(cnMonths).sort();
      console.log('CN Months found:', sortedCnMonths);
    }
    
    // Show bill month data for comparison
    console.log(`\nUnique Bill Months in transactions: ${billMonths.size}`);
    if (billMonths.size > 0) {
      const sortedBillMonths = Array.from(billMonths).sort();
      console.log('Bill Months found:', sortedBillMonths);
    }
    
    console.log('\n✅ Direct database check completed!');
    
  } catch (error) {
    console.error('❌ Error during direct database check:', error);
  }
}

// Run the direct check
directDatabaseCheck();