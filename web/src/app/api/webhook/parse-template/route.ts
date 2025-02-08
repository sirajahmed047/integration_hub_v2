import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';

const TEMPLATES_DIR = path.join(process.cwd(), '..', 'api', 'data-store', 'templates');

export async function POST(request: Request) {
  try {
    // Ensure templates directory exists
    await mkdir(TEMPLATES_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read and parse Excel file
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(bytes), {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });

    if (!workbook.SheetNames.length) {
      throw new Error('Excel file is empty');
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    if (!rows.length) {
      throw new Error('No data found in template');
    }

    // Extract headers from first row
    const headers = rows[0];
    if (!Array.isArray(headers) || !headers.length) {
      throw new Error('Template must have header row with field names');
    }

    // Create template object
    const templateName = file.name.split('.')[0];
    const fields = headers.map(fieldName => ({
      name: fieldName,
      type: determineFieldType(fieldName),
      required: false
    }));

    const template = {
      name: templateName,
      fields,
      version: '1.0',
      description: `Template parsed from ${file.name}`
    };

    // Save template to file system
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.json`);
    await writeFile(templatePath, JSON.stringify(template, null, 2));

    return NextResponse.json({
      success: true,
      templateName,
      fields
    });
  } catch (error) {
    console.error('Template upload failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to parse template' 
      },
      { status: 500 }
    );
  }
}

function determineFieldType(fieldName: string): 'string' | 'number' | 'date' {
  const name = fieldName.toLowerCase();
  if (name.includes('date') || name.includes('time')) return 'date';
  if (name.includes('amount') || name.includes('quantity') || name.includes('number')) return 'number';
  return 'string';
} 