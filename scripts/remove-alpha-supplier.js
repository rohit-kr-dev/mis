const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase configuration - using the same config as in lib/firebase.ts
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

async function removeAlphaSupplier() {
  try {
    console.log('🔍 Searching for Alpha Supplier data...');
    
    // Check suppliers collection
    console.log('\n1. Checking suppliers collection...');
    const suppliersQuery = query(
      collection(db, 'suppliers'),
      where('supplierName', '==', 'ALPHA SUPPLIER')
    );
    
    const suppliersSnapshot = await getDocs(suppliersQuery);
    console.log(`Found ${suppliersSnapshot.size} Alpha Supplier record(s) in suppliers collection`);
    
    // Delete supplier documents
    let deletedSuppliers = 0;
    for (const docSnap of suppliersSnapshot.docs) {
      console.log(`Deleting supplier: ${docSnap.id}`);
      await deleteDoc(doc(db, 'suppliers', docSnap.id));
      deletedSuppliers++;
    }
    
    // Check workingSheet collection for Alpha transactions
    console.log('\n2. Checking workingSheet collection for Alpha transactions...');
    const transactionsQuery = query(
      collection(db, 'workingSheet'),
      where('supplierName', '==', 'ALPHA SUPPLIER')
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    console.log(`Found ${transactionsSnapshot.size} Alpha transaction(s) in workingSheet collection`);
    
    // Delete transaction documents
    let deletedTransactions = 0;
    for (const docSnap of transactionsSnapshot.docs) {
      console.log(`Deleting transaction: ${docSnap.id}`);
      await deleteDoc(doc(db, 'workingSheet', docSnap.id));
      deletedTransactions++;
    }
    
    // Also check for transactions that might have Alpha in the transaction ID
    console.log('\n3. Checking for transactions with ALP- prefix...');
    const alpTransactionsQuery = query(collection(db, 'workingSheet'));
    const alpTransactionsSnapshot = await getDocs(alpTransactionsQuery);
    
    let deletedAlpTransactions = 0;
    for (const docSnap of alpTransactionsSnapshot.docs) {
      const data = docSnap.data();
      if (data.transactionId && data.transactionId.startsWith('ALP-')) {
        console.log(`Deleting ALP transaction: ${docSnap.id} (${data.transactionId})`);
        await deleteDoc(doc(db, 'workingSheet', docSnap.id));
        deletedAlpTransactions++;
      }
    }
    
    console.log('\n✅ Removal Summary:');
    console.log(`- Deleted supplier records: ${deletedSuppliers}`);
    console.log(`- Deleted transactions by supplier name: ${deletedTransactions}`);
    console.log(`- Deleted transactions by ALP prefix: ${deletedAlpTransactions}`);
    console.log(`- Total records deleted: ${deletedSuppliers + deletedTransactions + deletedAlpTransactions}`);
    
    // Final verification
    console.log('\n🔍 Verifying removal...');
    
    const remainingSuppliersQuery = query(
      collection(db, 'suppliers'),
      where('supplierName', '==', 'ALPHA SUPPLIER')
    );
    const remainingSuppliers = await getDocs(remainingSuppliersQuery);
    
    const remainingTransactionsQuery = query(
      collection(db, 'workingSheet'),
      where('supplierName', '==', 'ALPHA SUPPLIER')
    );
    const remainingTransactions = await getDocs(remainingTransactionsQuery);
    
    console.log(`Remaining Alpha Supplier records: ${remainingSuppliers.size}`);
    console.log(`Remaining Alpha transactions: ${remainingTransactions.size}`);
    
    if (remainingSuppliers.size === 0 && remainingTransactions.size === 0) {
      console.log('\n🎉 Successfully removed all Alpha Supplier data!');
    } else {
      console.log('\n⚠️  Some Alpha Supplier data may still remain.');
    }
    
  } catch (error) {
    console.error('❌ Error removing Alpha Supplier:', error);
  }
}

// Run the removal
removeAlphaSupplier();