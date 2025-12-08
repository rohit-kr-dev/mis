import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Load periods JSON
const periods = JSON.parse(
  fs.readFileSync("./periods.json", "utf8")
);

// Load service account
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

// Init Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function importPeriods() {
  console.log("Importing periods...");

  for (const p of periods) {
    const docRef = db.collection("periods").doc(); // auto ID
    await docRef.set({
      period: p.period,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("Imported period:", p.period);
  }

  console.log("Finished importing periods.");
}

importPeriods().catch((err) => console.error(err));
