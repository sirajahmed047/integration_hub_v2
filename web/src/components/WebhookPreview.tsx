import React, { useEffect, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TextInput,
  Button,
  ButtonSet
} from '@carbon/react';
import { Download } from '@carbon/icons-react';
import { EnviziTemplate, EnviziField, TemplateMapping } from '../types/webhook';
import { TemplateService } from '../services/TemplateService';
import { toast } from 'react-hot-toast';

interface WebhookPreviewProps {
  data: any[];
  mappings: TemplateMapping[];
  templateType: string;
  onDataChange?: (newData: any[]) => void;
  enviziConfig?: any;
  onSendToEnvizi?: () => void;
}

export const WebhookPreview: React.FC<WebhookPreviewProps> = ({ 
  data, 
  mappings, 
  templateType,
  onDataChange,
  enviziConfig,
  onSendToEnvizi 
}) => {
  const [templateFields, setTemplateFields] = useState<EnviziField[]>([]);
  const [editableData, setEditableData] = useState<any[]>(data);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const templateService = new TemplateService(process.env.NEXT_PUBLIC_API_URL || '');

  useEffect(() => {
    const loadTemplate = async () => {
      if (templateType) {
        const template = await templateService.getTemplate(templateType);
        if (template) {
          setTemplateFields(template.fields);
        }
      }
    };
    loadTemplate();
  }, [templateType]);

  useEffect(() => {
    setEditableData(data);
  }, [data]);

  const handleDownloadExcel = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch('/api/webhook/download-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: editableData,
          enviziConfig: {
            ...enviziConfig,
            template: templateType
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate Excel file');
      }

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `envizi-data-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download Excel file');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendToEnvizi = async () => {
    try {
      setIsSending(true);
      const response = await fetch('/api/webhook/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: editableData,
          enviziConfig: {
            ...enviziConfig,
            template: templateType
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file to S3');
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Excel file successfully uploaded to S3');
        if (result.fileDetails?.validation_errors?.length > 0) {
          toast.error(`${result.fileDetails.validation_errors.length} validation errors found in the uploaded file`);
        }
        onSendToEnvizi?.();
      } else {
        throw new Error(result.error || 'Failed to upload file to S3');
      }
    } catch (error) {
      console.error('S3 upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file to S3');
    } finally {
      setIsSending(false);
    }
  };

  if (!editableData || editableData.length === 0) {
    return <div>No data to preview</div>;
  }

  const handleCellChange = (rowIndex: number, fieldName: string, value: string) => {
    const newData = [...editableData];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [fieldName]: value
    };
    setEditableData(newData);
    onDataChange?.(newData);
  };

  const headers = templateFields.map(field => ({
    key: field.name,
    header: field.name
  }));

  return (
    <div>
      <div className="mappedDataControls">
        <ButtonSet>
          <Button
            kind="secondary"
            onClick={handleDownloadExcel}
            renderIcon={Download}
            disabled={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download Excel'}
          </Button>
          <Button
            onClick={handleSendToEnvizi}
            kind="primary"
            disabled={isSending}
          >
            {isSending ? 'Uploading...' : 'Upload to S3'}
          </Button>
        </ButtonSet>
      </div>
      <Table>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableHeader key={header.key}>
                {header.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {editableData.map((record, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header) => (
                <TableCell key={`${rowIndex}-${header.key}`}>
                  <TextInput
                    id={`${rowIndex}-${header.key}`}
                    labelText={header.header}
                    value={record[header.key] || ''}
                    onChange={(e) => handleCellChange(rowIndex, header.key, e.target.value)}
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
}; 