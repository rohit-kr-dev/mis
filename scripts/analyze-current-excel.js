import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Path to the Excel file
const filePath = path.join(process.cwd(), 'Material_Upliftment_MIS.xlsx');

console.log('🔍 ANALYZING CURRENT EXCEL STRUCTURE');
console.log('====================================');

try {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  
  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  console.log(`📋 Sheet name: ${firstSheetName}`);
  
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Show all column names from the first row
  console.log('\n📊 All Column Names:');
  console.log('===================');
  
  const headers = jsonData[0] || [];
  headers.forEach((header, index) => {
    console.log(`${index + 1}. "${header}"`);
  });
  
  // Show first few data rows
  console.log('\n📊 First 5 Data Rows:');
  console.log('====================');
  
  const numRows = Math.min(6, jsonData.length); // 1 header + 5 data rows
  for (let i = 0; i < numRows; i++) {
    console.log(`\nRow ${i}:`);
    jsonData[i].forEach((cell, index) => {
      const columnName = i === 0 ? '(HEADER)' : headers[index] || `Column ${index}`;
      console.log(`  ${columnName}: ${JSON.stringify(cell)} (type: ${typeof cell})`);
    });
  }
  
  // Create a mapping from actual headers to Firestore fields
  console.log('\n🔧 Suggested Mapping to Firestore Fields:');
  console.log('========================================');
  
  const headerMap = {
    'Supplier': 'supplierName',
    'Alias': 'alias',
    'Period': 'period',
    'Type': 'type',
    // Add more mappings as needed
  };
  
  headers.forEach(header => {
    const firestoreField = headerMap[header] || header.toLowerCase().replace(/\s+/g, '');
    console.log(`"${header}" → ${firestoreField}`);
  });
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error);
  process.exit(1);
}