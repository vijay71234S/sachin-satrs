import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/verify-admin";

// Update User (Admin-only)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { email, playerName, phoneNumber, role, playerId, disabled } = body;

    // Fetch existing user in Firestore
    const userDocRef = adminDb.collection("users").doc(id);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update Firebase Auth properties
    const authUpdateArgs: any = {};
    if (email) authUpdateArgs.email = email;
    if (playerName) authUpdateArgs.displayName = playerName;
    if (disabled !== undefined) authUpdateArgs.disabled = disabled;
    if (phoneNumber && phoneNumber.trim().startsWith("+")) {
      authUpdateArgs.phoneNumber = phoneNumber.trim();
    }

    if (Object.keys(authUpdateArgs).length > 0) {
      await adminAuth.updateUser(id, authUpdateArgs);
    }

    // Update Firestore User Profile document
    const updatedProfile: any = {};
    if (email) updatedProfile.email = email;
    if (playerName) updatedProfile.playerName = playerName;
    if (phoneNumber !== undefined) updatedProfile.phoneNumber = phoneNumber;
    if (role) updatedProfile.role = role;
    if (playerId !== undefined) updatedProfile.playerId = playerId;
    if (disabled !== undefined) updatedProfile.disabled = disabled;

    await userDocRef.update(updatedProfile);

    // Also update matching player document if it exists in players collection
    const playerDocRef = adminDb.collection("players").doc(id);
    const playerDoc = await playerDocRef.get();
    if (playerDoc.exists) {
      const playerUpdate: any = {};
      if (playerName) playerUpdate.name = playerName;
      if (email) playerUpdate.email = email;
      if (phoneNumber !== undefined) playerUpdate.phone = phoneNumber;
      if (disabled !== undefined) playerUpdate.suspended = disabled;
      await playerDocRef.update(playerUpdate);
    }

    return NextResponse.json({ uid: id, ...updatedProfile });
  } catch (error: any) {
    console.error("API PUT User error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: error.message.includes("Forbidden") ? 403 : error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// Delete User (Admin-only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin(request);
    const { id } = await params;

    // Delete user from Firebase Auth
    try {
      await adminAuth.deleteUser(id);
    } catch (authError: any) {
      console.warn("User may not exist in Firebase Auth:", authError.message);
    }

    // Delete user profile from Firestore users collection
    await adminDb.collection("users").doc(id).delete();

    // Delete user profile from Firestore players collection
    await adminDb.collection("players").doc(id).delete();

    return NextResponse.json({ message: "User account deleted successfully", uid: id });
  } catch (error: any) {
    console.error("API DELETE User error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: error.message.includes("Forbidden") ? 403 : error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// POST Change User Password manually (Admin-only)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // Force update user password
    await adminAuth.updateUser(id, { password });

    return NextResponse.json({ message: "Password updated successfully", uid: id });
  } catch (error: any) {
    console.error("API POST Reset Password error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: error.message.includes("Forbidden") ? 403 : error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
