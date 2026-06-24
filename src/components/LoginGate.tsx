import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Lock, User, Camera, Sun, Moon, Image as ImageIcon, Chrome } from 'lucide-react';

interface Props {
  onDarkModeToggle: () => void;
  isDarkMode: boolean;
  key?: string;
}

export default function LoginGate({ onDarkModeToggle, isDarkMode }: Props) {
  const [step, setStep] = useState<'password' | 'google' | 'profile'>('password');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDomainHelper, setShowDomainHelper] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'azamxonov') {
      setStep('google');
      setError('');
    } else {
      setError('Noto\'g\'ri parol!');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    
    try {
      // Call signInWithPopup FIRST to preserve user gesture
      const cred = await signInWithPopup(auth, provider);
      setLoading(true);
      const user = cred.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        window.location.reload();
        return;
      }
      
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
      setStep('profile');
    } catch (err: any) {
      console.error('Google Login failed:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Brauzer pop-up oynani blokladi. Iltimos, pop-uplarga ruxsat bering.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Ushbu domen yangi Firebase loyihangizda ruxsat etilmagan! Uni test-dilnura loyihangizga qo\'shishingiz kerak.');
        setShowDomainHelper(true);
      } else if (err.code === 'auth/admin-restricted-operation') {
        setError('Google Login ruxsat etilmagan. Firebase Console-dan Google-ni yoqing.');
      } else {
        setError('Xatolik: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || username.length < 3) {
      setError('Ism va username (kamida 3 belgi) majburiy');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Auth required');
      
      const uid = user.uid;
      
      const userData = {
        uid: uid,
        username: username.toLowerCase().trim(),
        displayName,
        photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
        bannerImage: bannerImage,
        status: 'Online',
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', uid), userData);
        localStorage.setItem('prototype_user', JSON.stringify(userData));
      } catch (firestoreErr: any) {
        console.error('Firestore profile save failed:', firestoreErr);
        setError('Profilni saqlashda xatolik: ' + firestoreErr.message);
        setLoading(false);
        return;
      }
      
      window.location.reload(); 
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4"
    >
      <div className="absolute top-4 right-4">
        <button onClick={onDarkModeToggle} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
          {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-zinc-600" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#2481cc] dark:bg-[#2fa5e4] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-white text-3xl font-bold">W</span>
          </div>
          <h1 className="text-2xl font-bold dark:text-white">Xush kelibsiz</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Chatlashishni boshlang</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Parol</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  placeholder="Parolni kiriting"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 outline-none text-zinc-900 dark:text-zinc-50 focus:border-[#2481cc] dark:focus:border-[#2fa5e4] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <button className="w-full py-4 bg-[#2481cc] hover:bg-[#1d6fa5] dark:bg-[#2fa5e4] dark:hover:bg-[#1d6fa5] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">
              Davom etish
            </button>
          </form>
        )}

        {step === 'google' && (
          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Chrome className="w-5 h-5 text-blue-500" />
                  Google orqali kirish
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-zinc-500 dark:text-zinc-400">
              Prototype rejimida Google Auth faqat ruxsat berilgan bo'lsa ishlaydi.
            </p>

            {showDomainHelper && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-3">
                <div className="text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                  <span>💡 Muammoning yechimi:</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Siz yaratgan yangi <strong className="font-bold">test-dilnura</strong> loyihasi sozlamalariga kirib, quyidagi domenlarni <strong className="font-bold">Authorized Domains</strong> ro'yxatiga qo'shish kerak. (Siz eski loyihaga qo'shgansiz, yangisiga emas).
                </p>
                
                <div className="space-y-1.5 pt-1">
                  {[
                    window.location.hostname,
                    'a-chats.vercel.app',
                    'ais-dev-ajr5bouybzb4v6363k2lmt-300640974193.asia-southeast1.run.app',
                    'ais-pre-ajr5bouybzb4v6363k2lmt-300640974193.asia-southeast1.run.app'
                  ].filter((domain, index, self) => domain && self.indexOf(domain) === index).map((domain) => (
                    <div key={domain} className="flex items-center justify-between bg-white dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
                      <span className="truncate max-w-[200px]">{domain}</span>
                      <button 
                        onClick={() => copyToClipboard(domain)} 
                        className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-0.5 rounded-md transition-colors"
                      >
                        {copiedDomain === domain ? 'Nusxa olindi!' : 'Nusxa olish'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-center">
                  <a 
                    href="https://console.firebase.google.com/project/test-dilnura/authentication/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    Firebase Console-ni ochish ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-4">
              <div className="relative group cursor-pointer" title="Rasm yuklash">
                <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center border-2 border-[#2481cc] dark:border-[#2fa5e4] shadow-xl">
                  {photoURL ? (
                    <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-zinc-400" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera className="text-white w-6 h-6" />
                </div>
              </div>
              <input
                type="text"
                placeholder="Profil rasmi URL (ixtiyoriy)"
                className="w-full mt-4 px-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-zinc-900 dark:text-zinc-50"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">To'liq ism</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Ismingizni kiriting"
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none text-zinc-900 dark:text-zinc-50 focus:border-[#2481cc] dark:focus:border-[#2fa5e4]"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Username (qidiruv uchun)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">@</span>
                  <input
                    type="text"
                    placeholder="username"
                    className="w-full pl-10 pr-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none text-zinc-900 dark:text-zinc-50 focus:border-[#2481cc] dark:focus:border-[#2fa5e4]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Glavniy rasm (Banner)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Banner rasm URL"
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none text-zinc-900 dark:text-zinc-50 focus:border-[#2481cc] dark:focus:border-[#2fa5e4]"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <button className="w-full py-4 bg-[#2481cc] hover:bg-[#1d6fa5] dark:bg-[#2fa5e4] dark:hover:bg-[#1d6fa5] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Boshlash'}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
