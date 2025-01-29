import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // For testing, return a sample config
  return NextResponse.json({
    success: true,
    data: {
      id: id,
      name: `Webhook ${id}`,
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
} 