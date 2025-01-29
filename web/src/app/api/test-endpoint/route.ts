import { NextResponse } from 'next/server';

export async function GET() {
  // Return sample data for testing
  return NextResponse.json({
    data: {
      value: 123.45,
      timestamp: new Date().toISOString(),
      unit: 'kWh'
    }
  });
} 