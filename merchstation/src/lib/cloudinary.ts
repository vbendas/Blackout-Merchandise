import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
}

export function configureCloudinary(cloudName: string, apiKey: string, apiSecret: string): void {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function uploadImage(
  filePath: string,
  folder: string = 'merch-from/products'
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    use_filename: true,
    unique_filename: true,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
  return {
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

export function scanForImages(dirPath: string): string[] {
  const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const expanded = dirPath.replace('~', process.env.HOME || '');

  if (!fs.existsSync(expanded)) return [];

  return fs.readdirSync(expanded)
    .filter(f => extensions.some(ext => f.toLowerCase().endsWith(ext)))
    .map(f => path.join(expanded, f));
}
