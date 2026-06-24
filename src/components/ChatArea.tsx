import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { ChatRoom, ChatMessage, UserProfile } from '../types';
import { encryptMessage, decryptMessage } from '../lib/crypto';
import { Send, Camera, Paperclip, MoreVertical, Search, Smile, Image as ImageIcon, ChevronLeft, Trash2, AlertTriangle } from 'lucide-react';
import MessageItem from './MessageItem';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  room: ChatRoom;
  onBack: () => void;
  key?: string;
}

export default function ChatArea({ room, onBack }: Props) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [roomImage, setRoomImage] = useState(room.image);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<UserProfile | null>(null);

  const otherUserId = room.participants?.find(p => p !== user?.uid);

  useEffect(() => {
    if (room.type === 'direct' && otherUserId) {
      const unsub = onSnapshot(doc(db, 'users', otherUserId), (snap) => {
        if (snap.exists()) {
          setOtherUserProfile(snap.data() as UserProfile);
        }
      }, (err) => {
        console.error('Peer user snapshot error:', err);
      });
      return unsub;
    } else {
      setOtherUserProfile(null);
    }
  }, [room.id, room.type, otherUserId]);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', room.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          text: data.isDeleted ? 'Xabar uchirilgan' : decryptMessage(data.text)
        } as ChatMessage;
      });
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    return unsub;
  }, [room.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const encrypted = encryptMessage(inputText.trim());
    setInputText('');

    try {
      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        chatId: room.id,
        senderId: user.uid,
        senderName: profile?.displayName || 'Unknown',
        text: encrypted,
        timestamp: serverTimestamp(),
        isEdited: false,
        isDeleted: false,
        reactions: {}
      });

      // Update last message in room
      const roomRef = doc(db, 'rooms', room.id);
      await updateDoc(roomRef, {
        lastMessage: inputText.trim(),
        lastMessageTime: serverTimestamp()
      });
    } catch (e) {
      console.error('Error sending message', e);
    }
  };

  const handleUpdateRoomImage = async () => {
    const url = prompt('Kanal/Guruh uchun rasm URL kiriting:');
    if (url) {
      try {
        await updateDoc(doc(db, 'rooms', room.id), { image: url });
        setRoomImage(url);
      } catch (e) { console.error(e); }
    }
  };

  const handleDeleteChat = async () => {
    try {
      await deleteDoc(doc(db, 'rooms', room.id));
      setShowDeleteConfirm(false);
      onBack();
    } catch (e) {
      console.error('Error deleting chat:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#eef2f5] dark:bg-[#0e1621] relative">
      <div className="whatsapp-bg absolute inset-0 opacity-10 pointer-events-none" />
      
      {/* Room Header */}
      <div className="h-[60px] flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800/80 relative z-30">
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={onBack}
            className="md:hidden p-1 -ml-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
          </button>
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 cursor-pointer" onClick={handleUpdateRoomImage}>
            <img src={roomImage || `https://api.dicebear.com/7.x/initials/svg?seed=${room.name}`} alt={room.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight truncate max-w-[120px] md:max-w-none">{room.name}</h3>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {room.type === 'channel' ? (
                'Kanal'
              ) : room.type === 'group' ? (
                `${room.participants.length} qatnashchi`
              ) : otherUserProfile ? (
                otherUserProfile.hideOnline ? (
                  'oxirgi marta yaqinda bo\'lgan'
                ) : otherUserProfile.status === 'Online' ? (
                  <span className="text-[#2481cc] dark:text-[#2fa5e4] font-medium">onlayn</span>
                ) : (
                  'oflayn'
                )
              ) : (
                'shaxsiy chat'
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-zinc-500 relative">
          <Search className="w-5 h-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" />
          <div className="relative">
            <MoreVertical 
              className="w-5 h-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 transition-transform active:scale-95" 
              onClick={() => setShowMenu(!showMenu)}
            />
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-1.5 z-40"
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleUpdateRoomImage();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 flex items-center gap-2 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                      Rasm o'zgartirish
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Chatni o'chirish
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-950/20 rounded-full text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Chatni o'chirish
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Ushbu chat/suhbatni butunlay o'chirib tashlamoqchimisiz? Guruh yoki chatdagi barcha xabarlar o'chib ketadi va qayta tiklab bo'lmaydi.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={handleDeleteChat}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all"
                >
                  O'chirish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Messages Window */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 relative z-0 hide-scrollbar"
      >
        {messages.map((msg, idx) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            isOwn={msg.senderId === user?.uid} 
            roomId={room.id}
            currentUserId={user?.uid || ''}
            showSenderName={room.type !== 'direct'}
          />
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800/80 relative z-10">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
          <button type="button" className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-[#7995b0] transition-colors">
            <Smile className="w-6 h-6" />
          </button>
          <button type="button" className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-[#7995b0] transition-colors">
            <Paperclip className="w-6 h-6" />
          </button>
          <input 
            type="text" 
            placeholder="Xabar yozing..."
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-2.5 px-4 rounded-xl outline-none border border-transparent focus:border-[#2481cc]/20 dark:focus:border-[#2fa5e4]/20 text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-[#7995b0] text-sm shadow-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {inputText.trim() ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit" 
              className="p-3 bg-[#2481cc] hover:bg-[#1d6fa5] dark:bg-[#2fa5e4] dark:hover:bg-[#1d6fa5] rounded-full text-white shadow-lg shrink-0"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          ) : (
            <button type="button" className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-[#7995b0] transition-colors">
              <Camera className="w-6 h-6" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
