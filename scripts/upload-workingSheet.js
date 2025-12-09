import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// --- Load Firebase Admin Credentials ---
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "./serviceAccountKey.json"))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// --- Load JSON File ---
const jsonPath = path.join(process.cwd(), "./workingSheet.json");
const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

/**
 * Convert "YYYY-MM-DD" → Firestore Timestamp
 */
function convertToTimestamp(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  if (!dateStr.includes("-")) return null; // keep Apr-25 etc.
  return admin.firestore.Timestamp.fromDate(new Date(dateStr));
}

/**
 * Remove empty fields except allowed numeric zeros
 */
function cleanObject(obj) {
  const cleaned = {};
  for (const key in obj) {
    const val = obj[key];

    // allow numeric zero
    if (val === 0) {
      cleaned[key] = 0;
      continue;
    }

    // ignore empty / undefined / null
    if (val === "" || val === null || val === undefined) continue;

    cleaned[key] = val;
  }
  return cleaned;
}

async function uploadData() {
  console.log("🚀 Uploading workingSheet JSON to Firestore...");

  const batchSize = 400;
  let batch = db.batch();
  let counter = 0;

  for (let item of jsonData) {
    const cleaned = cleanObject(item);

    // Convert date fields
    cleaned.purchaseDate = convertToTimestamp(item.purchaseDate);
    cleaned.dateForCN = convertToTimestamp(item.dateForCN);

    cleaned.createdAt = admin.firestore.Timestamp.now();
    cleaned.updatedAt = admin.firestore.Timestamp.now();

    const docRef = db.collection("workingSheet").doc();

    batch.set(docRef, cleaned);
    counter++;

    if (counter % batchSize === 0) {
      console.log(`🔥 Writing batch of ${batchSize}...`);
      await batch.commit();
      batch = db.batch();
    }
  }

  // Commit remaining
  if (counter % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ Upload complete! Total documents uploaded: ${counter}`);
}

uploadData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Upload failed:", err);
    process.exit(1);
  });
