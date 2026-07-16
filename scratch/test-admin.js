const fs = require("fs");
const path = require("path");

// Parse env file relative to script
try {
  const envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.trim().match(/^([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
} catch (e) {
  console.error("Failed to parse env:", e);
}

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

console.log("PROJECT ID:", projectId);
console.log("CLIENT EMAIL:", clientEmail);
console.log("PRIVATE KEY length:", privateKey ? privateKey.length : 0);

try {
  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log("SUCCESSFULLY INITIALIZED FIREBASE ADMIN APP!");
  
  const auth = getAuth(app);
  console.log("Testing token verification / user creation triggers...");
  
  auth.createUser({
    email: "test-auth-initialize@sachinstars.com",
    disabled: true,
  }).then((userRecord) => {
    console.log("SUCCESS! User created inside Firebase Auth:", userRecord.uid);
    auth.deleteUser(userRecord.uid).then(() => {
      console.log("SUCCESS! Cleaned up test user.");
      process.exit(0);
    });
  }).catch((err) => {
    console.error("API CALL FAILED (Auth service rejection):", err);
    process.exit(1);
  });
} catch (error) {
  console.error("INITIALIZATION ERROR DETECTED:", error);
  process.exit(1);
}
