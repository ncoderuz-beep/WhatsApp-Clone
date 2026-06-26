import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, User, Phone, Info, Globe, Shield, Save, Eye, EyeOff, Lock } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onClose: () => void;
}

export default function SettingsDrawer({ profile, onClose }: Props) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [username, setUsername] = useState(profile.username || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [bannerImage, setBannerImage] = useState(profile.bannerImage || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [hideOnline, setHideOnline] = useState(profile.hideOnline || false);
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [newGatePassword, setNewGatePassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const fetchGatePassword = async () => {
      try {
        const docRef = doc(db, 'settings', 'security');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setNewGatePassword(snap.data().gatePassword || 'azamxonov');
        } else {
          setNewGatePassword('azamxonov');
        }
      } catch (err) {
        console.error('Failed to fetch security setting:', err);
      }
    };
    fetchGatePassword();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (!displayName.trim()) {
        throw new Error('Ism bo\'sh bo\'lishi mumkin emas');
      }
      if (username.trim().length < 3) {
        throw new Error('Username kamida 3 ta belgidan iborat bo\'lishi kerak');
      }

      const cleanUsername = username.toLowerCase().replace(/\s+/g, '').trim();

      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        username: cleanUsername,
        photoURL: photoURL.trim(),
        bannerImage: bannerImage.trim(),
        bio: bio.trim(),
        phoneNumber: phoneNumber.trim(),
        hideOnline: hideOnline,
      });

      // Save global gate password if modified
      if (newGatePassword.trim()) {
        const securityRef = doc(db, 'settings', 'security');
        await setDoc(securityRef, { gatePassword: newGatePassword.trim() }, { merge: true });
        sessionStorage.setItem('gate_verified_password', newGatePassword.trim());
      }

      setSuccessMsg('Sozlamalar muvaffaqiyatli saqlandi!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      console.error('Settings save failed:', err);
      setErrorMsg(err.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'tween', duration: 0.25 }}
      className="absolute inset-0 bg-white dark:bg-zinc-900 z-50 flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/80">
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-zinc-600 dark:text-[#7995b0]"
          title="Orqaga"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-md font-bold text-zinc-950 dark:text-white">Sozlamalar</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Picture and Banner section */}
          <div className="flex flex-col items-center relative">
            <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center border-2 border-[#2481cc] dark:border-[#2fa5e4] shadow-md relative group">
              {photoURL ? (
                <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-zinc-400" />
              )}
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 dark:text-[#7995b0] text-center">
              Rasm URL manzilini pastda o'zgartirishingiz mumkin
            </div>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-xs rounded-xl border border-green-100 dark:border-green-900/30 font-medium text-center">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/30 font-medium text-center">
              {errorMsg}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-[#7995b0] mb-1 uppercase tracking-wider">Ism</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Ismingizni kiriting"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-zinc-950 dark:text-white focus:border-[#2481cc] dark:focus:border-[#2fa5e4] text-sm transition-all"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Nickname / Username */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-[#7995b0] mb-1 uppercase tracking-wider">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-[11px] text-sm font-bold text-zinc-400">@</span>
                <input
                  type="text"
                  placeholder="username"
                  className="w-full pl-8 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-zinc-950 dark:text-white focus:border-[#2481cc] dark:focus:border-[#2fa5e4] text-sm transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-[#7995b0] mb-1 uppercase tracking-wider">Telefon raqam</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-zinc-950 dark:text-white focus:border-[#2481cc] dark:focus:border-[#2fa5e4] text-sm transition-all"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Bio / About */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-[#7995b0] mb-1 uppercase tracking-wider">Tarjimai hol (Bio)</label>
              <div className="relative">
                <Info className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <textarea
                  placeholder="O'zingiz haqingizda biror narsa yozing..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-zinc-950 dark:text-white focus:border-[#2481cc] dark:focus:border-[#2fa5e4] text-sm transition-all min-h-[60px] resize-none"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>

            {/* Profile Picture URL */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-[#7995b0] mb-1 uppercase tracking-wider">Profil rasm URL manzili</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Rasm URL manzili (ixtiyoriy)"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-zinc-950 dark:text-white focus:border-[#2481cc] dark:focus:border-[#2fa5e4] text-sm transition-all"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                />
              </div>
            </div>

            {/* Banner Image URL */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-[#7995b0] mb-1 uppercase tracking-wider">Banner rasm URL manzili</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Banner rasm URL manzili (ixtiyoriy)"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-zinc-950 dark:text-white focus:border-[#2481cc] dark:focus:border-[#2fa5e4] text-sm transition-all"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                />
              </div>
            </div>

            {/* Hide Online Visibility Toggle */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#2481cc] dark:text-[#2fa5e4] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white">Onlayn holatni yashirish</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-[#7995b0] mt-0.5">Siz onlayn bo'lganingizda boshqalarga ko'rinmaysiz</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHideOnline(!hideOnline)}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${hideOnline ? 'bg-[#2481cc]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${hideOnline ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Gate Password Change */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#2481cc] dark:text-[#2fa5e4] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white">Kirish parolini o'zgartirish</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-[#7995b0] mt-0.5">Ilova barcha foydalanuvchilari uchun umumiy kirish paroli</p>
                </div>
              </div>
              
              <div className="relative pt-1">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Yangi parol kiriting"
                  className="w-full pl-3 pr-10 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-zinc-950 dark:text-white focus:border-[#2481cc] dark:focus:border-[#2fa5e4] text-xs transition-all"
                  value={newGatePassword}
                  onChange={(e) => setNewGatePassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-[14px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#2481cc] hover:bg-[#1d6fa5] dark:bg-[#2fa5e4] dark:hover:bg-[#1d6fa5] text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" /> Saqlash
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
