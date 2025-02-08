import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const webhookDetailData = formData.get('webhook_detail_data');

    if (!webhookDetailData) {
      return NextResponse.json({
        error: 'Missing webhook configuration',
        success: false
      }, { status: 400 });
    }

    // Create new FormData for Python backend
    const pythonFormData = new FormData();
    if (file) {
      pythonFormData.append('file', file);
    }
    pythonFormData.append('webhook_detail_data', webhookDetailData);

    // Forward to Python backend
    const response = await fetch('http://localhost:3001/api/webhook/test', {
      method: 'POST',
      body: pythonFormData
    });

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in test webhook:', error);
    return NextResponse.json({
      error: 'Failed to process webhook test',
      success: false
    }, { status: 500 });
  }
} 