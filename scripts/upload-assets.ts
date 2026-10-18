
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Verify keys exist
if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Missing Cloudinary credentials in .env.local');
    process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Debug log (masked)
console.log('Using Cloudinary Config:', {
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: '...' + process.env.CLOUDINARY_API_KEY?.slice(-4),
    api_secret: '...' + process.env.CLOUDINARY_API_SECRET?.slice(-4),
});

const ASSETS_DIR = path.resolve(__dirname, '../Assets');
const CHARACTERS = ['Leopoldo', 'Francisca', 'Antônia'];

async function uploadAssets() {
    console.log('🚀 Starting asset upload with optimization (4K WebP - Base64 Upload)...');

    for (const character of CHARACTERS) {
        const charDir = path.join(ASSETS_DIR, character);

        // Check various common folder names for the high-res source
        let sourceDir = path.join(charDir, '8k No bg');
        try {
            await fs.access(sourceDir);
        } catch {
            // Fallback
            sourceDir = path.join(charDir, '8k');
            try {
                await fs.access(sourceDir);
                console.warn(`⚠️ "8k No bg" not found for ${character}, using "8k" instead.`);
            } catch {
                console.error(`❌ No 8k source folder found for ${character}`);
                continue;
            }
        }

        console.log(`\n📂 Processing ${character} from ${sourceDir}...`);

        const files = await fs.readdir(sourceDir);
        const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));

        for (const file of pngFiles) {
            const filePath = path.join(sourceDir, file);
            // Clean filename for ID: "1. Neutral.png" -> "neutral"
            const cleanName = file.replace(/^\d+\.\s*/, '').replace(/\.png$/i, '').toLowerCase().replace(/\s+/g, '_');
            const publicId = `blackout-merchandise/avatars/${character.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}/${cleanName}`;

            console.log(`   Processing: ${file} -> ${publicId}`);

            try {
                // 1. Optimize locally with sharp
                const optimizedBuffer = await sharp(filePath)
                    .resize({ width: 4096, height: 4096, fit: 'inside' })
                    .webp({ quality: 90, nearLossless: true })
                    .toBuffer();

                // Convert buffer to base64 data URI
                const base64Data = `data:image/webp;base64,${optimizedBuffer.toString('base64')}`;

                // 2. Upload using uploader.upload (Standard API)
                await cloudinary.uploader.upload(base64Data, {
                    public_id: publicId,
                    overwrite: true,
                    resource_type: 'image',
                    format: 'webp',
                });

                console.log(`   ✅ Uploaded: ${publicId}`);
            } catch (error) {
                console.error(`   ❌ Failed to upload ${file}:`, error);

                // If specific cloudinary error, log details
                if (typeof error === 'object' && error !== null && 'message' in error) {
                    //@ts-ignore
                    console.error('      Cloudinary Error:', error.message);
                }
            }
        }
    }

    console.log('\n✨ Asset upload complete!');
}

uploadAssets().catch(console.error);
