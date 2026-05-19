import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { encrypt, decrypt } from './encryption';

export interface MerchStationConfig {
  databaseUrl: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  typesenseApiKey: string;
  appServerUrl: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'merchstation');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.enc');
const LEGACY_FILE = path.join(CONFIG_DIR, 'config.json'); // for migration

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE) || fs.existsSync(LEGACY_FILE);
}

export async function saveConfig(config: MerchStationConfig, passphrase: string): Promise<void> {
  ensureConfigDir();
  const json = JSON.stringify(config);
  const encrypted = await encrypt(json, passphrase);
  fs.writeFileSync(CONFIG_FILE, encrypted, { encoding: 'utf8', mode: 0o600 });

  // Remove legacy unencrypted file if it exists
  if (fs.existsSync(LEGACY_FILE)) {
    fs.unlinkSync(LEGACY_FILE);
  }
}

export async function loadConfig(passphrase: string): Promise<MerchStationConfig> {
  if (!configExists()) {
    throw new Error('No configuration file found. Run setup first.');
  }

  const encrypted = fs.readFileSync(CONFIG_FILE, 'utf8');
  const json = await decrypt(encrypted, passphrase);
  return JSON.parse(json) as MerchStationConfig;
}
