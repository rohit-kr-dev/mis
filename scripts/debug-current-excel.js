import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Path to the Excel file
const filePath = path.join(process.cwd(), 'Material_Upliftment_MIS.xlsx');

console.log('🔍 DEBUGGING CURRENT EXCEL FILE');
console.log('==============================');

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
  console.log('\n📊 All Column Names (Exact):');
  console.log('==========================');
  
  if (jsonData.length > 0) {
    const headers = jsonData[0];
    headers.forEach((header, index) => {
      console.log(`${index + 1}. "${header}" (length: ${header.length})`);
      // Show character codes to detect hidden characters
      const charCodes = [];
      for (let i = 0; i < header.length; i++) {
        charCodes.push(header.charCodeAt(i));
      }
      console.log(`    Char codes: [${charCodes.join(', ')}]`);
    });
    
    // Show first data row
    console.log('\n📊 First Data Row:');
    console.log('=================');
    if (jsonData.length > 1) {
      const firstRow = jsonData[1];
      headers.forEach((header, index) => {
        const value = firstRow[index] !== undefined ? firstRow[index] : 'undefined';
        console.log(`"${header}" → ${JSON.stringify(value)} (type: ${typeof value})`);
      });
    }
  } else {
    console.log('❌ No data found in Excel file');
  }
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
}