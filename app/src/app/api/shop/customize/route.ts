import { auth } from '@clerk/nextjs/server';
import { db } from '@db-root/index';
import { artistStores, shopCustomizations } from '@db-root/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

interface CustomizationInput {
  sliderImages?: string[];
  backgroundColor?: string;
  textColor?: string;
  aboutText?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    x?: string;
    threads?: string;
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
  };
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user's store
    const store = await db.select().from(artistStores).where(eq(artistStores.artistId, userId)).limit(1);

    if (!store.length) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const storeData = store[0];

    // Fetch customization
    const customization = await db
      .select()
      .from(shopCustomizations)
      .where(eq(shopCustomizations.storeId, storeData.id))
      .limit(1);

    if (!customization.length) {
      // Return default values if no customization exists
      return NextResponse.json({
        storeId: storeData.id,
        sliderImages: [],
        backgroundColor: '#0A0A0A',
        textColor: '#FFFFFF',
        aboutText: '',
        socialLinks: {},
      });
    }

    return NextResponse.json(customization[0]);
  } catch (error) {
    console.error('Error fetching customization:', error);
    return NextResponse.json({ error: 'Failed to fetch customization' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user's store
    const store = await db.select().from(artistStores).where(eq(artistStores.artistId, userId)).limit(1);

    if (!store.length) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const storeData = store[0];
    const body: CustomizationInput = await request.json();

    // Validate slider images count
    if (body.sliderImages && body.sliderImages.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 slider images allowed' }, { status: 400 });
    }

    // Validate about text length
    if (body.aboutText && body.aboutText.length > 1000) {
      return NextResponse.json({ error: 'About text must be 1000 characters or less' }, { status: 400 });
    }

    // Validate background color
    const validBgColors = ['#000000', '#0A0A0A', '#121212', '#1A1A1A', '#0F172A'];
    if (body.backgroundColor && !validBgColors.includes(body.backgroundColor)) {
      return NextResponse.json({ error: 'Invalid background color' }, { status: 400 });
    }

    // Validate text color
    const validTextColors = ['#FFFFFF', '#F5F5F5', '#E5E5E5', '#D4D4D4'];
    if (body.textColor && !validTextColors.includes(body.textColor)) {
      return NextResponse.json({ error: 'Invalid text color' }, { status: 400 });
    }

    // Check if customization exists
    const existing = await db
      .select()
      .from(shopCustomizations)
      .where(eq(shopCustomizations.storeId, storeData.id))
      .limit(1);

    let result: any;

    if (existing.length) {
      // Update existing customization
      const [updated] = await db
        .update(shopCustomizations)
        .set({
          sliderImages: body.sliderImages ?? existing[0].sliderImages,
          backgroundColor: body.backgroundColor ?? existing[0].backgroundColor,
          textColor: body.textColor ?? existing[0].textColor,
          aboutText: body.aboutText ?? existing[0].aboutText,
          socialLinks: body.socialLinks ?? existing[0].socialLinks,
          updatedAt: new Date(),
        })
        .where(eq(shopCustomizations.storeId, storeData.id))
        .returning();

      result = updated;
    } else {
      // Create new customization
      const [created] = await db
        .insert(shopCustomizations)
        .values({
          storeId: storeData.id,
          sliderImages: body.sliderImages ?? [],
          backgroundColor: body.backgroundColor ?? '#0A0A0A',
          textColor: body.textColor ?? '#FFFFFF',
          aboutText: body.aboutText ?? '',
          socialLinks: body.socialLinks ?? {},
        })
        .returning();

      result = created;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating customization:', error);
    return NextResponse.json({ error: 'Failed to update customization' }, { status: 500 });
  }
}
