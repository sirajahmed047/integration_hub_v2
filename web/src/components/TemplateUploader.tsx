import React from 'react';
import { FileUploader, Button } from '@carbon/react';
import * as XLSX from 'xlsx';
import { EnviziTemplate, EnviziField, EnviziFieldType } from '../types/webhook';
import { determineFieldType, extractValidation } from '../utils/templateParser';

interface TemplateUploaderProps {
  onTemplateLoad: (template: EnviziTemplate) => void;
  currentTemplate?: string;
}

interface TemplateRow {
  'Field Name': string;
  'Data Type': string;
  'Required': string;
  'Validation': string;
}

export function TemplateUploader({ onTemplateLoad }: TemplateUploaderProps) {
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = await readExcelFile(file);
      const template = parseEnviziTemplate(workbook);
      onTemplateLoad(template);
    } catch (error) {
      console.error('Template parsing failed:', error);
    }
  };

  const readExcelFile = (file: File): Promise<XLSX.WorkBook> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const parseEnviziTemplate = (workbook: XLSX.WorkBook): EnviziTemplate => {
    try {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
      
      if (!data || data.length === 0) {
        throw new Error('Empty template file');
      }

      // Get headers from first row
      const headers = data[0];
      if (!headers || !Array.isArray(headers)) {
        throw new Error('Invalid template format: missing headers');
      }

      // Create fields from headers
      const fields: EnviziField[] = headers
        .filter((header): header is string => typeof header === 'string' && header.trim() !== '')
        .map(header => ({
          name: header.trim(),
          type: 'string', // Default to string type
          required: false, // Default to not required
          validation: undefined
        }));

      if (fields.length === 0) {
        throw new Error('No valid fields found in template');
      }

      console.log('Parsed fields:', fields); // Debug log

      return {
        name: workbook.SheetNames[0],
        fields,
        version: '1.0'
      };
    } catch (error) {
      console.error('Template parsing error:', error);
      throw new Error(`Failed to parse template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="template-uploader">
      <FileUploader
        accept={['.xlsx', '.xls']}
        buttonLabel="Upload Template"
        filenameStatus="edit"
        labelDescription="Only Excel files (.xlsx, .xls) are supported"
        onChange={handleFileUpload}
      />
    </div>
  );
} 