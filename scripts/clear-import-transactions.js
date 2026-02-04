const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBzY7F0iN0Zt0Zt0Zt0Zt0Zt0Zt0Zt0Zt0",
  authDomain: "material-mis-442712.firebaseapp.com",
  projectId: "material-mis-442712",
  storageBucket: "material-mis-442712.appspot.com",
  messagingSenderId: "712345678901",
  appId: "1:712345678901:web:abcdef1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearImportTransactions() {
  try {
    console.log('Starting to clear import transactions...');
    
    // Get all documents from import-transactions collection
    const querySnapshot = await getDocs(collection(db, 'import-transactions'));
    
    console.log(`Found ${querySnapshot.size} documents to delete`);
    
    if (querySnapshot.size === 0) {
      console.log('No documents found in import-transactions collection');
      return;
    }
    
    // Delete all documents
    let deletedCount = 0;
    for (const document of querySnapshot.docs) {
      await deleteDoc(doc(db, 'import-transactions', document.id));
      deletedCount++;
      console.log(`Deleted document: ${document.id}`);
    }
    
    console.log(`✅ Successfully deleted ${deletedCount} documents from import-transactions collection`);
    
  } catch (error) {
    console.error('Error clearing import transactions:', error);
  }
}

// Run the function
clearImportTransactions();