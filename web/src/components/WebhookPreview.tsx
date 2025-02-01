import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';
import { TemplateMapping } from '../types/webhook';
import { EnviziTemplateType, ENVIZI_TEMPLATES } from '../types/webhook';

interface PreviewProps {
  data: any[];
  mappings: TemplateMapping[];
  templateType: EnviziTemplateType;
}

export function WebhookPreview({ data, mappings, templateType }: PreviewProps) {
  const previewData = data.slice(0, 5);
  const template = ENVIZI_TEMPLATES[templateType];
  
  const getValidationStatus = (field: typeof template.fields[0], value: any) => {
    if (field.required && !value) return 'error';
    if (!value) return 'default';
    
    switch (field.type) {
      case 'number':
        return !isNaN(Number(value)) ? 'success' : 'error';
      case 'date':
        return !isNaN(Date.parse(value)) ? 'success' : 'error';
      case 'string':
        return value ? 'success' : 'default';
      default:
        return 'success';
    }
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div>
      <h3>Data Preview</h3>
      <Table>
        <TableHead>
          <TableRow>
            {template.fields.map(field => (
              <TableHeader key={field.name}>
                {field.name}
                {field.required && ' *'}
                <div style={{ fontSize: '0.8em', color: 'gray' }}>
                  ({field.type})
                </div>
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {previewData.map((row, index) => (
            <TableRow key={index}>
              {template.fields.map(field => (
                <TableCell key={field.name}>
                  {formatCellValue(row[field.name])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 