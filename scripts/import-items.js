import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Load items JSON
const items = JSON.parse(fs.readFileSync("./items.json", "utf8"));

// Load service account
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function importItems() {
  console.log("Importing items to Firestore...");

  for (const item of items) {
    await db.collection("items").add({
      itemName: item.itemName,
      materialType: item.materialType,
      hsnCode: item.hsnCode,
      productCategory: item.productCategory,
      company: item.company,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("Imported:", item.itemName);
  }

  console.log("✔ All items imported successfully!");
}

importItems().catch(console.error);
