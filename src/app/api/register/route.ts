import { NextResponse } from "next/server";
import { adminAuth, adminDb, hasAdminCredentials, adminInitializationError } from "@/lib/firebase-admin";

// POST register admin (Public endpoint)
export async function POST(request: Request) {
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
    const body = await request.json();
    const { email, password, playerName, phoneNumber, playerId } = body;

    // Validate inputs
    if (!email || !password || !playerName || !playerId) {
      return NextResponse.json(
        { error: "Missing required fields (email, password, playerName, playerId)" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // 1. Create user in Firebase Authentication
    const createArgs: any = {
      email,
      password,
      displayName: playerName,
    };

    if (phoneNumber && phoneNumber.trim().startsWith("+")) {
      createArgs.phoneNumber = phoneNumber.trim();
    }

    const authUser = await adminAuth.createUser(createArgs);

    // 2. Save profile record in Firestore "users" collection with role "admin"
    const userProfile = {
      email,
      role: "admin", // Auto-assign Admin role
      playerName,
      phoneNumber: phoneNumber || "",
      playerId: playerId || "",
      disabled: false,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("users").doc(authUser.uid).set(userProfile);

    // 3. Save profile record in Firestore "players" collection
    await adminDb.collection("players").doc(authUser.uid).set({
      name: playerName,
      role: "Coach/Admin", // Default role for registering admin
      jerseyNumber: playerId,
      age: "",
      battingStyle: "Right-hand bat",
      bowlingStyle: "Right-arm bowler",
      debut: new Date().getFullYear().toString(),
      phone: phoneNumber || "",
      email: email,
      photo: "",
      suspended: false,
      stats: {
        runs: 0,
        wickets: 0,
        average: 0,
        strikeRate: 0,
        matches: 0,
        fifties: 0,
        hundreds: 0,
        highestScore: 0,
        economy: 0,
        catches: 0,
        runOuts: 0,
        droppedCatches: 0,
        mistakesCount: 0,
        rating: 80, // Baseline baseline rating for admin/coach
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      uid: authUser.uid,
      email: authUser.email,
      playerName: authUser.displayName,
      role: "admin",
    });
  } catch (error: any) {
    console.error("API POST Admin Register error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register admin account" },
      { status: 500 }
    );
  }
}
