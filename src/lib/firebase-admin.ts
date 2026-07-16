import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Clean and parse the private key
if (privateKey) {
  privateKey = privateKey.trim();
  // Strip surrounding quotes if present
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.substring(1, privateKey.length - 1);
  } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.substring(1, privateKey.length - 1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");
}

// Clean other credentials
const cleanProjectId = projectId?.trim().replace(/^["']|["']$/g, "");
const cleanClientEmail = clientEmail?.trim().replace(/^["']|["']$/g, "");

// Calculate if valid private credentials are set (not placeholders)
export const hasAdminCredentials = !!(
  cleanProjectId && 
  cleanClientEmail && 
  privateKey && 
  !cleanClientEmail.includes("xxxxx") && 
  !privateKey.includes("...")
);

export let adminInitializationError: string | null = null;

const initializeFirebaseAdmin = () => {
  try {
    const apps = getApps();
    if (apps.length > 0) {
      return apps[0];
    }

    if (hasAdminCredentials) {
      try {
        return initializeApp({
          credential: cert({
            projectId: cleanProjectId!,
            clientEmail: cleanClientEmail!,
            privateKey: privateKey!,
          }),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${cleanProjectId}.appspot.com`,
        });
      } catch (error: any) {
        console.error("Firebase Admin initialization error with credentials:", error);
        adminInitializationError = error.message || String(error);
        // Fall back to mock so module-level functions can still be imported,
        // but we flag the error via adminInitializationError
      }
    }

    // Safe fallback mock initialization for build compilation phase
    return initializeApp({
      projectId: cleanProjectId || "sachin-stars-mock",
    });
  } catch (fallbackError: any) {
    console.error("Firebase Admin fallback initialization error:", fallbackError);
    adminInitializationError = fallbackError.message || String(fallbackError);
    return null;
  }
};

const adminApp = initializeFirebaseAdmin();

export const adminAuth = (adminApp ? getAuth(adminApp) : null) as unknown as ReturnType<typeof getAuth>;
export const adminDb = (adminApp ? getFirestore(adminApp) : null) as unknown as ReturnType<typeof getFirestore>;
export const adminStorage = (adminApp ? getStorage(adminApp) : null) as unknown as ReturnType<typeof getStorage>;
export default adminApp;
