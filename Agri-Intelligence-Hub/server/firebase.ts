import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin with environment variables or fall back to in-memory mode
let firestore: FirebaseFirestore.Firestore | null = null;

try {
    if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
    ) {
        if (getApps().length === 0) {
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                }),
            });
        }
        firestore = getFirestore();
        console.log("✅ Firebase Firestore connected successfully");
    } else {
        console.log(
            "⚠️  Firebase credentials not found. Running in local-only mode (data won't persist)."
        );
    }
} catch (error) {
    console.log(
        "⚠️  Firebase initialization failed. Running in local-only mode.",
        error
    );
}

export { firestore };
