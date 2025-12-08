import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Read JSON manually (avoids import assertion)
const suppliers = JSON.parse(
  fs.readFileSync("./suppliers.json", "utf8")
);

// Load service account
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function importSuppliers() {
  console.log("Importing suppliers...");

  for (const s of suppliers) {
    const docRef = db.collection("suppliers").doc(); // auto ID
    await docRef.set({
      supplierName: s.supplierName,
      alias: s.alias || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Imported:", s.supplierName);
  }

  console.log("Finished importing all suppliers.");
}

importSuppliers().catch((err) => console.error(err));
