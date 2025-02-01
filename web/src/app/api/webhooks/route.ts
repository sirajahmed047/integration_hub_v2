import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // For testing, just return the received config
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook config received',
      data: body 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // For testing, return a sample config
    return NextResponse.json({
      success: true,
      data: {
        id: 'test-webhook',
        name: 'Test Webhook',
        endpoint: 'https://api.example.com/data',
        method: 'GET',
        headers: {},
        envizi: {
          apiKey: '',
          endpoint: '',
          organizationId: ''
        },
        mapping: []
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch webhook config' },
      { status: 500 }
    );
  }
} 