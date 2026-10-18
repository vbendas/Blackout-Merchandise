import { auth } from '@clerk/nextjs/server';
import { db } from '@db-root/index';
import { artistStores } from '@db-root/schema';
import { v2 as cloudinary } from 'cloudinary';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has a store
    const store = await db.select().from(artistStores).where(eq(artistStores.artistId, userId)).limit(1);

    if (!store.length) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 });
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary with optimized settings for hero images
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: `blackout-merchandise/shops/${store[0].slug}/slider`,
      transformation: [
        { width: 1920, height: 1080, crop: 'fill', aspect_ratio: '16:9' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
      public_id: `slide_${Date.now()}`,
    });

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
