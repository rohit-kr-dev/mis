import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "./serviceAccountKey.json"))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function countDocs(collectionName) {
  console.log(`📦 Counting documents in: ${collectionName}`);

  try {
    const countQuery = db.collection(collectionName).count();
    const result = await countQuery.get();

    console.log(`📊 Total documents: ${result.data().count}`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

countDocs("supplierWiseMonthly");
