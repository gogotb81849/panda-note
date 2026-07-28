import { ref } from 'vue';
import { createModuleLogger } from './useDebugLogger';

const logger = createModuleLogger('Encryption');

const ENCRYPTION_KEY_NAME = 'panda_encryption_key';

export function useEncryption() {
  const isSupported = ref(true);

  async function generateKey(): Promise<CryptoKey | null> {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        isSupported.value = false;
        logger.warn('Web Crypto API not supported');
        return null;
      }

      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const exported = await window.crypto.subtle.exportKey('raw', key);
      const base64Key = btoa(String.fromCharCode(...new Uint8Array(exported)));

      try {
        localStorage.setItem(ENCRYPTION_KEY_NAME, base64Key);
      } catch {
        logger.warn('Failed to store encryption key in localStorage');
      }

      logger.info('Encryption key generated');
      return key;
    } catch (error) {
      logger.error('Failed to generate encryption key', error);
      isSupported.value = false;
      return null;
    }
  }

  async function getKey(): Promise<CryptoKey | null> {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        isSupported.value = false;
        return null;
      }

      const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);
      if (!storedKey) {
        return await generateKey();
      }

      const rawKey = new Uint8Array(
        atob(storedKey).split('').map(c => c.charCodeAt(0))
      );

      const key = await window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      return key;
    } catch (error) {
      logger.error('Failed to get encryption key', error);
      return await generateKey();
    }
  }

  async function encrypt(data: string): Promise<string | null> {
    try {
      const key = await getKey();
      if (!key) return null;

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);

      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      const ivBase64 = btoa(String.fromCharCode(...iv));
      const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

      return `${ivBase64}:${ciphertextBase64}`;
    } catch (error) {
      logger.error('Encryption failed', error);
      return null;
    }
  }

  async function decrypt(encryptedData: string): Promise<string | null> {
    try {
      const key = await getKey();
      if (!key) return null;

      const [ivBase64, ciphertextBase64] = encryptedData.split(':');
      if (!ivBase64 || !ciphertextBase64) {
        logger.warn('Invalid encrypted data format');
        return null;
      }

      const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
      const ciphertext = new Uint8Array(atob(ciphertextBase64).split('').map(c => c.charCodeAt(0)));

      const decodedData = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decodedData);
    } catch (error) {
      logger.error('Decryption failed', error);
      return null;
    }
  }

  async function encryptObject(obj: Record<string, any>): Promise<string | null> {
    const json = JSON.stringify(obj);
    return await encrypt(json);
  }

  async function decryptObject(encryptedData: string): Promise<Record<string, any> | null> {
    const json = await decrypt(encryptedData);
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      logger.warn('Failed to parse decrypted JSON');
      return null;
    }
  }

  function hasKey(): boolean {
    return !!localStorage.getItem(ENCRYPTION_KEY_NAME);
  }

  function clearKey(): void {
    localStorage.removeItem(ENCRYPTION_KEY_NAME);
    logger.info('Encryption key cleared');
  }

  return {
    isSupported,
    encrypt,
    decrypt,
    encryptObject,
    decryptObject,
    hasKey,
    clearKey,
    generateKey,
  };
}
