import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Path to the Excel file
const filePath = path.join(process.cwd(), 'Material_Upliftment_MIS.xlsx');

console.log('🔍 DEBUGGING EXCEL COLUMN NAMES');
console.log('==============================');

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.log(`❌ File not found: ${filePath}`);
  process.exit(1);
}

try {
  // Read the Excel file
  console.log(`📖 Reading Excel file: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  
  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  console.log(`📋 Sheet name: ${firstSheetName}`);
  
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Print the first few rows to see the actual column names
  console.log('\n📊 First 3 rows of data:');
  console.log('========================');
  
  const numRows = Math.min(3, jsonData.length);
  for (let i = 0; i < numRows; i++) {
    console.log(`\nRow ${i + 1}:`);
    jsonData[i].forEach((cell, index) => {
      console.log(`  Column ${index}: "${cell}" (type: ${typeof cell})`);
    });
  }
  
  // If we have data rows, show the column mapping
  if (jsonData.length > 1) {
    console.log('\n🔗 Column Mapping Analysis:');
    console.log('==========================');
    
    const headers = jsonData[0];
    const firstDataRow = jsonData[1];
    
    headers.forEach((header, index) => {
      const value = firstDataRow[index] !== undefined ? firstDataRow[index] : 'undefined';
      console.log(`"${header}" → ${JSON.stringify(value)}`);
    });
  }
  
  // Test specific column names that our API expects
  console.log('\n🎯 Testing Expected Column Names:');
  console.log('=================================');
  
  const expectedColumns = [
    'Sr. No.',
    'Category',
    'PSPL Branch',
    'Supplier',
    'Alias',
    'Purchase Date',
    'Bill Month',
    'Bill No.',
    ' Buy Rate ',
    ' QTY ',
    ' Grade ',
    ' Company ',
    ' Product Cat ',
    'Type',
    'Buying Terms (If Outright with Disc)',
    'Date for CN',
    'CN Month',
    'EBI',
    'PP',
    'Source',
    ' Rate, As per Confirmation ',
    ' Rate, as per Price List ',
    ' Price Type ',
    ' Location ',
    ' MOU ',
    ' QD ',
    ' EBI ',  // Second EBI column
    ' GSI ',
    ' Scheme ',
    ' Extra ',
    ' Loading ',
    ' TPT ',
    ' Insurance ',
    ' Round Off ',
    ' Commission ',
    ' GST CN ',
    ' Total ',
    ' Diff ',
    ' Status ',
    ' Remarks, if any diff '
  ];
  
  const actualHeaders = jsonData[0] || [];
  console.log('Expected columns found in Excel:');
  expectedColumns.forEach(col => {
    const found = actualHeaders.includes(col);
    console.log(`  ${found ? '✅' : '❌'} "${col}"`);
  });
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error);
  process.exit(1);
}