import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../App';
import { ChatRoom, ChatMessage, UserProfile } from '../types';
import { encryptMessage, decryptMessage } from '../lib/crypto';
import { Send, Camera, Paperclip, MoreVertical, Search, Smile, Image as ImageIcon, ChevronLeft, Trash2, AlertTriangle, File, X } from 'lucide-react';
import MessageItem from './MessageItem';
import { motion, AnimatePresence } from 'motion/react';

const EMOJI_CATEGORIES = [
  {
    title: 'Yuzlar va kulgichlar',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓']
  },
  {
    title: 'Yuraklar va qo\'llar',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👍', '👎', '✊', '🤛', '🤜', '🤝', '👊', '🤞', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🙏', '👏', '✍️', '💅', '🤳']
  },
  {
    title: 'Boshqa mashhurlar',
    emojis: ['✨', '🌟', '⭐', '🔥', '💥', '🎉', '🎊', '🎈', '🎁', '🎂', '🎨', '🎬', '🎤', '🎧', '🎮', '🚗', '🏍️', '🚲', '✈️', '🚀', '🌍', '🧭', '🏔️', '🌋', '🏕️', '🏖️', '🏠', '🏡', '🏢', '🏫', '🌈', '☀️', '☁️', '☔', '⚡', '❄️', '☕', '🍕', '🍔', '🍟', '🍩', '🍪', '⚽', '🏆', '🎵', '🔔', '📌', '📎', '💻', '📱']
  }
];

