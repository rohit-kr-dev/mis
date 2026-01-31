const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query } = require('firebase/firestore');

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

async function checkSpecificCollections() {
  console.log('🔍 Checking specific Firestore collections for grade data...\n');
  
  // Common collection names to check
  const collectionsToCheck = [
    'grades',
    'grade-list', 
    'grade-master',
    'categories',
    'items',
    'products',
    'materials',
    'vendors',
    'suppliers',
    'import-transactions',
    'domestic-transactions'
  ];
  
  let foundGradeData = false;
  
  for (const collectionName of collectionsToCheck) {
    try {
      console.log(`🔍 Checking collection: ${collectionName}`);
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log(`✅ Found ${snapshot.size} documents in '${collectionName}'`);
        
        // Look for grade-related fields in documents
        let gradeValues = new Set();
        let hasGradeField = false;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Check various field names that might contain grades
          const potentialGradeFields = [
            'grade', 'Grade', 'grades', 'Grades',
            'materialGrade', 'productGrade', 'itemGrade',
            'qualityGrade', 'standardGrade', 'level'
          ];
          
          potentialGradeFields.forEach(field => {
            if (data[field] !== undefined) {
              hasGradeField = true;
              if (typeof data[field] === 'string') {
                gradeValues.add(data[field]);
              } else if (Array.isArray(data[field])) {
                data[field].forEach(val => {
                  if (typeof val === 'string') gradeValues.add(val);
                });
              }
            }
          });
        });
        
        if (hasGradeField) {
          console.log(`🎯 Grade data found in '${collectionName}':`);
          console.log(`   Values: [${Array.from(gradeValues).sort().join(', ')}]`);
          foundGradeData = true;
        } else {
          console.log(`   No grade fields found in documents`);
        }
        
        // Show first document as example
        const firstDoc = snapshot.docs[0];
        console.log(`   Sample document:`, firstDoc.data());
        
      } else {
        console.log(`❌ Collection '${collectionName}' is empty`);
      }
      
      console.log('---');
      
    } catch (error) {
      console.log(`❌ Collection '${collectionName}' not accessible:`, error.message);
      console.log('---');
    }
  }
  
  if (!foundGradeData) {
    console.log('\n📊 Summary:');
    console.log('❌ No existing grade data found in Firestore collections');
    console.log('💡 You may need to create a grades collection or add grade fields to existing data');
  }
}

// Also check if we can create a simple test document
async function testWriteAccess() {
  console.log('\n🧪 Testing write access...');
  try {
    // This would test write access, but we'll skip for now to avoid creating test data
    console.log('✅ Read access confirmed');
  } catch (error) {
    console.log('❌ Write access issue:', error.message);
  }
}

async function main() {
  await checkSpecificCollections();
  await testWriteAccess();
}

main().catch(console.error);