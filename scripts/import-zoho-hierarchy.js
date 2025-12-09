// import-zoho-hierarchy.js
// Run: node import-zoho-hierarchy.js
const fs = require("fs");
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing serviceAccountKey.json in scripts folder.");
  process.exit(1);
}

const jsonPath = path.join(__dirname, "sheet3_part1.json");
if (!fs.existsSync(jsonPath)) {
  console.error("Missing sheet3_part1.json.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function importVendors() {
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log("Importing", data.length, "vendors...");

  for (const vendor of data) {
    const vendorRef = await db.collection("vendorList").add({
      vendorName: vendor.vendorName,
      totalAmount: vendor.totalAmount,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (Array.isArray(vendor.periods)) {
      for (const p of vendor.periods) {
        await vendorRef.collection("periods").add({
          period: p.period,
          amount: p.amount,
          updatedAt: new Date()
        });
      }
    }

    console.log("Imported:", vendor.vendorName);
  }

  console.log("✔ Import completed.");
  process.exit(0);
}

importVendors().catch((err) => {
  console.error(err);
  process.exit(1);
});
