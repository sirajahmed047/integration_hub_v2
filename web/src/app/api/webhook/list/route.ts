import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    
    // Debug logs
    console.log('API called with page:', page, 'limit:', limit);
    
    const rootDir = path.join(process.cwd(), '..');
    const filePath = path.join(rootDir, 'api', 'data-store', 'webhook', 'webhook.json');
    console.log('Reading from path:', filePath);
    
    const jsonData = await fs.readFile(filePath, 'utf8');
    console.log('Raw data:', jsonData);  // Debug log
    
    const allWebhooks = JSON.parse(jsonData);
    const sortedWebhooks = allWebhooks.sort((a: any, b: any) => b.id.localeCompare(a.id));
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWebhooks = sortedWebhooks.slice(startIndex, endIndex);
    
    const response = {
      data: paginatedWebhooks,
      total: allWebhooks.length,
      currentPage: page,
      totalPages: Math.ceil(allWebhooks.length / limit),
      msg: "Successfully fetched webhooks"
    };
    
    console.log('Sending response:', response);  // Debug log
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks", details: (error as Error).message },
      { status: 500 }
    );
  }
} 