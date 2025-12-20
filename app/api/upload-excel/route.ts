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
      return {
        slNo: row['Sr. No.'] || row['Sl No'] || index + 1,
        category: row['Category'] || '',
        branch: row['Branch'] || row['PSPL Branch'] || '',
        supplierName: row['Supplier'] || '',
        alias: row['Alias'] || '',
        purchaseDate: row['Purchase Date'] || '',
        billMonth: row['Bill Month'] || '',
        period: row['Bill Month'] || '',
        billNo: row['Bill No'] || '',
        buyRate: parseFloat(row['Buy Rate']) || 0,
        qty: parseFloat(row['Qty']) || 0,
        grade: row['Grade'] || '',
        itemName: row['Grade'] || '',
        company: row['Company'] || '',
        productCategory: row['Product Cat'] || '',
        type: row['Type'] || '',
        buyingTerms: row['Buying Terms'] || '',
        dateForCN: row['Date for CN'] || '',
        cnMonth: row['CN Month'] || '',
        ebiStatus: row['EBI'] || 'No',
        pp: parseFloat(row['PP']) || null,
        source: row['Source'] || null,
        rateAsPerConfirmation: parseFloat(row['Rate, as per confirmation']) || null,
        rateAsPerPriceList: parseFloat(row['Rate, as per price list']) || null,
        priceType: row['Price Type'] || null,
        location: row['Location'] || null,
        mou: parseFloat(row['MOU']) || null,
        qd: parseFloat(row['QD']) || null,
        ebiValue: parseFloat(row['EBI']) || null,
        gsi: parseFloat(row['GSI']) || null,
        scheme: parseFloat(row['Scheme']) || null,
        extra: parseFloat(row['Extra']) || null,
        loading: parseFloat(row['Loading']) || null,
        tpt: parseFloat(row['TPT']) || null,
        insurance: parseFloat(row['Insurance']) || null,
        roundOff: parseFloat(row['Round Off']) || null,
        commission: parseFloat(row['Commission']) || null,
        gstCn: parseFloat(row['GST CN']) || null,
        total: parseFloat(row['Total']) || 0,
        diff: parseFloat(row['Diff']) || 0,
        status: row['Status'] || 'Pending',
        remarks: row['Remarks'] || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
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