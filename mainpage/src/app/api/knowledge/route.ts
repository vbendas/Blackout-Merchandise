import { NextResponse } from 'next/server';
import { getAllSettings, updateSetting, clearKnowledgeCache } from '@db-root/knowledge';

export async function GET() {
  try {
    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[Knowledge API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value, valueJson } = body;

    if (!key || !value) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    await updateSetting(key, value, valueJson);
    clearKnowledgeCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Knowledge API] POST error:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
