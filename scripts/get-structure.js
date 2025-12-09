import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix dirname issue in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account JSON
const serviceAccountPath = path.join(__dirname, "./serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ ERROR: serviceAccount.json not found!");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Detect Firestore data type
 */
function detectType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof admin.firestore.Timestamp) return "timestamp";
  if (value instanceof admin.firestore.DocumentReference) return "reference";
  if (value instanceof admin.firestore.GeoPoint) return "geopoint";
  if (typeof value === "object") return "object";
  return typeof value;
}

/**
 * Print structure of each collection
 */
async function getStructureForAllCollections() {
  console.log("🔍 Fetching Firestore Collections...\n");

  const collections = await db.listCollections();

  if (collections.length === 0) {
    console.log("⚠️ No collections found.\n");
    return;
  }

  for (const coll of collections) {
    console.log(`\n📁 Collection: ${coll.id}`);

    const snapshot = await coll.limit(1).get();

    if (snapshot.empty) {
      console.log("   ⚠️ No documents in this collection.");
      continue;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log(`   📄 Sample Document ID: ${doc.id}`);
    console.log("   🧱 Fields:");

    Object.entries(data).forEach(([key, value]) => {
      console.log(`     • ${key}: ${detectType(value)}`);
    });
  }
}

// Run the script
getStructureForAllCollections()
  .then(() => {
    console.log("\n✅ Structure scan completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ ERROR:", err);
    process.exit(1);
  });
