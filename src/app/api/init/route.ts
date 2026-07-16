import { NextResponse } from "next/server";
import { adminAuth, adminDb, hasAdminCredentials, adminInitializationError } from "@/lib/firebase-admin";

export async function GET() {
  if (!hasAdminCredentials) {
    return NextResponse.json(
      { error: "Firebase Admin SDK credentials are not configured in your environment variables. Please retrieve your service account key from the Firebase Console." },
      { status: 500 }
    );
  }

  if (adminInitializationError || !adminAuth || !adminDb) {
    return NextResponse.json(
      { error: `Firebase Admin SDK failed to initialize: ${adminInitializationError || "check your private key and other configuration variables"}` },
      { status: 500 }
    );
  }

  try {
    // Check if any admin/user already exists in the Firestore users collection
    const usersSnapshot = await adminDb.collection("users").limit(1).get();
    
    if (!usersSnapshot.empty) {
      return NextResponse.json({
        message: "Database already initialized. Default admin provisioning skipped.",
        note: "Use your existing admin credentials to sign in.",
      });
    }

    const defaultAdminEmail = "admin@sachinstars.com";
    const defaultAdminPassword = "admin12345";
    const defaultAdminName = "Coach Sachin";
    const defaultAdminId = "SS-COACH";

    // 1. Create the user in Firebase Auth
    const authUser = await adminAuth.createUser({
      email: defaultAdminEmail,
      password: defaultAdminPassword,
      displayName: defaultAdminName,
    });

    // 2. Create the profile in Firestore users collection
    const userProfile = {
      email: defaultAdminEmail,
      role: "admin",
      playerName: defaultAdminName,
      phoneNumber: "+919876543210",
      playerId: defaultAdminId,
      disabled: false,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("users").doc(authUser.uid).set(userProfile);

    // 3. Create the profile in players collection
    await adminDb.collection("players").doc(authUser.uid).set({
      name: defaultAdminName,
      role: "Coach/Admin",
      jerseyNumber: "10",
      age: "45",
      battingStyle: "Right-hand bat",
      bowlingStyle: "Right-arm bowler",
      debut: "1989",
      phone: "+919876543210",
      email: defaultAdminEmail,
      photo: "",
      suspended: false,
      stats: {
        runs: 15921,
        wickets: 154,
        average: 53.78,
        strikeRate: 86.2,
        matches: 200,
        fifties: 68,
        hundreds: 51,
        highestScore: 248,
        economy: 4.5,
        catches: 115,
        runOuts: 12,
        droppedCatches: 0,
        mistakesCount: 0,
        rating: 99,
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Database initialized successfully! Default Admin account created.",
      credentials: {
        email: defaultAdminEmail,
        password: defaultAdminPassword,
        role: "admin",
        uid: authUser.uid,
      },
      instructions: "Go to /login and enter these credentials to log in as the head Coach/Admin.",
    });
  } catch (error: any) {
    console.error("Initialization API error:", error);
    return NextResponse.json(
      { error: "Failed to initialize database: " + error.message },
      { status: 500 }
    );
  }
}
