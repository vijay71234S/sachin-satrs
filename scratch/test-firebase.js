const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

console.log("Testing firebase-admin initialization with getStorage...");

try {
  const app = initializeApp({
    projectId: "sachin-stars-mock"
  });
  console.log("initializeApp succeeded!");
  
  const auth = getAuth(app);
  console.log("getAuth succeeded!");

  const db = getFirestore(app);
  console.log("getFirestore succeeded!");

  const storage = getStorage(app);
  console.log("getStorage succeeded!");
} catch (error) {
  console.error("Initialization failed:", error);
}
