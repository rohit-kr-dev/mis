import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Load service key
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "serviceAccountKey.json"))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Run dynamic filters + select fields.
 * @param {string} collectionName
 * @param {Array} filters = [ { field, op, value } ]
 * @param {Array} fieldsToSelect = ["qty", "company", ...]
 */
async function queryCollection(collectionName, filters = [], fieldsToSelect = []) {
  try {
    console.log(`🔍 Querying collection: ${collectionName}`);

    let q = db.collection(collectionName);

    // Apply dynamic filters
    filters.forEach(f => {
      q = q.where(f.field, f.op, f.value);
    });

    const snapshot = await q.get();

    console.log(`📦 Documents matched: ${snapshot.size}`);

    const results = [];

    snapshot.forEach(doc => {
      const data = doc.data();

      // Select only specific fields
      const filteredData = {};

      if (fieldsToSelect.length > 0) {
        fieldsToSelect.forEach(field => {
          filteredData[field] = data[field] ?? null;
        });
        filteredData.id = doc.id;
        results.push(filteredData);
      } else {
        // No field selection → push whole document
        results.push({ id: doc.id, ...data });
      }
    });

    // Save results to JSON file
    const outputPath = "./query-results.json";
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`✅ Saved results to ${outputPath}`);
    return results;

  } catch (error) {
    console.error("❌ Query error:", error);
  }
}

// 🚀 Example usage:
(async () => {
  const filters = [
    { field: "cnMonth", op: "==", value: "Apr-25" },
    { field: "supplierName", op: "==", value: "PARAGON RESIN LLP" },
    { field: "company", op: "==", value: "RIL" },
    { field: "type", op: "==", value: "Outright" }
  ];

  // 👉 Select only these fields
  const fieldsToSelect = ["qty", "company", "supplierName", "type"];

  await queryCollection("workingSheet", filters, fieldsToSelect);
})();