const createSvgSticker = (emoji: string, line1: string, line2: string, fromColor: string, toColor: string) => {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="grad-${emoji.charCodeAt(0) || 0}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${fromColor}"/>
      <stop offset="100%" stop-color="${toColor}"/>
    </linearGradient>
  </defs>
  <rect x="5" y="5" width="110" height="110" rx="28" fill="url(#grad-${emoji.charCodeAt(0) || 0})" />
  <circle cx="60" cy="42" r="22" fill="white" opacity="0.12"/>
  <text x="60" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="white" text-anchor="middle">${emoji}</text>
  <text x="60" y="82" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="9" fill="white" text-anchor="middle" letter-spacing="1">${line1}</text>
  <text x="60" y="95" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="9" fill="white" opacity="0.9" text-anchor="middle" letter-spacing="1">${line2}</text>
</svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const STICKERS_LIST = [
  // SVG Badges
  { id: 'uz_salom', url: createSvgSticker('🤝', 'ASSALOMU', 'ALAYKUM!', '#00b4db', '#0083b0'), name: 'Assalomu alaykum' },
  { id: 'uz_rahmat', url: createSvgSticker('💖', 'KATTAKON', 'RAHMAT!', '#ff416c', '#ff4b2b'), name: 'Rahmat' },
  { id: 'uz_zor', url: createSvgSticker('🔥', 'GAP YO\'Q!', 'ZO\'R!', '#f12711', '#f5af19'), name: 'Zo\'r' },
  { id: 'uz_choy', url: createSvgSticker('🍵', 'CHOYXONAGA', 'KETDIK!', '#11998e', '#38ef7d'), name: 'Choyxona' },
  { id: 'uz_ok', url: createSvgSticker('💡', 'TUSHUNARLI', 'OK!', '#7f00ff', '#e100ff'), name: 'Tushunarli' },
  { id: 'uz_omad', url: createSvgSticker('🎉', 'TABRIKLAYMAN', 'OMAD!', '#f1c40f', '#e67e22'), name: 'Omad' },
  
  // Animated Cats
  { id: 'cat_wave', url: 'https://media.giphy.com/media/C9x8gX02SnMIoAclby/giphy.gif', name: 'Salom mushuk' },
  { id: 'cat_love', url: 'https://media.giphy.com/media/Ge86IZm9KkaY39MoyX/giphy.gif', name: 'Yaxshi ko\'rish' },
  { id: 'cat_cry', url: 'https://media.giphy.com/media/g9582DNuQppazNwd7V/giphy.gif', name: 'Yig\'lash' },
  { id: 'cat_shock', url: 'https://media.giphy.com/media/2NfCPrfX3bY6Z7mP7J/giphy.gif', name: 'Dahshat' },
  { id: 'cat_sleep', url: 'https://media.giphy.com/media/Y8SCSg69paI964bLgK/giphy.gif', name: 'Uxlash' },
  { id: 'cat_angry', url: 'https://media.giphy.com/media/jYp8S7vfX0Q66v8V79/giphy.gif', name: 'Achiq' }
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [roomImage, setRoomImage] = useState(room.image);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<UserProfile | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const otherUserId = room.participants?.find(p => p !== user?.uid);

  const processSelectedFile = (file: File) => {
    setFileError(null);

    // Support files up to 20MB using Firebase Storage
    if (file.size > 20 * 1024 * 1024) {
      setFileError('Fayl hajmi juda katta. Iltimos, 20 MB dan kichik bo\'lgan faylni tanlang.');
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSelectedFileType(file.type);
    
    const sizeInKb = file.size / 1024;
    const sizeStr = sizeInKb > 1024 
      ? `${(sizeInKb / 1024).toFixed(1)} MB` 
      : `${sizeInKb.toFixed(0)} KB`;
    setSelectedFileSize(sizeStr);

    if (file.type.startsWith('image/')) {
      const objectURL = URL.createObjectURL(file);
      setSelectedFileData(objectURL);
    } else {
      setSelectedFileData(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processSelectedFile(droppedFile);
    }
  };

  const handleSendSticker = async (stickerUrl: string) => {
    if (!user) return;
    setShowEmojiPicker(false);

    try {
      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        chatId: room.id,
        senderId: user.uid,
        senderName: profile?.displayName || 'Unknown',
        text: '',
        timestamp: serverTimestamp(),
        isEdited: false,
        isDeleted: false,
        reactions: {},
        fileURL: stickerUrl,
        fileName: 'Stiker',
        fileType: 'sticker',
        fileSize: ''
      });

      // Update last message in room
      const roomRef = doc(db, 'rooms', room.id);
      await updateDoc(roomRef, {
        lastMessage: '🖼️ Stiker',
        lastMessageTime: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending sticker', err);
    }
  };

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
    if ((!inputText.trim() && !selectedFile) || !user || isUploading) return;

    const currentText = inputText.trim();
    const encrypted = encryptMessage(currentText);
    
    const fileToUpload = selectedFile;
    const currentFileName = selectedFileName;
    const currentFileType = selectedFileType;
    const currentFileSize = selectedFileSize;

    // Reset input fields instantly for ultra-fast UX response
    setInputText('');
    setSelectedFile(null);
    setSelectedFileData(null);
    setSelectedFileName(null);
    setSelectedFileType(null);
    setSelectedFileSize(null);
    setFileError(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';

    try {
      let finalFileURL = '';

      if (fileToUpload) {
        setIsUploading(true);
        try {
          // Upload to Firebase Storage
          const storagePath = `rooms/${room.id}/${Date.now()}_${fileToUpload.name}`;
          const storageRef = ref(storage, storagePath);
          const uploadResult = await uploadBytes(storageRef, fileToUpload);
          finalFileURL = await getDownloadURL(uploadResult.ref);
        } catch (storageErr) {
          console.error('Firebase Storage failed, trying base64 fallback:', storageErr);
          
          // Fallback: If it's a small file (< 800KB), we can convert to base64 string
          if (fileToUpload.size < 800 * 1024) {
            finalFileURL = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = (ev) => resolve(ev.target?.result as string);
              r.onerror = (err) => reject(err);
              r.readAsDataURL(fileToUpload);
            });
          } else {
            setFileError('Faylni yuklab bo\'lmadi. Internet aloqangizni tekshiring.');
            setIsUploading(false);
            return;
          }
        }
      }

      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        chatId: room.id,
        senderId: user.uid,
        senderName: profile?.displayName || 'Unknown',
        text: encrypted,
        timestamp: serverTimestamp(),
        isEdited: false,
        isDeleted: false,
        reactions: {},
        ...(finalFileURL ? {
          fileURL: finalFileURL,
          fileName: currentFileName,
          fileType: currentFileType,
          fileSize: currentFileSize
        } : {})
      });

      // Update last message in room
      const roomRef = doc(db, 'rooms', room.id);
      let lastMsgText = currentText;
      if (!lastMsgText && currentFileName) {
        lastMsgText = currentFileType?.startsWith('image/') ? '📷 Rasm' : `📁 ${currentFileName}`;
      }
      await updateDoc(roomRef, {
        lastMessage: lastMsgText,
        lastMessageTime: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message', err);
      setFileError('Xabar yuborishda xatolik yuz berdi.');
    } finally {
      setIsUploading(false);
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
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full bg-[#eef2f5] dark:bg-[#0e1621] relative"
    >
      <div className="whatsapp-bg absolute inset-0 opacity-10 pointer-events-none" />

      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#2481cc]/20 dark:bg-[#2fa5e4]/15 backdrop-blur-sm z-50 flex flex-col items-center justify-center pointer-events-none border-4 border-dashed border-[#2481cc]/60 m-2 rounded-2xl"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 border border-zinc-200 dark:border-zinc-800 scale-95 md:scale-100">
              <div className="w-16 h-16 rounded-full bg-[#2481cc]/10 dark:bg-[#2fa5e4]/20 flex items-center justify-center text-[#2481cc] dark:text-[#2fa5e4] animate-bounce">
                <Paperclip className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Faylni shu yerga tashlang</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Rasm yoki istalgan hujjat (max 20MB)</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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

      {/* File Preview if any selected */}
      {(selectedFile || fileError) && (
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 relative z-10">
          {fileError ? (
            <div className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {fileError}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {isUploading ? (
                <div className="w-12 h-12 rounded-lg bg-[#2481cc]/10 flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 border-2 border-[#2481cc] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedFileType?.startsWith('image/') && selectedFileData ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 shrink-0">
                  <img src={selectedFileData} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#2481cc]/10 text-[#2481cc] dark:text-[#2fa5e4] flex items-center justify-center shrink-0">
                  <File className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-zinc-900 dark:text-white">
                  {isUploading ? "Fayl yuklanmoqda..." : selectedFileName}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{selectedFileSize}</p>
              </div>
            </div>
          )}
          <button 
            type="button" 
            disabled={isUploading}
            onClick={() => {
              setSelectedFile(null);
              setSelectedFileData(null);
              setSelectedFileName(null);
              setSelectedFileType(null);
              setSelectedFileSize(null);
              setFileError(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
              if (cameraInputRef.current) cameraInputRef.current.value = '';
            }} 
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji & Sticker Picker Popover */}
      <AnimatePresence>
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-16 left-4 right-4 md:left-6 md:right-auto md:w-[350px] h-[340px] max-h-[340px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-2 shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-lg">
                    <button 
                      type="button"
                      onClick={() => setActiveTab('emoji')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeTab === 'emoji' ? 'bg-white dark:bg-zinc-700 text-[#2481cc] dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-[#7995b0]'}`}
                    >
                      Smayllar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('sticker')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeTab === 'sticker' ? 'bg-white dark:bg-zinc-700 text-[#2481cc] dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-[#7995b0]'}`}
                    >
                      Stikerlar
                    </button>
                  </div>
                  <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                {activeTab === 'emoji' ? (
                  <>
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-[#7995b0] uppercase tracking-wider">{cat.title}</h4>
                        <div className="grid grid-cols-8 gap-1">
                          {cat.emojis.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setInputText(prev => prev + emoji);
                              }}
                              className="text-xl p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg active:scale-90 transition-transform flex items-center justify-center"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="space-y-3 pb-2">
                    <h4 className="text-[10px] font-bold text-zinc-400 dark:text-[#7995b0] uppercase tracking-wider mb-2">Uzbekcha va Mushuk stikerlari</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {STICKERS_LIST.map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSendSticker(st.url)}
                          className="p-1.5 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-[#2481cc]/10 dark:hover:bg-[#2fa5e4]/10 rounded-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-1 border border-transparent hover:border-[#2481cc]/20"
                          title={st.name}
                        >
                          <img src={st.url} alt={st.name} className="w-14 h-14 object-contain pointer-events-none drop-shadow-sm" />
                          <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 truncate w-full text-center">{st.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800/80 relative z-10">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
          />
          <input 
            type="file" 
            ref={cameraInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange} 
          />

          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-zinc-100 text-[#2481cc] dark:bg-zinc-800 dark:text-[#2fa5e4]' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-[#7995b0]'}`}
            title="Emoji tanlash"
          >
            <Smile className="w-6 h-6" />
          </button>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-[#7995b0] transition-colors"
            title="Fayl biriktirish"
          >
            <Paperclip className="w-6 h-6" />
          </button>
          <input 
            type="text" 
            disabled={isUploading}
            placeholder={selectedFile ? "Izoh yozing..." : "Xabar yozing..."}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-2.5 px-4 rounded-xl outline-none border border-transparent focus:border-[#2481cc]/20 dark:focus:border-[#2fa5e4]/20 text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-[#7995b0] text-sm shadow-sm disabled:opacity-75"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {(inputText.trim() || selectedFile) ? (
            <motion.button 
              whileHover={{ scale: isUploading ? 1 : 1.05 }}
              whileTap={{ scale: isUploading ? 1 : 0.95 }}
              type="submit" 
              disabled={isUploading}
              className="p-3 bg-[#2481cc] hover:bg-[#1d6fa5] dark:bg-[#2fa5e4] dark:hover:bg-[#1d6fa5] rounded-full text-white shadow-lg shrink-0 disabled:opacity-50"
              title="Yuborish"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          ) : (
            <button 
              type="button" 
              onClick={() => cameraInputRef.current?.click()}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-[#7995b0] transition-colors"
              title="Rasm yuklash"
            >
              <Camera className="w-6 h-6" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
