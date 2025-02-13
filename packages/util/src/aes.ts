import aesjs from 'aes-js';

// This default signing key is built into iD and can be used to mask/unmask sensitive values.
const DEFAULT_128 = [250, 157, 60, 79, 142, 134, 229, 129, 138, 126, 210, 129, 29, 71, 160, 208];

/** Performs AES encryption on provided text using provided key
 * @description See https://github.com/ricmoo/aes-js
 * Possible keys lengths are: 128 bits (16 bytes), 192 bits (24 bytes) or 256 bits (32 bytes).
 * To generate a random key:  window.crypto.getRandomValues(new Uint8Array(16));
 * @param text
 * @param key default: `DEFAULT_128`
 * @returns Encrypted text
 */
export function utilAesEncrypt(text, key) {
  key = key || DEFAULT_128;
  const textBytes = aesjs.utils.utf8.toBytes(text);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key);
  const encryptedBytes = aesCtr.encrypt(textBytes);
  const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
  return encryptedHex;
}

/** Performs AES decryption on provided encrypted text using provided key
 * @description See https://github.com/ricmoo/aes-js
 * Possible keys lengths are: 128 bits (16 bytes), 192 bits (24 bytes) or 256 bits (32 bytes).
 * To generate a random key:  window.crypto.getRandomValues(new Uint8Array(16));
 * @param encryptedHex
 * @param key default: `DEFAULT_128`
 * @returns Descrypted text
 */
export function utilAesDecrypt(encryptedHex, key) {
  key = key || DEFAULT_128;
  const encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key);
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);
  const text = aesjs.utils.utf8.fromBytes(decryptedBytes);
  return text;
}
