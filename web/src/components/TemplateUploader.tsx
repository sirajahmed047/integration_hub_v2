import React from 'react';
import { FileUploader } from '@carbon/react';
import * as XLSX from 'xlsx';
import { EnviziTemplate, EnviziField } from '../types/webhook';
import { TemplateService } from '../services/TemplateService';
import { toast } from 'react-hot-toast';

interface TemplateUploaderProps {
  onTemplateLoad: (template: EnviziTemplate) => void;
}

interface TemplateRow {
  [key: string]: string | number | boolean | null;
}

export const TemplateUploader: React.FC<TemplateUploaderProps> = ({ onTemplateLoad }) => {
  const templateService = new TemplateService();

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<TemplateRow>(firstSheet);

        if (rows.length === 0) {
          throw new Error('Template file is empty');
        }

        const sampleRow = rows[0] as TemplateRow;
        
        // Validate that we have a valid object with keys
        if (!sampleRow || typeof sampleRow !== 'object') {
          throw new Error('Invalid template format: First row must contain column headers');
        }

        const fields: EnviziField[] = Object.keys(sampleRow).map(fieldName => {
          const value = sampleRow[fieldName];
          return {
            name: fieldName,
            type: templateService.determineFieldType(fieldName, value),
            required: false,
            validation: templateService.extractValidation(undefined)
          };
        });

        if (fields.length === 0) {
          throw new Error('No fields found in template');
        }

        const template: EnviziTemplate = {
          name: file.name.split('.')[0],
          fields,
          version: '1.0',
          description: `Template parsed from ${file.name}`
        };

        onTemplateLoad(template);
        toast.success('Template loaded successfully');
      } catch (error) {
        console.error('Error parsing template:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to parse template');
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read template file');
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="template-uploader">
      <FileUploader
        accept={['.xlsx', '.csv']}
        buttonLabel="Upload template"
        filenameStatus="edit"
        iconDescription="Clear file"
        labelDescription="Only .xlsx or .csv files are accepted"
        labelTitle="Upload Template"
        multiple={false}
        onChange={handleUpload}
        size="md"
      />
    </div>
  );
}; 