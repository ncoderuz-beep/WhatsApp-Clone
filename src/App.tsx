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

  const [gatePassword, setGatePassword] = useState<string>('azamxonov');
  const [isGateVerified, setIsGateVerified] = useState<boolean>(false);
  const [gateLoading, setGateLoading] = useState<boolean>(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'security');
    const unsub = onSnapshot(docRef, (snapshot) => {
      let currentPass = 'azamxonov';
      if (snapshot.exists()) {
        currentPass = snapshot.data().gatePassword || 'azamxonov';
      }
      setGatePassword(currentPass);
      
      const stored = sessionStorage.getItem('gate_verified_password') || '';
      if (stored === currentPass) {
        setIsGateVerified(true);
      } else {
        setIsGateVerified(false);
      }
      setGateLoading(false);
    }, (err) => {
      console.error('Gate security snapshot error:', err);
      setGateLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Listen to profile changes in real-time
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubProfile = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          }
          setLoading(false);
        }, (err) => {
          console.error('Profile snapshot listener error:', err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

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
    refreshProfile: async () => {},
  };

  if (loading || gateLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 border-4 border-[#2481cc] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      <div className="h-screen overflow-hidden font-sans">
        <AnimatePresence mode="wait">
          {!user || !profile || !isGateVerified ? (
            <motion.div key="login" className="h-full w-full">
              <LoginGate 
                onDarkModeToggle={() => setIsDarkMode(!isDarkMode)} 
                isDarkMode={isDarkMode} 
                gatePassword={gatePassword}
                onVerifyGate={(pass) => {
                  sessionStorage.setItem('gate_verified_password', pass);
                  setIsGateVerified(true);
                }}
              />
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
