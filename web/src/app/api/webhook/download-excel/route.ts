import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, enviziConfig } = body;

    if (!enviziConfig?.template) {
      return NextResponse.json(
        { success: false, error: 'Missing template configuration' },
        { status: 400 }
      );
    }

    // Generate Excel file without uploading to S3
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/webhook/generate-excel`,
      {
        data,
        enviziConfig,
        template: enviziConfig.template || 'Account_Setup_and_Data_Load_PM-C_template'
      },
      {
        responseType: 'arraybuffer'
      }
    );

    // Return the Excel file as a downloadable response
    return new Response(response.data, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="envizi-data-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate Excel file' 
      },
      { status: 500 }
    );
  }
} 