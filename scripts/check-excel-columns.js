import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Path to the Excel file
const filePath = path.join(process.cwd(), 'Material_Upliftment_MIS.xlsx');

// Read the Excel file
const workbook = XLSX.readFile(filePath);

// Get the first sheet
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

// Convert to JSON to get the headers
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Print the first row (headers)
if (jsonData.length > 0) {
  console.log('Excel Column Headers:');
  console.log('====================');
  jsonData[0].forEach((header, index) => {
    console.log(`${index + 1}. "${header}"`);
  });
  
  console.log('\nActual data from first row:');
  console.log('==========================');
  if (jsonData.length > 1) {
    const firstDataRow = {};
    jsonData[0].forEach((header, index) => {
      firstDataRow[header] = jsonData[1][index] || '';
    });
    console.log(firstDataRow);
  }
} else {
  console.log('No data found in Excel file');
}