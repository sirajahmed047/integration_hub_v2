import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), '..', 'api', 'data-store', 'templates');

export async function GET() {
  try {
    // Create templates directory if it doesn't exist
    await readdir(TEMPLATES_DIR).catch(() => []);

    // Get list of template files
    const files = await readdir(TEMPLATES_DIR).catch(() => []);
    
    // Read all template files
    const fileTemplates = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          try {
            const content = await readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            console.error(`Failed to read template file ${file}:`, error);
            return null;
          }
        })
    );

    // Add default templates
    const defaultTemplates = [{
      name: 'Account_Setup_and_Data_Load_PM-C_template',
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
    }];

    // Combine file templates and default templates
    const allTemplates = [
      ...defaultTemplates,
      ...fileTemplates.filter(Boolean)
    ];
    
    return NextResponse.json({ 
      success: true, 
      templates: allTemplates
    });
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch templates' 
      },
      { status: 500 }
    );
  }
} 