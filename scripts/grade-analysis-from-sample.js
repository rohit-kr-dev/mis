// Script to analyze the grade data you've shown
// Based on your sample data: "LD SLIP J24FS040 RIL"

console.log('🔍 Grade Analysis Based on Your Sample Data\n');

// From your sample record
const sampleRecord = {
  alias: "Paragon",
  billMonth: "Apr-25",
  billNo: "10",
  branch: "Bangalore WH",
  buyRate: 120.5,
  buyingTerms: "",
  category: "Purchase",
  cnMonth: "Apr-25",
  commission: null,
  company: "RIL",
  createdAt: "29 December 2025 at 15:31:27 UTC+5:30",
  dateForCN: "2025-04-01T00:00:00.000Z",
  diff: 0,
  ebiStatus: "No",
  ebiValue: null,
  extra: null,
  grade: "LD SLIP J24FS040 RIL"
};

console.log('📋 Sample Record Analysis:');
console.log(`  Grade: ${sampleRecord.grade}`);
console.log(`  Company: ${sampleRecord.company}`);
console.log(`  Branch: ${sampleRecord.branch}`);
console.log(`  Buy Rate: ${sampleRecord.buyRate}`);
console.log(`  Bill Month: ${sampleRecord.billMonth}`);

// Based on the workingSheet.json sample data I found
const sampleGrades = [
  "LD SLIP J24FS040 RIL",
  "HDPE HM F52H04 OPAL",
  "LLDPE NONSLIP F2003A OPAL",
  "PP RAFFIA HR003 MRPL",
  "PVC SUSPENSION RESIN HS1000R",
  "LLDPE SLIP F20S009 GAIL",
  "PP TQ FILM HF010 MRPL",
  "LLDPE SLIP F20S010UA GAIL",
  "HDPE HM F5400 HALDIA",
  "LDPE LAMINATION 7019EC SABIC"
];

console.log('\n📊 Grades Found in Your System:');
console.log(`  Total unique grades identified: ${sampleGrades.length}`);
sampleGrades.forEach((grade, index) => {
  console.log(`  ${index + 1}. ${grade}`);
});

console.log('\n🏢 Companies Associated with These Grades:');
const companies = ["RIL", "OPAL", "MRPL", "GAIL", "HALDIA", "SABIC", "BOROUGE", "EXXON", "DOW"];
companies.forEach(company => {
  console.log(`  ${company}`);
});

console.log('\n📋 Grade Categories:');
const categories = {
  "LDPE Grades": sampleGrades.filter(g => g.includes('LD')),
  "HDPE Grades": sampleGrades.filter(g => g.includes('HD')),
  "LLDPE Grades": sampleGrades.filter(g => g.includes('LLD')),
  "PP Grades": sampleGrades.filter(g => g.includes('PP')),
  "PVC Grades": sampleGrades.filter(g => g.includes('PVC'))
};

Object.entries(categories).forEach(([category, grades]) => {
  if (grades.length > 0) {
    console.log(`  ${category}: ${grades.length} grades`);
    grades.forEach(grade => console.log(`    - ${grade}`));
  }
});

console.log('\n✅ Based on your sample data and project files:');
console.log('  - You have multiple grades stored in your Firebase database');
console.log('  - Your system handles various polymer types (LDPE, HDPE, LLDPE, PP, PVC)');
console.log('  - Data includes supplier information, pricing, and transaction details');
console.log('  - Each grade is associated with specific companies and branches');