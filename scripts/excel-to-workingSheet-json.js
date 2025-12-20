/**
 * excel-to-workingSheet-json.mjs
 *
 * - Reads sheet index 4 (sheet #5, 0-based index = 4) by default.
 * - Uses header row = 2 (1-based), so actual data starts at row 3.
 * - First occurrence of header "EBI" -> ebiStatus (string)
 * - Second occurrence of header "EBI" -> ebi (number)
 * - Converts Excel date serials to ISO "YYYY-MM-DD" strings for purchaseDate/dateForCN
 * - Keeps billMonth as-is (e.g., "Apr-25")
 * - Adds createdAt / updatedAt as ISO datetimes
 * - Omits fields that are empty / null / 0 (except 'total' always included)
 *
 * NOTE: For a more scalable solution that handles large datasets (1300+ rows) and can be 
 *       rerun easily when new rows are added, consider using the Python alternative:
 *       python scripts/excel_to_json.py
 *
 * Usage:
 *   node scripts/excel-to-workingSheet-json.mjs
 *
 * Requirements:
 *   npm i xlsx
 *
 * If you prefer CommonJS, rename to .cjs and adjust imports.
 */

import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const INPUT_FILE = path.join(process.cwd(), "Material_Upliftment_MIS.xlsx"); // change if needed
const SHEET_INDEX = 4; // sheet #5 (0-based)
const HEADER_ROW_INDEX_1BASED = 2; // header is on Excel row 2
const OUTPUT_FILE = path.join(process.cwd(), "workingSheet.json");

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ Input file not found: ${INPUT_FILE}`);
  process.exit(1);
}

/** Helpers **/
function excelDateToJSDate(excelSerial) {
  // Excel uses 1900-based system and treats 1900 as leap year. Use standard conversion
  // This conversion works for most Excel exports (serial numbers).
  // If cell is already a JS date string, the caller should handle it.
  const serial = Number(excelSerial);
  if (!Number.isFinite(serial)) return null;
  // Excel leap-year bug adjustment
  const days = Math.floor(serial) - 25569; // days since 1970-01-01
  const ms = days * 86400 * 1000 + Math.round((serial % 1) * 86400 * 1000);
  const d = new Date(ms);
  // return formatted YYYY-MM-DD
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isEmptyValue(val) {
  if (val === null || val === undefined) return true;
  if (typeof val === "string" && val.trim() === "") return true;
  if (typeof val === "number" && val === 0) return true;
  return false;
}

function normalizeHeader(h) {
  if (!h && h !== 0) return "";
  return String(h).trim();
}

/** Map incoming header to our target Firestore field name.
 *  The function returns the field name (or null to skip).
 *  Handles duplicate "EBI" -> first -> ebiStatus, second -> ebi.
 */
function createHeaderMapper(headers) {
  let ebiCount = 0;
  const map = headers.map((h) => {
    const key = normalizeHeader(h).toLowerCase();
    if (key === "sr. no." || key === "sr no" || key === "sr.no" || key === "sl. no." || key === "sl no") return "slNo";
    if (key === "category") return "category";
    if (key === "pspl branch" || key === "branch" || key === "pspl_branch") return "branch";
    if (key === "supplier") return "supplierName";
    if (key === "alias") return "alias";
    if (key === "purchase date") return "purchaseDate";
    if (key === "bill month") return "billMonth";
    if (key === "bill no." || key === "bill no" || key === "billno") return "billNo";
    if (key === "buy rate" || key === "buy_rate" || key === "buyrate") return "buyRate";
    if (key === "qty" || key === "quantity") return "qty";
    if (key === "grade") return "grade";
    if (key === "company") return "company";
    if (key === "product cat" || key === "product cat.") return "productCategory";
    if (key === "type") return "type";
    if (key.startsWith("buying terms")) return "buyingTerms";
    if (key === "date for cn") return "dateForCN";
    if (key === "cn month") return "cnMonth";
    if (key === "ebi") {
      ebiCount += 1;
      return ebiCount === 1 ? "ebiStatus" : "ebiValue";
    }
    if (key === "pp") return "pp";
    if (key === "source") return "source";
    if (key === "rate, as per confirmation" || key === "rate as per confirmation") return "rateAsPerConfirmation";
    if (key === "rate, as per price list" || key === "rate as per price list") return "rateAsPerPriceList";
    if (key === "price type") return "priceType";
    if (key === "location") return "location";
    if (key === "mou") return "mou";
    if (key === "qd") return "qd";
    if (key === "gsi") return "gsi";
    if (key === "scheme") return "scheme";
    if (key === "extra") return "extra";
    if (key === "loading") return "loading";
    if (key === "tpt") return "tpt";
    if (key === "insurance") return "insurance";
    if (key === "round off" || key === "roundoff") return "roundOff";
    if (key === "commission") return "commission";
    if (key === "gst cn" || key === "gst_cn") return "gstCn";
    if (key === "total") return "total";
    if (key === "diff") return "diff";
    if (key === "status") return "status";
    if (key.startsWith("remarks")) return "remarks";
    // fallback: return sanitized header (camelCase)
    if (key) {
      const parts = key.split(/[\s\/\-_,.()]+/).filter(Boolean);
      const camel = parts.map((p,i)=> i===0 ? p : p[0].toUpperCase()+p.slice(1)).join("");
      return camel;
    }
    return null;
  });

  return map;
}

/** Main */
function run() {
  const workbook = xlsx.readFile(INPUT_FILE, { cellDates: false, raw: true });
  const sheetNames = workbook.SheetNames;
  if (SHEET_INDEX >= sheetNames.length) {
    console.error(`❌ Sheet index ${SHEET_INDEX} out of range. File contains ${sheetNames.length} sheets.`);
    process.exit(1);
  }
  const sheetName = sheetNames[SHEET_INDEX];
  const ws = workbook.Sheets[sheetName];

  // Convert sheet to array of arrays so we can use header row index
  const aoa = xlsx.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: null,
  });

  if (aoa.length < HEADER_ROW_INDEX_1BASED) {
    console.error("❌ Not enough rows for header. Check HEADER_ROW_INDEX_1BASED.");
    process.exit(1);
  }

  // Header row (1-based header index)
  const headerRow = aoa[HEADER_ROW_INDEX_1BASED - 1].map(h => normalizeHeader(h));
  const mapper = createHeaderMapper(headerRow);

  // Data rows start after header row
  const dataRows = aoa.slice(HEADER_ROW_INDEX_1BASED);

  const nowIso = new Date().toISOString();

  const out = [];
  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    // Skip rows that are entirely empty
    if (!row || row.every(c => c === null || c === undefined || (typeof c === "string" && c.trim()===""))) continue;

    const obj = {};
    for (let c = 0; c < mapper.length; c++) {
      const field = mapper[c];
      if (!field) continue;
      const raw = row[c];

      if (raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")) {
        // Skip empty value (unless field === 'total' -> include later)
        continue;
      }

      // Special handling for dates: if header maps to purchaseDate or dateForCN
      if ((field === "purchaseDate" || field === "dateForCN")) {
        // raw might be Excel serial number or a JS date or an ISO string
        let isoDate = null;
        if (typeof raw === "number") {
          isoDate = excelDateToJSDate(raw);
        } else {
          // try to parse string
          const parsed = new Date(raw);
          if (!isNaN(parsed)) {
            isoDate = parsed.toISOString().slice(0,10); // YYYY-MM-DD
          } else {
            // keep raw string trimmed (maybe already in desired format)
            isoDate = String(raw).trim();
          }
        }
        if (isoDate) obj[field] = isoDate;
        continue;
      }

      // cnMonth and billMonth: keep string as-is
      if (field === "cnMonth" || field === "billMonth") {
        obj[field] = String(raw).trim();
        continue;
      }

      // Numeric fields parse to number
      const numericFields = new Set([
        "slNo","buyRate","qty","rateAsPerConfirmation","rateAsPerPriceList","mou",
        "qd","ebi","gsi","scheme","extra","loading","tpt","insurance","roundOff",
        "commission","gstCn","total","diff","pp"
      ]);
      if (numericFields.has(field)) {
        // Some numeric columns in Excel may come as strings with commas or spaces
        const cleaned = String(raw).replace(/,/g, "").trim();
        const num = Number(cleaned);
        if (!Number.isNaN(num)) {
          obj[field] = num;
        } else {
          // If not a number, keep the raw string (rare)
          obj[field] = cleaned;
        }
        continue;
      }

      // For ebiStatus (first EBI) keep string
      if (field === "ebiStatus") {
        obj[field] = String(raw).trim();
        continue;
      }

      // Generic string field
      obj[field] = String(raw).trim();
    } // columns loop

    // Always include createdAt/updatedAt
    obj.createdAt = nowIso;
    obj.updatedAt = nowIso;

    // Ensure 'total' is present (if missing set to 0)
    if (!Object.prototype.hasOwnProperty.call(obj, "total")) {
      obj.total = 0;
    }

    // Now filter out keys with empty/0 values EXCEPT 'total'
    const filtered = {};
    for (const [k,v] of Object.entries(obj)) {
      if (k === "total") {
        filtered[k] = v;
        continue;
      }
      // Keep createdAt/updatedAt even if present
      if (k === "createdAt" || k === "updatedAt") {
        filtered[k] = v;
        continue;
      }
      // If value numeric and 0 -> skip
      if (typeof v === "number" && v === 0) continue;
      if (v === null || v === undefined) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      filtered[k] = v;
    }

    // push final document
    out.push(filtered);
  } // rows

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log(`✅ JSON created successfully: ${OUTPUT_FILE}`);
  console.log(`   Documents exported: ${out.length}`);
}

run();
