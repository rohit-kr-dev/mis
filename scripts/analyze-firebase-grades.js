// Script to analyze grades from Firebase workingSheet collection
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase configuration from your environment
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

async function analyzeGradesInFirebase() {
  try {
    console.log('🔍 Analyzing grades in Firebase workingSheet collection...\n');
    
    // Get all documents from workingSheet collection
    const snapshot = await getDocs(collection(db, 'workingSheet'));
    
    console.log(`📊 Total records in database: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('⚠️  No records found in workingSheet collection');
      return;
    }
    
    // Extract all grades
    const grades = new Set();
    const gradeCounts = {};
    const companyCounts = {};
    const supplierCounts = {};
    
    const allRecords = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      allRecords.push({
        id: doc.id,
        ...data
      });
      
      // Extract grade
      if (data.grade) {
        const grade = data.grade.toString().trim();
        grades.add(grade);
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
      }
      
      // Extract company
      if (data.company) {
        const company = data.company.toString().trim();
        companyCounts[company] = (companyCounts[company] || 0) + 1;
      }
      
      // Extract supplier
      if (data.supplierName) {
        const supplier = data.supplierName.toString().trim();
        supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
      }
    });
    
    const uniqueGrades = Array.from(grades).sort();
    
    console.log(`\n📈 Unique grades found: ${uniqueGrades.length}`);
    console.log('\n📋 Grade List with counts:');
    uniqueGrades.forEach((grade, index) => {
      console.log(`  ${index + 1}. ${grade} (${gradeCounts[grade]} records)`);
    });
    
    // Show company distribution
    console.log('\n🏢 Companies found:');
    const companies = Object.keys(companyCounts).sort();
    companies.forEach(company => {
      console.log(`  ${company}: ${companyCounts[company]} records`);
    });
    
    // Show supplier distribution
    console.log('\n👥 Suppliers found:');
    const suppliers = Object.keys(supplierCounts).sort();
    suppliers.forEach(supplier => {
      console.log(`  ${supplier}: ${supplierCounts[supplier]} records`);
    });
    
    // Show sample records with different grades
    console.log('\n📋 Sample records by grade:');
    const gradeSamples = {};
    allRecords.forEach(record => {
      if (record.grade && !gradeSamples[record.grade]) {
        gradeSamples[record.grade] = record;
      }
    });
    
    Object.keys(gradeSamples).slice(0, 10).forEach(grade => {
      const record = gradeSamples[grade];
      console.log(`\n  Grade: ${grade}`);
      console.log(`    Supplier: ${record.supplierName || 'N/A'}`);
      console.log(`    Company: ${record.company || 'N/A'}`);
      console.log(`    Branch: ${record.branch || 'N/A'}`);
      console.log(`    Buy Rate: ${record.buyRate || 'N/A'}`);
      console.log(`    Qty: ${record.qty || 'N/A'}`);
    });
    
    // Grade statistics
    console.log('\n📊 Grade Statistics:');
    console.log(`  Total unique grades: ${uniqueGrades.length}`);
    console.log(`  Total records: ${snapshot.size}`);
    console.log(`  Average records per grade: ${(snapshot.size / uniqueGrades.length).toFixed(1)}`);
    
    // Find most and least common grades
    const sortedByCount = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1]);
    console.log('\n🏆 Top 5 most common grades:');
    sortedByCount.slice(0, 5).forEach(([grade, count], index) => {
      console.log(`  ${index + 1}. ${grade}: ${count} records`);
    });
    
    console.log('\n🐍 Bottom 5 least common grades:');
    sortedByCount.slice(-5).forEach(([grade, count], index) => {
      console.log(`  ${sortedByCount.length - 4 + index}. ${grade}: ${count} records`);
    });
    
    console.log('\n✅ Grade analysis completed');
    
  } catch (error) {
    console.error('❌ Error analyzing grades:', error);
    
    if (error.message.includes('permission')) {
      console.log('\n💡 Permission error - check your Firebase rules');
    } else if (error.message.includes('network')) {
      console.log('\n💡 Network error - check your connection');
    }
  }
}

// Run the analysis
analyzeGradesInFirebase();