import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { firebaseAuth } from '../config/firebase';

const AuthContext = createContext(null);

// In production the API lives on a different domain (Render); in dev Vite proxies /api
const API_BASE = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_BASE;

// Attach fresh Firebase ID token before every request
axios.interceptors.request.use(async (config) => {
  const fbUser = firebaseAuth.currentUser;
  if (fbUser) {
    const token = await fbUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        try {
          // Fetch Firestore profile (role, teamId, etc.) from our API
          const { data } = await axios.get('/api/auth/me');
          setUser({ ...data, firebaseUid: fbUser.uid, email: fbUser.email });
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(username, password) {
    const email = `${username}@glflow.com`;
    const { user: fbUser } = await signInWithEmailAndPassword(firebaseAuth, email, password);
    // Fetch profile immediately so the caller gets the role without waiting for onAuthStateChanged
    const token = await fbUser.getIdToken();
    const { data } = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile = { ...data, firebaseUid: fbUser.uid, email: fbUser.email };
    setUser(profile);
    return profile;
  }

  async function logout() {
    await signOut(firebaseAuth);
    setUser(null);
  }

  async function getToken() {
    return firebaseAuth.currentUser?.getIdToken() ?? null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
