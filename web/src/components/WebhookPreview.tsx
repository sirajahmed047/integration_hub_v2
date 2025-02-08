import React, { useEffect, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell
} from '@carbon/react';
import { EnviziTemplate, EnviziField, TemplateMapping } from '../types/webhook';
import { TemplateService } from '../services/TemplateService';

interface WebhookPreviewProps {
  data: any[];
  mappings: TemplateMapping[];
  templateType: string;
}

export const WebhookPreview: React.FC<WebhookPreviewProps> = ({ 
  data, 
  mappings, 
  templateType 
}) => {
  const [templateFields, setTemplateFields] = useState<EnviziField[]>([]);
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

  if (!data || data.length === 0) {
    return <div>No data to preview</div>;
  }

  const headers = templateFields.map(field => ({
    key: field.name,
    header: field.name
  }));

  const rows = data.map((record, index) => ({
    id: `${index}`,
    ...templateFields.reduce((acc, field) => ({
      ...acc,
      [field.name]: record[field.name] || ''
    }), {})
  }));

  return (
    <DataTable rows={rows} headers={headers}>
      {({
        rows,
        headers,
        getHeaderProps,
        getRowProps,
        getTableProps,
      }) => (
        <Table {...getTableProps()}>
          <TableHead>
            <TableRow>
              {headers.map((header) => {
                const { key, ...rest } = getHeaderProps({ header });
                return (
                  <TableHeader key={key} {...rest}>
                    {header.header}
                  </TableHeader>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const { key, ...rest } = getRowProps({ row });
              return (
                <TableRow key={key} {...rest}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </DataTable>
  );
}; 