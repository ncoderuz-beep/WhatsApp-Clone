import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../App';
import { ChatRoom, ChatMessage } from '../types';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onDarkModeToggle: () => void;
  isDarkMode: boolean;
  key?: string;
}

export default function ChatMain({ onDarkModeToggle, isDarkMode }: Props) {
  const { user, profile } = useAuth();
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Direct and Group chats where user is a participant
    const q = query(
      collection(db, 'rooms'),
      where('participants', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
      // Sort locally by lastMessageTime desc
      roomData.sort((a, b) => {
        const timeA = a.lastMessageTime?.seconds || 0;
        const timeB = b.lastMessageTime?.seconds || 0;
        return timeB - timeA;
      });
      setRooms(roomData);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const handleCreateRoom = async (type: 'direct' | 'group' | 'channel', name?: string, targetUserId?: string) => {
    if (!user) return;
    
    try {
      let participants = [user.uid];
      let existingRoom = null;

      if (type === 'direct' && targetUserId) {
        participants.push(targetUserId);
        
        // Check if direct chat already exists
        existingRoom = rooms.find(r => r.type === 'direct' && r.participants.includes(targetUserId));
      }

      if (existingRoom) {
        setActiveRoom(existingRoom);
        return;
      }

      const newRoom = {
        type,
        name: name || (type === 'direct' ? 'Shaxsiy chat' : 'Yangi guruh'),
        participants,
        admins: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        lastMessage: 'Chat ochildi',
        lastMessageTime: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'rooms'), newRoom);
      setActiveRoom({ id: docRef.id, ...newRoom } as any);
    } catch (e) {
      console.error('Error creating room', e);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-zinc-950 overflow-hidden">
      <Sidebar 
        rooms={rooms} 
        activeRoomId={activeRoom?.id} 
        onRoomSelect={setActiveRoom}
        onCreateRoom={handleCreateRoom}
        isDarkMode={isDarkMode}
        onDarkModeToggle={onDarkModeToggle}
        className={`${activeRoom ? 'hidden md:flex' : 'flex'}`}
      />
      <main className={`flex-1 flex flex-col relative h-full ${!activeRoom ? 'hidden md:flex' : 'flex'}`}>
        {activeRoom ? (
          <ChatArea room={activeRoom} key={activeRoom.id} onBack={() => setActiveRoom(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-100 dark:bg-[#0e1621] relative overflow-hidden">
            <div className="whatsapp-bg absolute inset-0 opacity-10 pointer-events-none" />
            <div className="relative z-10 max-w-sm p-8 rounded-3xl bg-white/75 dark:bg-[#17212b]/75 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
              {profile?.bannerImage ? (
                <div className="w-full h-40 rounded-2xl overflow-hidden mb-6 shadow-md border border-zinc-200 dark:border-zinc-700">
                  <img src={profile.bannerImage} alt="Banner" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-[#2481cc]/10 dark:bg-[#2fa5e4]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl text-[#2481cc] dark:text-[#2fa5e4] font-bold">S</span>
                </div>
              )}
              <h2 className="text-2xl font-bold dark:text-white mb-2">Suhbat Web</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Xabarlar shifrlangan holda yuboriladi. Chatlashish uchun chap tomondagi ro'yxatdan birortasini tanlang.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
