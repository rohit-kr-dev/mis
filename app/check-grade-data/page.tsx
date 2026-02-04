'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

interface GradeDataItem {
  collection: string;
  gradeValues: string[];
  count: number;
}

export default function CheckGradeData() {
  const [collections, setCollections] = useState<string[]>([]);
  const [gradeData, setGradeData] = useState<GradeDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFirestoreData = async () => {
      try {
        console.log('🔍 Checking Firestore for grade data...');
        
        // Check common collections
        const collectionsToCheck = [
          'grades',
          'grade-list',
          'grade-master', 
          'categories',
          'items',
          'products',
          'materials',
          'import-transactions',
          'domestic-transactions'
        ];
        
        const foundGradeData: GradeDataItem[] = [];
        
        for (const collectionName of collectionsToCheck) {
          try {
            console.log(`Checking collection: ${collectionName}`);
            const q = query(collection(db, collectionName));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              console.log(`✅ Found ${snapshot.size} documents in ${collectionName}`);
              
              // Look for grade fields
              let gradeValues = new Set();
              let hasGradeField = false;
              
              snapshot.forEach((doc) => {
                const data = doc.data();
                const gradeFields = ['grade', 'Grade', 'grades', 'Grades', 'materialGrade', 'productGrade'];
                
                gradeFields.forEach(field => {
                  if (data[field] !== undefined) {
                    hasGradeField = true;
                    if (typeof data[field] === 'string') {
                      gradeValues.add(data[field]);
                    }
                  }
                });
              });
              
              if (hasGradeField) {
                foundGradeData.push({
                  collection: collectionName,
                  gradeValues: Array.from(gradeValues) as string[],
                  count: snapshot.size
                });
                console.log(`🎯 Grade data found:`, Array.from(gradeValues));
              }
            }
          } catch (error) {
            console.log(`❌ Error checking ${collectionName}:`, error instanceof Error ? error.message : String(error));
          }
        }
        
        setGradeData(foundGradeData);
        setLoading(false);
        
      } catch (error) {
        console.error('Error checking Firestore:', error);
        setLoading(false);
      }
    };
    
    checkFirestoreData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Checking Firestore for Grade Data...</h2>
        <div className="text-gray-600">Please check browser console for detailed results</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Firestore Grade Data Check</h2>
      
      {gradeData.length > 0 ? (
        <div className="space-y-4">
          <div className="text-green-600 font-semibold">✅ Grade data found in Firestore!</div>
          {gradeData.map((item, index) => (
            <div key={index} className="border p-4 rounded">
              <div className="font-medium">Collection: {item.collection}</div>
              <div>Documents: {item.count}</div>
              <div>Grade Values: {item.gradeValues.join(', ')}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-red-600">
          ❌ No grade data found in Firestore collections.
          You may need to create a grades collection or add grade fields to existing data.
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-600">
        <p>Check browser console for detailed logs of all collections checked.</p>
      </div>
    </div>
  );
}