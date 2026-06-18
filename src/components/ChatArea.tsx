import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { ChatRoom, ChatMessage } from '../types';
import { encryptMessage, decryptMessage } from '../lib/crypto';
import { Send, Camera, Paperclip, MoreVertical, Search, Smile, Image as ImageIcon } from 'lucide-react';
import MessageItem from './MessageItem';
import { motion } from 'motion/react';

interface Props {
  room: ChatRoom;
  key?: string;
}

export default function ChatArea({ room }: Props) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [roomImage, setRoomImage] = useState(room.image);

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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e5ddd5] dark:bg-zinc-950/20 relative">
      <div className="whatsapp-bg absolute inset-0 opacity-10 pointer-events-none" />
      
      {/* Room Header */}
      <div className="h-[60px] flex items-center justify-between px-4 bg-zinc-50 dark:bg-zinc-800/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-700 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 cursor-pointer" onClick={handleUpdateRoomImage}>
            <img src={roomImage || `https://api.dicebear.com/7.x/initials/svg?seed=${room.name}`} alt={room.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-white leading-tight">{room.name}</h3>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {room.type === 'channel' ? 'Kanal' : room.type === 'group' ? `${room.participants.length} qatnashchi` : 'Shaxsiy chat'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-zinc-500">
          <Search className="w-5 h-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" />
          <MoreVertical className="w-5 h-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" />
        </div>
      </div>

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
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 relative z-10">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
          <button type="button" className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <Smile className="w-6 h-6" />
          </button>
          <button type="button" className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <Paperclip className="w-6 h-6" />
          </button>
          <input 
            type="text" 
            placeholder="Xabar yozing..."
            className="flex-1 bg-white dark:bg-zinc-800 py-2.5 px-4 rounded-xl outline-none border-none text-zinc-900 dark:text-white placeholder:text-zinc-400 text-sm shadow-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {inputText.trim() ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit" 
              className="p-3 bg-green-500 hover:bg-green-600 rounded-full text-white shadow-lg"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          ) : (
            <button type="button" className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              <Camera className="w-6 h-6" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
