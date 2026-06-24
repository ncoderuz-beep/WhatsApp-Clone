/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoomType = 'direct' | 'group' | 'channel';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  status?: string;
  lastSeen?: any;
  createdAt?: any;
  bannerImage?: string;
  hideOnline?: boolean;
  bio?: string;
  phoneNumber?: string;
}

export interface ChatRoom {
  id: string;
  type: RoomType;
  name?: string;
  image?: string;
  description?: string;
  participants: string[];
  admins: string[];
  createdBy: string;
  createdAt: any;
  lastMessage?: string;
  lastMessageTime?: any;
}

export interface MessageReaction {
  [emoji: string]: string[]; // list of user uids
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string; // Encrypted
  timestamp: any;
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions?: MessageReaction;
  fileURL?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
}
