// Script to check Firebase connection and existing grades data
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit, where } = require('firebase/firestore');

// Check if Firebase config exists
function checkFirebaseConfig() {
  console.log('🔍 Checking Firebase configuration...\n');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  const missingVars = [];
  const foundVars = [];
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      foundVars.push(`${envVar}: ${value.substring(0, 10)}...`);
    } else {
      missingVars.push(envVar);
    }
  });
  
  if (foundVars.length > 0) {
    console.log('✅ Found Firebase environment variables:');
    foundVars.forEach(varInfo => console.log(`  ${varInfo}`));
  }
  
  if (missingVars.length > 0) {
    console.log('❌ Missing Firebase environment variables:');
    missingVars.forEach(varName => console.log(`  ${varName}`));
    console.log('\n⚠️  You need to set these in your environment variables or .env file');
    return false;
  }
  
  return true;
}

// Check if we can connect to Firebase
async function testFirebaseConnection() {
  try {
    console.log('\n📡 Testing Firebase connection...\n');
    
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    // Initialize Firebase only if not already initialized
    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase app initialized successfully');
    } else {
      app = getApps()[0];
      console.log('✅ Firebase app already initialized');
    }
    
    const db = getFirestore(app);
    console.log('✅ Firestore database connected');
    
    // Try to read from different collections
    const collectionsToCheck = ['workingSheet', 'grades', 'items', 'suppliers'];
    
    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`\n🔍 Checking collection: ${collectionName}`);
        const snapshot = await getDocs(collection(db, collectionName));
        console.log(`  📊 Records found: ${snapshot.size}`);
        
        if (snapshot.size > 0) {
          // Show sample records
          const sampleDocs = [];
          let count = 0;
          snapshot.forEach(doc => {
            if (count < 3) {
              sampleDocs.push({
                id: doc.id,
                data: doc.data()
              });
              count++;
            }
          });
          
          console.log('  📋 Sample records:');
          sampleDocs.forEach((doc, index) => {
            console.log(`    ${index + 1}. ID: ${doc.id}`);
            if (doc.data.grade) {
              console.log(`       Grade: ${doc.data.grade}`);
            }
            if (doc.data.supplierName) {
              console.log(`       Supplier: ${doc.data.supplierName}`);
            }
            if (doc.data.company) {
              console.log(`       Company: ${doc.data.company}`);
            }
          });
          
          // If checking workingSheet, extract unique grades
          if (collectionName === 'workingSheet' && snapshot.size > 0) {
            const grades = new Set();
            snapshot.forEach(doc => {
              const data = doc.data();
              if (data.grade) {
                grades.add(data.grade);
              }
            });
            
            if (grades.size > 0) {
              console.log(`  📈 Unique grades in workingSheet: ${grades.size}`);
              console.log('  📋 Grade list:');
              Array.from(grades).sort().forEach((grade, index) => {
                console.log(`    ${index + 1}. ${grade}`);
              });
            }
          }
        } else {
          console.log('  ⚠️  No records found');
        }
      } catch (error) {
        console.log(`  ❌ Error accessing ${collectionName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Firebase connection check completed');
    
  } catch (error) {
    console.error('❌ Firebase connection error:', error.message);
    if (error.message.includes('Invalid resource field value')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('  - Check your Firebase project ID in environment variables');
      console.log('  - Verify your Firebase project exists and is properly configured');
      console.log('  - Make sure you have proper network connectivity');
    }
  }
}

// Run the checks
async function main() {
  const configValid = checkFirebaseConfig();
  if (configValid) {
    await testFirebaseConnection();
  } else {
    console.log('\n🚫 Cannot test Firebase connection due to missing configuration');
  }
}

main();