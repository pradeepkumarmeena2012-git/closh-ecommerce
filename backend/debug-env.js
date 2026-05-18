import "dotenv/config";
console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_SERVICE_ACCOUNT_JSON exists:", !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
