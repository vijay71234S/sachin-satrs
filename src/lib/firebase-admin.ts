import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  // Replace double escaped newlines that commonly occur in env configs
  privateKey = privateKey.replace(/\\n/g, "\n");
}

// Calculate if valid private credentials are set (not placeholders)
export const hasAdminCredentials = !!(
  projectId && 
  clientEmail && 
  privateKey && 
  !clientEmail.includes("xxxxx") && 
  !privateKey.includes("...")
);

const initializeFirebaseAdmin = () => {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  if (hasAdminCredentials) {
    try {
      return initializeApp({
        credential: cert({
          projectId: projectId!,
          clientEmail: clientEmail!,
          privateKey: privateKey!,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      });
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
    }
  }

  // Safe fallback mock initialization for build compilation phase
  return initializeApp({
    projectId: projectId || "sachin-stars-mock",
  });
};

const adminApp = initializeFirebaseAdmin();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
