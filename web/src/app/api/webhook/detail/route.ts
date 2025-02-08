import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    const rootDir = path.join(process.cwd(), '..');
    const filePath = path.join(rootDir, 'api', 'data-store', 'webhook', `webhook-${id}.json`);
    
    const jsonData = await fs.readFile(filePath, 'utf8');
    const webhookData = JSON.parse(jsonData);
    
    return NextResponse.json({
      data: webhookData,
      msg: "Successfully fetched webhook details"
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: "Failed to fetch webhook details", details: (error as Error).message },
      { status: 500 }
    );
  }
} 