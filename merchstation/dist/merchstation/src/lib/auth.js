import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const AUTH_DIR = path.join(os.homedir(), '.config', 'merchstation');
const HASH_FILE = path.join(AUTH_DIR, 'auth.hash');
function ensureAuthDir() {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
}
export function hasPassphrase() {
    return fs.existsSync(HASH_FILE);
}
export async function setPassphrase(passphrase) {
    ensureAuthDir();
    const hash = await argon2.hash(passphrase, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 4,
    });
    fs.writeFileSync(HASH_FILE, hash, 'utf8');
}
export async function verifyPassphrase(passphrase) {
    if (!hasPassphrase())
        return false;
    const hash = fs.readFileSync(HASH_FILE, 'utf8');
    try {
        return await argon2.verify(hash, passphrase);
    }
    catch {
        return false;
    }
}
