import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { ChatRoom, UserProfile } from '../types';
import { Search, MoreVertical, MessageSquarePlus, Users, Radio, LogOut, Sun, Moon, Plus, UserPlus, Menu, Settings } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import SettingsDrawer from './SettingsDrawer';

interface Props {
  rooms: ChatRoom[];
  activeRoomId?: string;
  onRoomSelect: (room: ChatRoom) => void;
  onCreateRoom: (type: 'direct' | 'group' | 'channel', name?: string, targetUserId?: string) => void;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
  className?: string;
}

export default function Sidebar({ rooms, activeRoomId, onRoomSelect, onCreateRoom, isDarkMode, onDarkModeToggle, className }: Props) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [foundUsers, setFoundUsers] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(50));

    const unsubscribe = onSnapshot(q, (snap) => {
      const allUsers = snap.docs.map(doc => ({ ...doc.data() } as UserProfile));
      
      const filtered = allUsers.filter(u => {
        const isNotMe = u.uid !== profile?.uid;
        if (!isNotMe) return false;
        
        if (!search) return false;
        
        const searchLower = search.toLowerCase();
        return (
          u.displayName?.toLowerCase().includes(searchLower) || 
          u.username?.toLowerCase().includes(searchLower)
        );
      });
      
      setFoundUsers(filtered);
    }, (err) => {
      console.error('User subscription failed:', err);
    });

    return () => unsubscribe();
  }, [search, profile?.uid]);

  const filteredRooms = rooms.filter(room => 
    room.name?.toLowerCase().includes(search.toLowerCase()) ||
    room.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('prototype_user');
      window.location.reload();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className={`w-full md:max-w-[380px] border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-white dark:bg-zinc-900 z-20 ${className}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 ring-2 ring-zinc-100 dark:ring-zinc-800">
            <img src={profile?.photoURL} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">{profile?.displayName}</h3>
            <span className="text-[10px] text-[#2481cc] dark:text-[#2fa5e4] font-bold uppercase tracking-widest">Active</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onDarkModeToggle} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-zinc-500 dark:text-zinc-400">
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-zinc-600 dark:text-zinc-300"
              title="Menyu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showAddMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-12 right-0 w-52 bg-white dark:bg-[#17212b] shadow-2xl rounded-2xl p-2 border border-zinc-100 dark:border-zinc-800 z-50 overflow-hidden"
                >
                  <button onClick={() => {
                    const name = prompt('Guruh nomini kiriting:');
                    if (name) onCreateRoom('group', name);
                    setShowAddMenu(false);
                  }} className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors">
                    <Users className="w-4 h-4 text-blue-500" /> Guruh yaratish
                  </button>
                  <button onClick={() => {
                    const name = prompt('Kanal nomini kiriting:');
                    if (name) onCreateRoom('channel', name);
                    setShowAddMenu(false);
                  }} className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-[#101921] rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors">
                    <Radio className="w-4 h-4 text-purple-500" /> Kanal ochish
                  </button>
                  <button onClick={() => {
                    setShowSettings(true);
                    setShowAddMenu(false);
                  }} className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-[#101921] rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors">
                    <Settings className="w-4 h-4 text-teal-500" /> Sozlamalar
                  </button>
                  <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 transition-colors">
                    <LogOut className="w-4 h-4" /> Chiqish
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-white dark:bg-zinc-900">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#2481cc] dark:group-focus-within:text-[#2fa5e4] transition-colors" />
          <input 
            type="text" 
            placeholder="Ism yoki username qidirish..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-2xl outline-none border border-transparent focus:border-[#2481cc]/30 dark:focus:border-[#2fa5e4]/30 focus:bg-white dark:focus:bg-zinc-950 transition-all text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-[#7995b0]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3 h-3 border-2 border-[#2481cc] dark:border-[#2fa5e4] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900">
        {/* Global Users Search Results */}
        {foundUsers.length > 0 && (
          <div className="mb-4">
            <div className="px-5 py-2 text-[10px] uppercase font-bold text-[#2481cc] dark:text-[#2fa5e4] tracking-widest bg-zinc-50 dark:bg-zinc-800/50">
              {search ? 'Global qidiruv natijalari' : 'Global kontaktlar'}
            </div>
            {foundUsers.map(user => (
              <div 
                key={user.uid}
                onClick={() => {
                  onCreateRoom('direct', user.displayName, user.uid);
                  setSearch('');
                }}
                className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shadow-sm">
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-950 dark:text-white truncate">{user.displayName}</h4>
                  <p className="text-[10px] text-[#2481cc] dark:text-[#2fa5e4] font-bold">@{user.username}</p>
                </div>
                <UserPlus className="w-4 h-4 text-zinc-400" />
              </div>
            ))}
          </div>
        )}

        {/* Room List */}
        <div>
          <div className="px-5 py-2 text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Xabarlar</div>
          {filteredRooms.map(room => (
            <div 
              key={room.id}
              onClick={() => onRoomSelect(room)}
              className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all ${activeRoomId === room.id ? 'bg-blue-50/80 dark:bg-blue-900/10 border-l-4 border-[#2481cc] px-[16px!important]' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l-4 border-transparent'}`}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm relative shrink-0">
                <img 
                  src={room.image || `https://api.dicebear.com/7.x/initials/svg?seed=${room.name}`} 
                  alt={room.name} 
                  className="w-full h-full object-cover" 
                />
                {room.type === 'direct' && (
                   <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#2481cc] border-2 border-white dark:border-zinc-900 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h4 className="text-sm font-bold dark:text-white truncate">{room.name}</h4>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {room.lastMessageTime?.toDate ? room.lastMessageTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5 font-medium">
                  {room.type === 'channel' && <Radio className="w-3 h-3 text-purple-400 shrink-0" />}
                  {room.type === 'group' && <Users className="w-3 h-3 text-blue-400 shrink-0" />}
                  {room.lastMessage}
                </p>
              </div>
            </div>
          ))}
          {filteredRooms.length === 0 && foundUsers.length === 0 && (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100 dark:border-zinc-700">
                <Search className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-zinc-400 dark:text-[#7995b0] text-sm font-medium">Suhbatlar topilmadi</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSettings && profile && (
          <SettingsDrawer profile={profile} onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
