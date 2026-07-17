import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/verify-admin";

// GET all users (Admin-only)
export async function GET(request: Request) {
  try {
    await verifyAdmin(request);

    const snapshot = await adminDb.collection("users").orderBy("playerName", "asc").get();
    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("API GET Users error:", error);
    const errorMessage = error?.message || "Failed to fetch users";
    const status = errorMessage.includes("Forbidden") ? 403 : errorMessage.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

// POST create user (Admin-only)
export async function POST(request: Request) {
  try {
    await verifyAdmin(request);
    
    const body = await request.json();
    const { email, password, playerName, phoneNumber, role, playerId } = body;

    // Validate inputs
    if (!email || !password || !playerName || !role) {
      return NextResponse.json(
        { error: "Missing required fields (email, password, playerName, role)" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "member") {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    // Create user in Firebase Authentication
    // Note: Firebase phone numbers must follow E.164 format. If invalid, it throws an error.
    // We validate or pass only if it matches format, or let it fall back without phone or catch error.
    const createArgs: any = {
      email,
      password,
      displayName: playerName,
    };

    if (phoneNumber && phoneNumber.trim().startsWith("+")) {
      createArgs.phoneNumber = phoneNumber.trim();
    }

    const authUser = await adminAuth.createUser(createArgs);

    // Save profile record in Firestore
    const userProfile = {
      email,
      role,
      playerName,
      phoneNumber: phoneNumber || "",
      playerId: playerId || "",
      disabled: false,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("users").doc(authUser.uid).set(userProfile);

    // If player ID is provided, create a corresponding player document in Firestore
    // to populate player listings immediately
    await adminDb.collection("players").doc(authUser.uid).set({
      name: playerName,
      role: role === "admin" ? "Coach/Admin" : "Batsman", // Default role
      jerseyNumber: "",
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
        rating: 60, // Default baseline rating
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      uid: authUser.uid,
      ...userProfile,
    });
  } catch (error: any) {
    console.error("API POST User error:", error);
    const errorMessage = error?.message || "Failed to create user";
    const status = errorMessage.includes("Forbidden") ? 403 : errorMessage.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
