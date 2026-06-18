import CryptoJS from 'crypto-js';

// In a real app, you'd use a per-chat or per-user key
// For this prototype, we'll use a consistent derived key approach
const MASTER_SECRET = 'whatsapp-clone-secret-key-2024';

export function encryptMessage(text: string): string {
  try {
    return CryptoJS.AES.encrypt(text, MASTER_SECRET).toString();
  } catch (e) {
    console.error('Encryption failed', e);
    return text;
  }
}

export function decryptMessage(cipherText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, MASTER_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Decryption failed', e);
    return '[Decryption Error]';
  }
}
