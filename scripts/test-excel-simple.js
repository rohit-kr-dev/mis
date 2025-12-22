import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Path to the Excel file
const filePath = path.join(process.cwd(), 'Material_Upliftment_MIS.xlsx');

console.log('🔍 SIMPLE EXCEL TEST');
console.log('===================');

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
  console.log('\n📋 First 3 rows:');
  for (let i = 0; i < Math.min(3, jsonData.length); i++) {
    console.log(`Row ${i + 1}:`, JSON.stringify(jsonData[i], null, 2));
  }
  
  // Check if we have the expected columns
  if (jsonData.length > 0) {
    const firstRow = jsonData[0];
    console.log('\n🔍 Column analysis:');
    console.log('Available columns:', Object.keys(firstRow));
    
    console.log('\n✅ Checking for required columns:');
    console.log('  Supplier:', firstRow.hasOwnProperty('Supplier') ? 'FOUND' : 'MISSING');
    console.log('  Alias:', firstRow.hasOwnProperty('Alias') ? 'FOUND' : 'MISSING');
    console.log('  Period:', firstRow.hasOwnProperty('Period') ? 'FOUND' : 'MISSING');
    console.log('  Type:', firstRow.hasOwnProperty('Type') ? 'FOUND' : 'MISSING');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}