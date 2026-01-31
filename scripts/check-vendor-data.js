const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0cZBL4KIkX8yTCzGLtBBfcePWX26Z8l8",
  authDomain: "material-mis.firebaseapp.com",
  projectId: "material-mis",
  storageBucket: "material-mis.firebasestorage.app",
  messagingSenderId: "915306059620",
  appId: "1:915306059620:web:329eed15f0706675220c71",
  measurementId: "G-GWVPEW4LH3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkVendorData() {
  console.log('🔍 Checking vendor data in Firestore...\n');
  
  try {
    // Check suppliers collection
    console.log('📋 SUPPLIERS COLLECTION:');
    const suppliersQuery = query(collection(db, 'suppliers'), orderBy('supplierName'));
    const suppliersSnapshot = await getDocs(suppliersQuery);
    
    if (!suppliersSnapshot.empty) {
      console.log(`✅ Found ${suppliersSnapshot.size} suppliers`);
      console.log('\n_VENDOR LIST_:');
      
      suppliersSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.supplierName} (${data.alias || 'No alias'})`);
      });
      
      console.log(`\n📈 Total suppliers: ${suppliersSnapshot.size}`);
    } else {
      console.log('❌ No suppliers found');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Check if there's a vendors collection (alternative name)
    console.log('📋 VENDORS COLLECTION:');
    try {
      const vendorsQuery = query(collection(db, 'vendors'), orderBy('vendorName'));
      const vendorsSnapshot = await getDocs(vendorsQuery);
      
      if (!vendorsSnapshot.empty) {
        console.log(`✅ Found ${vendorsSnapshot.size} vendors`);
        console.log('\n_VENDOR LIST_:');
        
        vendorsSnapshot.forEach((doc, index) => {
          const data = doc.data();
          console.log(`${index + 1}. ${data.vendorName || data.name || 'Unnamed Vendor'}`);
        });
      } else {
        console.log('❌ No vendors collection found or empty');
      }
    } catch (error) {
      console.log('❌ Vendors collection not accessible');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Check for vendor data in items collection
    console.log('📋 ITEMS COLLECTION (checking for vendor references):');
    const itemsQuery = query(collection(db, 'items'));
    const itemsSnapshot = await getDocs(itemsQuery);
    
    if (!itemsSnapshot.empty) {
      const companies = new Set();
      itemsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.company && data.company !== 'NA') {
          companies.add(data.company);
        }
      });
      
      if (companies.size > 0) {
        console.log(`✅ Found ${companies.size} companies in items:`);
        console.log(Array.from(companies).sort().join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking vendor data:', error);
  }
}

checkVendorData();