// Script to check grades in Excel files
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function checkGradesInExcel() {
  try {
    console.log('🔍 Checking grades in Excel files...\n');
    
    // Look for common Excel file locations
    const possiblePaths = [
      path.join(__dirname, '..', 'working_sheet.xlsx'),
      path.join(__dirname, '..', 'workingSheet.xlsx'),
      path.join(__dirname, '..', 'data', 'working_sheet.xlsx'),
      path.join(__dirname, '..', 'public', 'working_sheet.xlsx'),
      path.join(__dirname, '..', 'uploads', 'working_sheet.xlsx')
    ];
    
    let foundFile = null;
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        foundFile = filePath;
        break;
      }
    }
    
    if (!foundFile) {
      console.log('⚠️  No Excel file found. Please provide the path to your working sheet Excel file.');
      console.log('\nTry placing your Excel file in one of these locations:');
      possiblePaths.forEach(p => console.log(`  - ${p}`));
      return;
    }
    
    console.log(`✅ Found Excel file: ${foundFile}\n`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(foundFile);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON (skip header row)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 1 });
    
    console.log(`📊 Total rows in Excel: ${jsonData.length}`);
    
    // Extract grades
    const grades = new Set();
    const gradeCounts = {};
    
    jsonData.forEach((row, index) => {
      // Try different possible column names for grade
      const grade = row['Grade'] || 
                   row['grade'] || 
                   row['GRADE'] || 
                   row['Product Grade'] || 
                   row['Product'] ||
                   row['Item Name'] ||
                   row['Item'];
      
      if (grade) {
        grades.add(grade.toString().trim());
        const gradeKey = grade.toString().trim();
        gradeCounts[gradeKey] = (gradeCounts[gradeKey] || 0) + 1;
      }
    });
    
    const uniqueGrades = Array.from(grades).sort();
    
    console.log(`\n📈 Unique grades found: ${uniqueGrades.length}`);
    console.log('\n📋 Grade List:');
    uniqueGrades.forEach((grade, index) => {
      console.log(`  ${index + 1}. ${grade} (${gradeCounts[grade]} occurrences)`);
    });
    
    // Show sample data structure
    console.log('\n🔍 Sample row structure:');
    if (jsonData.length > 0) {
      const sampleRow = jsonData[0];
      console.log('  Columns found:');
      Object.keys(sampleRow).forEach(key => {
        console.log(`    - ${key}: ${sampleRow[key]}`);
      });
    }
    
    console.log('\n✅ Grade check completed');
    
  } catch (error) {
    console.error('❌ Error checking grades:', error.message);
    
    if (error.message.includes('EBADF')) {
      console.log('\n💡 Tip: Make sure the Excel file is not open in another program');
    }
  }
}

// Run the check
checkGradesInExcel();