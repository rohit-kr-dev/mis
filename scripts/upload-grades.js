const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, deleteDoc, getDocs, query, where } = require('firebase/firestore');
const grades = require('./grades.json');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1BnFt5bVb12QhJx2JZ1m7H2v9K4n5P6Q",
  authDomain: "material-mis.firebaseapp.com",
  projectId: "material-mis",
  storageBucket: "material-mis.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadGrades() {
  try {
    console.log('Starting grade upload...');
    
    // First, clear existing grades
    console.log('Clearing existing grades...');
    const q = query(collection(db, 'grades'));
    const snapshot = await getDocs(q);
    const deletePromises = [];
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    await Promise.all(deletePromises);
    console.log(`Deleted ${snapshot.size} existing grades`);
    
    // Upload new grades
    console.log('Uploading new grades...');
    const uploadPromises = grades.map(async (gradeName, index) => {
      try {
        await addDoc(collection(db, 'grades'), {
          gradeName: gradeName,
          createdAt: new Date()
        });
        console.log(`Uploaded grade ${index + 1}: ${gradeName}`);
      } catch (error) {
        console.error(`Error uploading grade ${gradeName}:`, error);
      }
    });
    
    await Promise.all(uploadPromises);
    console.log(`Successfully uploaded ${grades.length} grades to Firestore`);
    
  } catch (error) {
    console.error('Error in uploadGrades:', error);
  }
}

uploadGrades();