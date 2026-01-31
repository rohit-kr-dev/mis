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

async function checkCollections() {
  console.log('🔍 Checking Firestore collections...\n');
  
  try {
    // List all collections
    const collections = await db.listCollections();
    console.log('📚 Available Collections:');
    collections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.id}`);
    });
    
    console.log('\n🔍 Checking for grade-related data...\n');
    
    // Check common collection names that might contain grades
    const potentialGradeCollections = [
      'grades',
      'grade-list',
      'grade-master',
      'categories',
      'items',
      'products',
      'materials'
    ];
    
    for (const collectionName of potentialGradeCollections) {
      try {
        const q = query(collection(db, collectionName));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          console.log(`✅ Collection '${collectionName}' exists with ${snapshot.size} documents`);
          
          // Show sample documents
          let count = 0;
          snapshot.forEach((doc) => {
            if (count < 3) { // Show first 3 documents
              console.log(`   Document ID: ${doc.id}`);
              console.log(`   Data:`, doc.data());
              console.log('');
              count++;
            }
          });
          
          if (snapshot.size > 3) {
            console.log(`   ... and ${snapshot.size - 3} more documents`);
          }
        } else {
          console.log(`❌ Collection '${collectionName}' is empty or doesn't exist`);
        }
      } catch (error) {
        console.log(`❌ Collection '${collectionName}' not found or inaccessible`);
      }
    }
    
    // Check if any documents contain grade fields
    console.log('\n🔍 Searching for grade fields in existing collections...\n');
    
    for (const collectionRef of collections) {
      try {
        const q = query(collection(db, collectionRef.id));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          let hasGradeField = false;
          const gradeValues = new Set();
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Check for common grade field names
            const gradeFields = ['grade', 'Grade', 'grades', 'Grades', 'materialGrade', 'productGrade'];
            
            gradeFields.forEach(field => {
              if (data[field] !== undefined) {
                hasGradeField = true;
                if (typeof data[field] === 'string') {
                  gradeValues.add(data[field]);
                } else if (Array.isArray(data[field])) {
                  data[field].forEach(val => gradeValues.add(val));
                }
              }
            });
          });
          
          if (hasGradeField) {
            console.log(`✅ Collection '${collectionRef.id}' contains grade data:`);
            console.log(`   Grade values found: [${Array.from(gradeValues).join(', ')}]`);
            console.log('');
          }
        }
      } catch (error) {
        console.log(`❌ Could not read collection '${collectionRef.id}':`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking Firestore:', error);
  }
}

checkCollections();