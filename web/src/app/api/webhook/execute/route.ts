import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, enviziConfig } = body;

    if (!enviziConfig?.endpoint || !enviziConfig?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required Envizi configuration' },
        { status: 400 }
      );
    }

    // Send data to backend for Excel generation and S3 upload
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/webhook/generate-and-upload`,
      {
        data,
        enviziConfig,
        template: enviziConfig.template || 'Account_Setup_and_Data_Load_PM-C_template'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Data processed and uploaded to S3 successfully',
      fileDetails: response.data
    });

  } catch (error) {
    console.error('Error processing data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process and upload data' 
      },
      { status: 500 }
    );
  }
} 