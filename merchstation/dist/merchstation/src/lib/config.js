import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { encrypt, decrypt } from './encryption';
const CONFIG_DIR = path.join(os.homedir(), '.config', 'merchstation');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.enc');
const LEGACY_FILE = path.join(CONFIG_DIR, 'config.json'); // for migration
function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}
export function configExists() {
    return fs.existsSync(CONFIG_FILE) || fs.existsSync(LEGACY_FILE);
}
export function saveConfig(config, passphrase) {
    ensureConfigDir();
    const json = JSON.stringify(config);
    const encrypted = encrypt(json, passphrase);
    fs.writeFileSync(CONFIG_FILE, encrypted, 'utf8');
    // Remove legacy unencrypted file if it exists
    if (fs.existsSync(LEGACY_FILE)) {
        fs.unlinkSync(LEGACY_FILE);
    }
}
export function loadConfig(passphrase) {
    if (!configExists()) {
        throw new Error('No configuration file found. Run setup first.');
    }
    const encrypted = fs.readFileSync(CONFIG_FILE, 'utf8');
    const json = decrypt(encrypted, passphrase);
    return JSON.parse(json);
}
