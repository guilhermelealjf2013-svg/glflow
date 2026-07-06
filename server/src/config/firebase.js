const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Suporta service account via arquivo (dev) ou variável de ambiente (produção)
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT
    ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    : admin.credential.applicationDefault(); // usa GOOGLE_APPLICATION_CREDENTIALS

  admin.initializeApp({
    credential,
    projectId: 'glflowbcc',
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
