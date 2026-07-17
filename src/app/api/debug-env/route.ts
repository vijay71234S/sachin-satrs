import { NextResponse } from "next/server";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export async function GET() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  const rawInfo = {
    projectId: {
      exists: !!projectId,
      length: projectId ? projectId.length : 0,
      value: projectId || "",
    },
    clientEmail: {
      exists: !!clientEmail,
      length: clientEmail ? clientEmail.length : 0,
      value: clientEmail || "",
    },
    privateKey: {
      exists: !!privateKey,
      length: privateKey ? privateKey.length : 0,
      startsWithBegin: privateKey ? privateKey.startsWith("-----BEGIN PRIVATE KEY-----") : false,
      endsWithEnd: privateKey ? privateKey.trim().endsWith("-----END PRIVATE KEY-----") : false,
      containsLiteralSlashN: privateKey ? privateKey.includes("\\n") : false,
      containsActualNewline: privateKey ? privateKey.includes("\n") : false,
    }
  };

  // Clean key in the same way as firebase-admin.ts
  let cleanedKey = privateKey;
  if (cleanedKey) {
    cleanedKey = cleanedKey.trim();
    if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
      cleanedKey = cleanedKey.substring(1, cleanedKey.length - 1);
    } else if (cleanedKey.startsWith("'") && cleanedKey.endsWith("'")) {
      cleanedKey = cleanedKey.substring(1, cleanedKey.length - 1);
    }
    cleanedKey = cleanedKey.replace(/\\n/g, "\n");
  }

  const cleanedInfo = {
    privateKey: {
      exists: !!cleanedKey,
      length: cleanedKey ? cleanedKey.length : 0,
      startsWithBegin: cleanedKey ? cleanedKey.startsWith("-----BEGIN PRIVATE KEY-----") : false,
      endsWithEnd: cleanedKey ? cleanedKey.trim().endsWith("-----END PRIVATE KEY-----") : false,
      containsLiteralSlashN: cleanedKey ? cleanedKey.includes("\\n") : false,
      containsActualNewline: cleanedKey ? cleanedKey.includes("\n") : false,
    }
  };

  let testInitResult = "";
  let testInitError = null;

  try {
    if (projectId && clientEmail && cleanedKey) {
      const testApp = initializeApp({
        credential: cert({
          projectId: projectId.trim().replace(/^["']|["']$/g, ""),
          clientEmail: clientEmail.trim().replace(/^["']|["']$/g, ""),
          privateKey: cleanedKey,
        })
      }, "test-debug-app");
      
      const testDb = getFirestore(testApp);
      testInitResult = "Successfully initialized test-debug-app and got firestore";
      
      // Clean up test app
      await testApp.delete();
    } else {
      testInitResult = "Missing credentials to test initialization";
    }
  } catch (err: any) {
    testInitError = {
      message: err.message,
      stack: err.stack,
      code: err.code,
    };
  }

  return NextResponse.json({
    rawInfo,
    cleanedInfo,
    testInitResult,
    testInitError,
    getAppsCount: getApps().length,
  });
}
