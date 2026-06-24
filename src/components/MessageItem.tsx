import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ChatMessage } from '../types';
import { formatTime } from '../lib/utils';
import { Check, CheckCheck, Smile, Trash2, Edit2, X, Send } from 'lucide-react';
import { encryptMessage } from '../lib/crypto';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  roomId: string;
  currentUserId: string;
  showSenderName?: boolean;
  key?: string;
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

export default function MessageItem({ message, isOwn, roomId, currentUserId, showSenderName }: Props) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showReactions, setShowReactions] = useState(false);

  const handleEdit = async () => {
    if (!editText.trim() || editText === message.text) {
      setIsEditing(false);
      return;
    }
    const encrypted = encryptMessage(editText.trim());
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'messages', message.id), {
        text: encrypted,
        isEdited: true,
        timestamp: serverTimestamp() // Optional: keep original or update?
      });
      setIsEditing(false);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (confirm('Xabarni ochirishni xohlaysizmi?')) {
      try {
        await updateDoc(doc(db, 'rooms', roomId, 'messages', message.id), {
          isDeleted: true
        });
      } catch (e) { console.error(e); }
    }
  };

  const handleReact = async (emoji: string) => {
    const reactions = message.reactions || {};
    const userId = currentUserId;
    // Simple reaction logic: toggle emoji
    const currentUsers = reactions[emoji] || [];
    const newUsers = currentUsers.includes(userId) 
      ? currentUsers.filter(u => u !== userId)
      : [...currentUsers, userId];
    
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'messages', message.id), {
        [`reactions.${emoji}`]: newUsers
      });
      setShowReactions(false);
    } catch (e) { console.error(e); }
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} w-full`}>
        <div className="bg-zinc-100 dark:bg-zinc-800/50 italic text-zinc-400 text-[10px] py-1 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
           Bu xabar o'chirildi
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} w-full group mb-1`}>
      <div 
        className="relative max-w-[85%] md:max-w-[70%] cursor-pointer select-none"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
        onClick={() => setShowActions(!showActions)}
      >
        <div className={`
          px-3.5 py-1.5 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.08)] text-sm break-words transition-all
          ${isOwn 
            ? 'bg-[#e2f7cb] text-zinc-900 dark:bg-[#2b5278] dark:text-zinc-100 rounded-tr-none border-t border-r border-[#d4f2b5]/30 dark:border-zinc-700/30' 
            : 'bg-white text-zinc-900 dark:bg-[#182533] dark:text-zinc-100 rounded-tl-none border-t border-l border-zinc-100/50 dark:border-zinc-800/50'}
        `}>
          {showSenderName && !isOwn && (
            <div className="text-[10px] font-bold text-[#2481cc] dark:text-[#2fa5e4] mb-0.5">{message.senderName}</div>
          )}
          
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <textarea
                className="w-full bg-zinc-600/20 rounded p-1.5 outline-none text-zinc-900 dark:text-white text-sm"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="text-zinc-500"><X className="w-4 h-4" /></button>
                <button onClick={handleEdit} className="text-[#2481cc] dark:text-[#2fa5e4]"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div className="leading-relaxed whitespace-pre-wrap">{message.text}</div>
          )}

          <div className={`flex items-center justify-end gap-1 mt-0.5 text-[9px] select-none ${isOwn ? 'text-green-700/80 dark:text-[#7995b0]' : 'text-zinc-400 dark:text-[#7995b0]'}`}>
            {message.isEdited && <span className="opacity-75">tahrirlandi</span>}
            <span>{formatTime(message.timestamp)}</span>
            {isOwn && <CheckCheck className="w-3.5 h-3.5 text-[#4ca3ff] dark:text-[#2fa5e4]" />}
          </div>
        </div>

        {/* Reaction badge */}
        {message.reactions && Object.entries(message.reactions).some(([_, u]) => u.length > 0) && (
          <div 
            onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }}
            className={`absolute -bottom-3 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 rounded-full px-2 py-0.5 z-10 hover:scale-105 transition-transform cursor-pointer`}
          >
            {Object.entries(message.reactions).map(([emoji, users]) => users.length > 0 && (
              <div key={emoji} className="flex items-center gap-0.5">
                <span className="text-[11px] scale-90">{emoji}</span>
                {users.length > 1 && (
                  <span className="text-[9px] text-zinc-500 font-bold">{users.length}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Floating Actions */}
        <AnimatePresence>
          {showActions && !isEditing && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`absolute top-0 ${isOwn ? '-left-8' : '-right-8'} flex flex-col gap-1 z-20`}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }} 
                className="bg-white dark:bg-zinc-800 p-1.5 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-700 hover:scale-110 transition-transform"
              >
                <Smile className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              {isOwn && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
                    className="bg-white dark:bg-zinc-800 p-1.5 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-700 hover:scale-110 transition-transform"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }} 
                    className="bg-white dark:bg-zinc-800 p-1.5 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-700 hover:scale-110 transition-transform text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction Selector */}
        {showReactions && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`absolute -top-10 ${isOwn ? 'right-0' : 'left-0'} flex gap-2 bg-white dark:bg-zinc-800 shadow-2xl rounded-full p-2 border border-zinc-100 dark:border-zinc-700 z-50`}
          >
            {REACTIONS.map(emoji => (
              <button 
                key={emoji} 
                onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
                className="hover:scale-125 transition-transform text-lg"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
