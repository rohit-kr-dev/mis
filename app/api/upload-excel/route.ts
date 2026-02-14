import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';

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
    
    // Find the Working sheet - look for "Working" in sheet name (handles "<< Working >>" or "Working")
    let workingSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('working') && !name.toLowerCase().includes('dropdown')
    ) || workbook.SheetNames[0];
    
    // If no working sheet found, try to find by checking for 'Sr. No.' column in first few rows
    if (!workingSheetName.toLowerCase().includes('working')) {
      for (const sheetName of workbook.SheetNames) {
        const testSheet = workbook.Sheets[sheetName];
        const testData = XLSX.utils.sheet_to_json(testSheet, { defval: null, header: 1 });
        if (testData.length > 0 && Object.keys(testData[0] || {}).some(k => k.toLowerCase().includes('sr') || k.toLowerCase().includes('no.'))) {
          workingSheetName = sheetName;
          break;
        }
      }
    }
    
    console.log(`Using sheet: ${workingSheetName}`);
    const worksheet = workbook.Sheets[workingSheetName];
    
    // Convert to JSON, reading all data starting from row 2 (header row is row 1)
    const rawJsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 1, defval: null });
    
    // Excel date conversion function
    function excelDateToJSDate(serial: number): Date {
      return new Date((serial - 25569) * 86400 * 1000);
    }
    
    // Normalize row keys to handle invisible characters and spaces in Excel headers
    function normalizeRow(row: Record<string, any>): Record<string, any> {
      const cleaned: Record<string, any> = {};
      
      for (const key in row) {
        const cleanKey = key
          .replace(/\s+/g, " ")   // collapse multiple spaces
          .replace(/\n/g, "")     // remove new lines
          .trim();                // remove leading/trailing spaces
        
        // Convert Excel serial dates to JavaScript dates
        let value = row[key];
        if (typeof value === 'number' && key.includes('Date')) {
          // Check if it's a valid Excel date serial number
          if (value > 1 && value < 100000) {
            value = excelDateToJSDate(value);
          }
        }
        
        cleaned[cleanKey] = value;
      }
      
      return cleaned;
    }
    
    // Apply normalization to all rows
    const jsonData: any[] = rawJsonData.map(normalizeRow);
    
    // Find the highest SL No already in the database
    let maxExistingSlNo = 0;
    try {
      const q = query(collection(db, 'workingSheet'), orderBy('slNo', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const lastDoc = snapshot.docs[0];
        maxExistingSlNo = lastDoc.data().slNo || 0;
      }
    } catch (error) {
      console.log('Could not fetch existing records, proceeding with full check');
    }
    
    // Log data processing info
    console.log(`Processing Excel file: ${file.name}`);
    console.log(`Total rows in Excel: ${jsonData.length}`);
    console.log(`Max existing SL No: ${maxExistingSlNo}`);
    
    // Process data and prepare for Firestore
    const processedData = jsonData.map((row, index) => {
      const processedRow = {
        slNo: row['Sr. No.'] || index + 1,
        category: row['Category'] || '',
        branch: row['PSPL Branch'] || '',
        supplierName: row['Supplier'] || '',
        alias: row['Alias'] || '',
        purchaseDate: typeof row['Purchase Date'] === 'string' ? row['Purchase Date'] : (row['Purchase Date'] instanceof Date ? row['Purchase Date'].toISOString() : ''),
        billMonth: row['Bill Month'] || '',
        period: row['Bill Month'] || '',
        billNo: row['Bill No.'] || '',
        buyRate: parseFloat(row['Buy Rate']) || parseFloat(row[' Buy Rate ']) || 0,
        qty: parseFloat(row['QTY']) || parseFloat(row[' QTY ']) || 0,
        grade: row['Grade'] || row[' Grade '] || '',
        itemName: row['Grade'] || row[' Grade '] || '',
        company: row['Company'] || row[' Company '] || '',
        productCategory: row['Product Cat'] || row[' Product Cat '] || '',
        type: row['Type'] || '',
        buyingTerms: row['Buying Terms (If Outright with Disc)'] || '',
        dateForCN: typeof row['Date for CN'] === 'string' ? row['Date for CN'] : (row['Date for CN'] instanceof Date ? row['Date for CN'].toISOString() : ''),
        cnMonth: row['CN Month'] || '',
        ebiStatus: row['EBI'] || 'No',
        pp: parseFloat(row['PP']) || null,
        source: row['Source'] || null,
        rateAsPerConfirmation: parseFloat(row['Rate, As per Confirmation']) || parseFloat(row[' Rate, As per Confirmation ']) || null,
        rateAsPerPriceList: parseFloat(row['Rate, As per Price List']) || parseFloat(row[' Rate, As per Price List ']) || null,
        priceType: row['Price Type'] || row[' Price Type '] || null,
        location: row['Location'] || row[' Location '] || null,
        mou: parseFloat(row['MOU']) || parseFloat(row[' MOU ']) || null,
        qd: parseFloat(row['QD']) || parseFloat(row[' QD ']) || null,
        ebiValue: parseFloat(row['EBI']) || parseFloat(row[' EBI ']) || null,
        gsi: parseFloat(row['GSI']) || parseFloat(row[' GSI ']) || null,
        scheme: parseFloat(row['Scheme']) || parseFloat(row[' Scheme ']) || null,
        extra: parseFloat(row['Extra']) || parseFloat(row[' Extra ']) || null,
        loading: parseFloat(row['Loading']) || parseFloat(row[' Loading ']) || null,
        tpt: parseFloat(row['TPT']) || parseFloat(row[' TPT ']) || null,
        insurance: parseFloat(row['Insurance']) || parseFloat(row[' Insurance ']) || null,
        roundOff: parseFloat(row['Round Off']) || parseFloat(row[' Round Off ']) || null,
        commission: parseFloat(row['Commission']) || parseFloat(row[' Commission ']) || null,
        gstCn: parseFloat(row['GST CN']) || parseFloat(row[' GST CN ']) || null,
        total: parseFloat(row['Total']) || parseFloat(row[' Total ']) || 0,
        diff: parseFloat(row['Diff']) || parseFloat(row[' Diff ']) || 0,
        status: row['Status'] || row[' Status '] || 'Pending',
        remarks: row['Remarks, if any diff'] || row[' Remarks, if any diff '] || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return processedRow;
    });
    
    // Sort by SL No to get the latest records
    processedData.sort((a, b) => a.slNo - b.slNo);
    
    // Debug: Log SL number distribution
    console.log('SL Number analysis:');
    console.log('- Min SL No:', Math.min(...processedData.map(r => r.slNo)));
    console.log('- Max SL No:', Math.max(...processedData.map(r => r.slNo)));
    console.log('- Records with SL No > maxExisting:', processedData.filter(record => record.slNo > maxExistingSlNo).length);
    
    // Process ALL records when database is empty, otherwise process only new records
    let recordsToProcess;
    let newRecordsCount = 0;
    
    if (maxExistingSlNo === 0) {
      // Database is empty - process all records
      console.log('Database is empty, processing all records');
      recordsToProcess = processedData;
      newRecordsCount = processedData.length;
    } else {
      // Database has existing data - process only new records
      const newRecords = processedData.filter(record => record.slNo > maxExistingSlNo);
      newRecordsCount = newRecords.length;
      console.log(`Found ${newRecordsCount} new records (SL No > ${maxExistingSlNo})`);
      recordsToProcess = newRecords;
    }
    
    console.log(`Records to process: ${recordsToProcess.length} records`);

    // Save to Firestore with proper duplicate check
    const batchSize = 100; // Increased batch size for better performance with large datasets
    let savedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < recordsToProcess.length; i += batchSize) {
      const batch = recordsToProcess.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Check if document already exists
          const docRef = doc(db, 'workingSheet', record.slNo.toString());
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // Document already exists - skip
            duplicateCount++;
            continue;
          }
          
          // Document doesn't exist - save it
          await setDoc(docRef, {
            ...record,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          savedCount++;
        } catch (saveError) {
          console.error('Error saving record:', saveError);
          errorCount++;
        }
      }
    }

    // Log final results
    console.log(`Upload completed for ${file.name}:`);
    console.log(`- Total Excel rows: ${jsonData.length}`);
    console.log(`- New records found: ${newRecordsCount}`);
    console.log(`- Records processed: ${recordsToProcess.length}`);
    console.log(`- Successfully saved: ${savedCount}`);
    console.log(`- Duplicates skipped: ${duplicateCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    return NextResponse.json({ 
      message: `Upload completed successfully`,
      summary: {
        totalProcessed: recordsToProcess.length,
        saved: savedCount,
        duplicatesSkipped: duplicateCount,
        errors: errorCount,
        maxExistingSlNo: maxExistingSlNo,
        totalExcelRows: jsonData.length,
        newRecordsFound: newRecordsCount
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}