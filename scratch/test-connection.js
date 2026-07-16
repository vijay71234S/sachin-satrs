const fs = require("fs");
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Read and parse .env.local manually
const envPath = path.join(__dirname, "../.env.local");
if (!fs.existsSync(envPath)) {
  console.error(".env.local file not found at", envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    // Remove surrounding quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const projectId = env["FIREBASE_PROJECT_ID"];
const clientEmail = env["FIREBASE_CLIENT_EMAIL"];
let privateKey = env["FIREBASE_PRIVATE_KEY"];

console.log("Parsed Env Config:");
console.log("- Project ID:", projectId);
console.log("- Client Email:", clientEmail);
console.log("- Private Key length:", privateKey ? privateKey.length : 0);

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing required Firebase configuration variables in .env.local!");
  process.exit(1);
}

// Format private key
privateKey = privateKey.replace(/\\n/g, "\n");

try {
  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    })
  });
  console.log("Firebase initialized successfully!");

  const db = getFirestore(app);
  
  // Try to query 'users' collection (read-only check)
  console.log("Attempting to query Firestore 'users' collection...");
  db.collection("users").limit(1).get()
    .then((snapshot) => {
      console.log("Firestore query succeeded!");
      console.log("Documents count:", snapshot.size);
      if (snapshot.size > 0) {
        console.log("First document ID:", snapshot.docs[0].id);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Firestore query failed:", err);
      process.exit(1);
    });
} catch (error) {
  console.error("Firebase Admin initialization crashed:", error);
  process.exit(1);
}
