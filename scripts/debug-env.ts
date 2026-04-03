
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading .env.local from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Dotenv error:', result.error);
} else {
    console.log('Dotenv parsed keys:', Object.keys(result.parsed || {}));
}

console.log('--- Env Vars Check ---');
console.log('CLOUD_NAME:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
console.log('API_KEY length:', process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.length : 'MISSING');
console.log('API_SECRET length:', process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.length : 'MISSING');

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

console.log('--- Cloudinary Config Check ---');
console.log(cloudinary.config());
