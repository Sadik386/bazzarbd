import admin from "firebase-admin";

// In production, you would use a service account key JSON file
// For this environment, we'll try to use environment variables
// Or allow a "bypass" if not configured (NOT FOR PRODUCTION)

let initialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    initialized = true;
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:", error.message);
}

export const verifyIdToken = async (idToken) => {
  if (!initialized) {
    console.warn("Firebase Admin not initialized. Skipping verification (SECURITY RISK)");
    // Fallback for development if no service account is provided
    // In a real app, this MUST fail if not initialized
    return null; 
  }
  return admin.auth().verifyIdToken(idToken);
};
