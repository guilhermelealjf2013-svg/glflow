import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyB9bIupqAtv2FxJJ4Zan6-lpH4151QFCcc',
  authDomain: 'glflowbcc.firebaseapp.com',
  projectId: 'glflowbcc',
  storageBucket: 'glflowbcc.firebasestorage.app',
  messagingSenderId: '598238721513',
  appId: '1:598238721513:web:2bb982541ff7376890c778',
  measurementId: 'G-3MNWZ2W58X',
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const analytics = getAnalytics(app);
export default app;
