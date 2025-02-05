import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TextInput } from '@carbon/react';
import { useState, useEffect } from 'react';
import { 
  TemplateMapping, 
  EnviziTemplateType, 
  ENVIZI_TEMPLATES,
  EnviziTemplate
} from '../types/webhook';

interface PreviewProps {
  data: any;  // Should be more specific
  mappings: TemplateMapping[];
  templateType: string;
  onDataChange?: (newData: any[]) => void;
}

export function WebhookPreview({ data, mappings, templateType, onDataChange }: PreviewProps) {
  const [mappedData, setMappedData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!data) return;

    // Extract records from the response
    let records: any[] = [];
    if (data.records) {
      records = data.records;
    } else if (data.webhook_execute_response?.records) {
      records = data.webhook_execute_response.records;
    } else if (Array.isArray(data)) {
      records = data;
    } else {
      records = [data];
    }

    // For raw data view, just store the records
    if (!mappings || mappings.length === 0) {
      setMappedData(records);
      return;
    }

    // For mapped view, transform the data
    const template = ENVIZI_TEMPLATES[templateType as EnviziTemplateType];
    if (!template) return;

    const transformed = records.map(record => mapFields(record, template));
    setMappedData(transformed);
    onDataChange?.(transformed);
  }, [data, mappings, templateType]);

  // If no data, show empty state
  if (!data) {
    return <div>No data available for preview</div>;
  }

  // Show raw data view
  if (!mappings || mappings.length === 0) {
    if (mappedData.length === 0) return null;
    
    const headers = Object.keys(mappedData[0]);
    return (
      <div>
        <h4>Raw Data Preview</h4>
        <Table>
          <TableHead>
            <TableRow>
              {headers.map(header => (
                <TableHeader key={header}>{header}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {mappedData.slice(0, 5).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {headers.map(header => (
                  <TableCell key={header}>
                    {String(row[header] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Get template for mapped view
  const template = ENVIZI_TEMPLATES[templateType as EnviziTemplateType];
  if (!template) {
    return <div>Template not found: {templateType}</div>;
  }

  // Function to handle field value changes
  const handleFieldChange = (rowIndex: number, fieldName: string, value: string) => {
    const newData = [...mappedData];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [fieldName]: value
    };
    setMappedData(newData);
    onDataChange?.(newData);
  };

  // Function to map fields from raw data to template fields
  const mapFields = (rawData: any, template: EnviziTemplate) => {
    const mapped: Record<string, any> = {};
    template.fields.forEach(field => {
      // Find matching mapping for this field
      const mapping = mappings.find(m => m.enviziField === field.name);
      if (mapping) {
        // Get value using sourcePath
        let value = mapping.sourcePath.split('.').reduce((obj, key) => obj?.[key], rawData);
        
        // Apply transformation if specified
        if (mapping.transformation) {
          switch (mapping.transformation.type) {
            case 'date':
              value = new Date(value).toISOString();
              break;
            case 'math':
              value = Number(value);
              break;
            case 'text':
              value = String(value);
              break;
            case 'direct':
            default:
              break;
          }
        }
        mapped[field.name] = value || '';
      } else {
        mapped[field.name] = '';
      }
    });
    return mapped;
  };

  // Render mapped data view
  return (
    <div className="webhook-preview">
      <h3>Data Preview</h3>
      <div className="template-info">
        <p>Template: {templateType}</p>
        <p>Records: {mappedData.length}</p>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            {template.fields.map((field: any) => (
              <TableHeader key={field.name}>
                {field.name}
                {field.required && <span className="required">*</span>}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {mappedData.slice(0, 5).map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {template.fields.map((field: any) => (
                <TableCell key={field.name}>
                  <TextInput
                    id={`${rowIndex}-${field.name}`}
                    labelText={field.name}
                    value={row[field.name] || ''}
                    onChange={(e) => handleFieldChange(rowIndex, field.name, e.target.value)}
                    size="sm"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 