/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from './types';
import LoginGate from './components/LoginGate';
import ChatMain from './components/ChatMain';
import { AnimatePresence, motion } from 'motion/react';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      }
    } catch (e) {
      console.error('Error fetching profile', e);
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const value = {
    user,
    profile,
    loading,
    refreshProfile: async () => {
      if (user) await fetchProfile(user.uid);
    },
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      <div className="h-screen overflow-hidden font-sans">
        <AnimatePresence mode="wait">
          {!user || !profile ? (
            <motion.div key="login" className="h-full w-full">
              <LoginGate onDarkModeToggle={() => setIsDarkMode(!isDarkMode)} isDarkMode={isDarkMode} />
            </motion.div>
          ) : (
            <motion.div key="main" className="h-full w-full">
              <ChatMain onDarkModeToggle={() => setIsDarkMode(!isDarkMode)} isDarkMode={isDarkMode} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthContext.Provider>
  );
}
