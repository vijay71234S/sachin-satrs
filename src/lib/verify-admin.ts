import { adminAuth, adminDb, hasAdminCredentials, adminInitializationError } from "@/lib/firebase-admin";

/**
 * Verifies that the request contains a valid Firebase ID token 
 * belonging to an authenticated Admin.
 */
export async function verifyAdmin(request: Request) {
  if (!hasAdminCredentials) {
    throw new Error("Firebase Admin SDK credentials are not configured in your environment variables. Please check your credentials configurations.");
  }

  if (adminInitializationError || !adminAuth || !adminDb) {
    throw new Error(`Firebase Admin SDK failed to initialize: ${adminInitializationError || "check your private key and other configuration variables"}`);
  }

  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid authorization token");
  }

  const token = authHeader.split("Bearer ")[1];
  
  try {
    // Verify the JWT ID token from Firebase client
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Fetch the user's document from Firestore using the Admin SDK
    const userDocRef = adminDb.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new Error("Forbidden: User profile not found");
    }

    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      throw new Error("Forbidden: Admin privileges required");
    }

    if (userData?.disabled) {
      throw new Error("Forbidden: Account is disabled");
    }

    return decodedToken;
  } catch (error: any) {
    console.error("Token verification failed:", error);
    if (error.message && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      throw error;
    }
    throw new Error(`Unauthorized: ${error.message || "Token verification failed"}`);
  }
}
