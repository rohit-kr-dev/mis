import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Path to the Excel file
const filePath = path.join(process.cwd(), 'scripts', 'Material_Upliftment_MIS.xlsx');

console.log('🔍 TESTING EXCEL MAPPING WITH SAMPLE DATA');
console.log('========================================');

try {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  
  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  console.log(`📋 Sheet name: ${firstSheetName}`);
  
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total rows: ${jsonData.length}`);
  
  // Show first few rows
  console.log('\n📋 First 3 rows (Raw Excel Data):');
  for (let i = 0; i < Math.min(3, jsonData.length); i++) {
    console.log(`\nRow ${i + 1}:`);
    const row = jsonData[i];
    console.log(JSON.stringify(row, null, 2));
  }
  
  // Test the mapping logic from the API
  console.log('\n🔧 Testing API Mapping Logic:');
  console.log('============================');
  
  if (jsonData.length > 0) {
    const row = jsonData[0];
    const index = 0;
    
    console.log('\nTesting individual field mappings:');
    
    // Test each field mapping from the API
    console.log('slNo:', row['Sr. No.'] || index + 1);
    console.log('category:', row['Category'] || '');
    console.log('branch:', row['PSPL Branch'] || '');
    console.log('supplierName:', row['Supplier'] || '');
    console.log('alias:', row['Alias'] || '');
    console.log('purchaseDate:', row['Purchase Date'] || '');
    console.log('billMonth:', row['Bill Month'] || '');
    console.log('period:', row['Bill Month'] || '');
    console.log('billNo:', row['Bill No.'] || '');
    console.log('buyRate:', parseFloat(row[' Buy Rate ']) || 0);
    console.log('qty:', parseFloat(row[' QTY ']) || 0);
    console.log('grade:', row[' Grade '] || '');
    console.log('itemName:', row[' Grade '] || '');
    console.log('company:', row[' Company '] || '');
    console.log('productCategory:', row[' Product Cat '] || '');
    console.log('type:', row['Type'] || '');
    console.log('buyingTerms:', row['Buying Terms (If Outright with Disc)'] || '');
    console.log('dateForCN:', row['Date for CN'] || '');
    console.log('cnMonth:', row['CN Month'] || '');
    console.log('ebiStatus:', row['EBI'] || 'No');
    console.log('pp:', parseFloat(row['PP']) || null);
    console.log('source:', row['Source'] || null);
    console.log('rateAsPerConfirmation:', parseFloat(row[' Rate, As per Confirmation ']) || null);
    console.log('rateAsPerPriceList:', parseFloat(row[' Rate, As per Price List ']) || null);
    console.log('priceType:', row[' Price Type '] || null);
    console.log('location:', row[' Location '] || null);
    console.log('mou:', parseFloat(row[' MOU ']) || null);
    console.log('qd:', parseFloat(row[' QD ']) || null);
    console.log('ebiValue:', parseFloat(row[' EBI ']) || null);
    console.log('gsi:', parseFloat(row[' GSI ']) || null);
    console.log('scheme:', parseFloat(row[' Scheme ']) || null);
    console.log('extra:', parseFloat(row[' Extra ']) || null);
    console.log('loading:', parseFloat(row[' Loading ']) || null);
    console.log('tpt:', parseFloat(row[' TPT ']) || null);
    console.log('insurance:', parseFloat(row[' Insurance ']) || null);
    console.log('roundOff:', parseFloat(row[' Round Off ']) || null);
    console.log('commission:', parseFloat(row[' Commission ']) || null);
    console.log('gstCn:', parseFloat(row[' GST CN ']) || null);
    console.log('total:', parseFloat(row[' Total ']) || 0);
    console.log('diff:', parseFloat(row[' Diff ']) || 0);
    console.log('status:', row[' Status '] || 'Pending');
    console.log('remarks:', row[' Remarks, if any diff '] || '');
    
    // Show the complete mapped object
    console.log('\n📝 Complete mapped object:');
    const processedRow = {
      slNo: row['Sr. No.'] || index + 1,
      category: row['Category'] || '',
      branch: row['PSPL Branch'] || '',
      supplierName: row['Supplier'] || '',
      alias: row['Alias'] || '',
      purchaseDate: row['Purchase Date'] || '',
      billMonth: row['Bill Month'] || '',
      period: row['Bill Month'] || '',
      billNo: row['Bill No.'] || '',
      buyRate: parseFloat(row[' Buy Rate ']) || 0,
      qty: parseFloat(row[' QTY ']) || 0,
      grade: row[' Grade '] || '',
      itemName: row[' Grade '] || '',
      company: row[' Company '] || '',
      productCategory: row[' Product Cat '] || '',
      type: row['Type'] || '',
      buyingTerms: row['Buying Terms (If Outright with Disc)'] || '',
      dateForCN: row['Date for CN'] || '',
      cnMonth: row['CN Month'] || '',
      ebiStatus: row['EBI'] || 'No',
      pp: parseFloat(row['PP']) || null,
      source: row['Source'] || null,
      rateAsPerConfirmation: parseFloat(row[' Rate, As per Confirmation ']) || null,
      rateAsPerPriceList: parseFloat(row[' Rate, As per Price List ']) || null,
      priceType: row[' Price Type '] || null,
      location: row[' Location '] || null,
      mou: parseFloat(row[' MOU ']) || null,
      qd: parseFloat(row[' QD ']) || null,
      ebiValue: parseFloat(row[' EBI ']) || null,
      gsi: parseFloat(row[' GSI ']) || null,
      scheme: parseFloat(row[' Scheme ']) || null,
      extra: parseFloat(row[' Extra ']) || null,
      loading: parseFloat(row[' Loading ']) || null,
      tpt: parseFloat(row[' TPT ']) || null,
      insurance: parseFloat(row[' Insurance ']) || null,
      roundOff: parseFloat(row[' Round Off ']) || null,
      commission: parseFloat(row[' Commission ']) || null,
      gstCn: parseFloat(row[' GST CN ']) || null,
      total: parseFloat(row[' Total ']) || 0,
      diff: parseFloat(row[' Diff ']) || 0,
      status: row[' Status '] || 'Pending',
      remarks: row[' Remarks, if any diff '] || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log(JSON.stringify(processedRow, null, 2));
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}