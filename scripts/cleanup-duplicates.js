// Script to clean up duplicate records in Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function cleanupDuplicates() {
  try {
    console.log('🔍 Checking for and cleaning up duplicate records...\n');
    
    const allDocs = await getDocs(collection(db, 'workingSheet'));
    
    if (allDocs.empty) {
      console.log('✅ No records found - nothing to clean');
      return;
    }
    
    console.log(`📊 Total records: ${allDocs.size}`);
    
    // Group records by SL No
    const recordsBySlNo = {};
    allDocs.forEach(doc => {
      const data = doc.data();
      if (!recordsBySlNo[data.slNo]) {
        recordsBySlNo[data.slNo] = [];
      }
      recordsBySlNo[data.slNo].push({
        id: doc.id,
        data: data
      });
    });
    
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    
    // Find duplicates and remove extra ones
    for (const [slNo, records] of Object.entries(recordsBySlNo)) {
      if (records.length > 1) {
        duplicatesFound += records.length - 1;
        console.log(`⚠️  Duplicate SL No ${slNo} found (${records.length} copies)`);
        
        // Keep the first one, delete the rest
        for (let i = 1; i < records.length; i++) {
          try {
            await deleteDoc(doc(db, 'workingSheet', records[i].id));
            console.log(`  🗑️  Deleted duplicate with ID: ${records[i].id}`);
            duplicatesRemoved++;
          } catch (error) {
            console.error(`  ❌ Failed to delete ${records[i].id}:`, error.message);
          }
        }
      }
    }
    
    if (duplicatesFound === 0) {
      console.log('✅ No duplicates found');
    } else {
      console.log(`\n📊 Summary:`);
      console.log(`  - Duplicates found: ${duplicatesFound}`);
      console.log(`  - Duplicates removed: ${duplicatesRemoved}`);
      console.log(`  - Remaining duplicates: ${duplicatesFound - duplicatesRemoved}`);
    }
    
    console.log('\n✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Confirm before running
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('⚠️  This will delete duplicate records from your database. Are you sure? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    cleanupDuplicates().then(() => {
      readline.close();
    });
  } else {
    console.log('🚫 Cleanup cancelled');
    readline.close();
  }
});