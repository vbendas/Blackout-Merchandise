import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
function deriveKey(passphrase, salt) {
    return scryptSync(passphrase, salt, KEY_LENGTH);
}
export function encrypt(plaintext, passphrase) {
    const salt = randomBytes(32);
    const key = deriveKey(passphrase, salt);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    // Format: salt(32) + iv(16) + authTag(16) + encrypted(rest)
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
}
export function decrypt(ciphertext, passphrase) {
    const combined = Buffer.from(ciphertext, 'base64');
    const salt = combined.subarray(0, 32);
    const iv = combined.subarray(32, 32 + IV_LENGTH);
    const authTag = combined.subarray(32 + IV_LENGTH, 32 + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(32 + IV_LENGTH + AUTH_TAG_LENGTH);
    const key = deriveKey(passphrase, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}
