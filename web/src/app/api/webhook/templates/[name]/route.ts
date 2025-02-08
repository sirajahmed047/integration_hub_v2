import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), '..', 'api', 'data-store', 'templates');

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const templatePath = path.join(TEMPLATES_DIR, `${params.name}.json`);
    
    try {
      const content = await readFile(templatePath, 'utf-8');
      const template = JSON.parse(content);
      return NextResponse.json({ success: true, template });
    } catch (error) {
      // If file doesn't exist or can't be read, check for default templates
      if (params.name === 'Account_Setup_and_Data_Load_PM-C_template') {
        // Return default template structure
        const defaultTemplate = {
          name: params.name,
          fields: [
            { name: 'Organization Link', type: 'string', required: true },
            { name: 'Organization', type: 'string', required: true },
            { name: 'Location', type: 'string', required: true },
            { name: 'Location Ref', type: 'string', required: false },
            { name: 'Account Style Link', type: 'string', required: true },
            { name: 'Account Style Caption', type: 'string', required: true },
            { name: 'Account Number', type: 'string', required: true },
            { name: 'Record Start YYYY-MM-DD', type: 'date', required: true },
            { name: 'Record End YYYY-MM-DD', type: 'date', required: true },
            { name: 'Quantity', type: 'number', required: true },
            { name: 'Total Cost', type: 'number', required: false }
          ],
          version: '1.0',
          description: 'Default PM-C template'
        };
        return NextResponse.json({ success: true, template: defaultTemplate });
      }
      
      return NextResponse.json(
        { success: false, error: `Template ${params.name} not found` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to fetch template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch template' 
      },
      { status: 500 }
    );
  }
} 