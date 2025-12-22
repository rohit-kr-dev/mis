import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Please upload a valid Excel file (.xlsx or .xls)' }, { status: 400 });
    }

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    // Process data and prepare for Firestore
    const processedData = jsonData.map((row, index) => {
      const processedRow = {
        slNo: index + 1030, // Use sequential IDs to avoid conflicts
        supplierName: row['Supplier'] || '',
        alias: row['Alias'] || '',
        period: row['Period'] || '',
        type: row['Type'] || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return processedRow;
    });

    // Save to Firestore in batches
    const batchSize = 50;
    let savedCount = 0;
    
    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Use slNo as document ID
          const docRef = doc(db, 'workingSheet', record.slNo.toString());

          const snap = await getDoc(docRef);

          // Insert only if it does not already exist
          if (!snap.exists()) {
            await setDoc(docRef, {
              ...record,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            savedCount++;
          }
        } catch (saveError) {
          console.error('Error saving record:', saveError);
          // continue with other records
        }
      }
    }

    return NextResponse.json({ 
      message: `Successfully uploaded ${savedCount} records`, 
      count: savedCount 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}