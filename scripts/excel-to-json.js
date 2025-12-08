import XLSX from "xlsx";
import fs from "fs";

// Path to your Excel file
const EXCEL_FILE = "./Material_Upliftment_MIS.xlsx";  // change filename

// Read Excel
const workbook = XLSX.readFile(EXCEL_FILE);

// Select Sheet 2: "Items Master"
const sheetName = "Items Master";
const sheet = workbook.Sheets[sheetName];

// Convert Excel to JSON
let json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

// Map to EXACT Firestore field names
json = json.map((row) => ({
  itemName: row["Item Name"],
  materialType: row["Type"],
  hsnCode: row["HSN Code"],
  productCategory: row["Product Cat"],
  company: row["Company"],
  createdAt: "",   // Firestore timestamp will be added in import script
  updatedAt: ""
}));

// Save JSON file
fs.writeFileSync("./items.json", JSON.stringify(json, null, 2));

console.log("✔ items.json created with correct Firestore field names.");
