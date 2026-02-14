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
    
    suppliersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. ${data.supplierName || 'No name'} (${data.alias || 'No alias'})`);
      if (data.supplierName && data.supplierName.includes('ALPHA')) {
        console.log(`     ⚠️  FOUND ALPHA SUPPLIER: ${data.supplierName}`);
      }
    });
    
    // Check working sheet collection
    console.log('\n2. Checking workingSheet collection...');
    const workingSheetSnapshot = await db.collection('workingSheet').get();
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
    
    console.log(`\nUnique supplier names in transactions: ${supplierNames.size}`);
    if (supplierNames.size > 0) {
      const sortedNames = Array.from(supplierNames).sort();
      sortedNames.forEach(name => {
        if (name.includes('ALPHA')) {
          console.log(`  ⚠️  ALPHA SUPPLIER IN TRANSACTIONS: ${name}`);
        }
      });
    }
    
    console.log('\n✅ Direct database check completed!');
    
  } catch (error) {
    console.error('❌ Error during direct database check:', error);
  }
}

// Run the direct check
directDatabaseCheck();