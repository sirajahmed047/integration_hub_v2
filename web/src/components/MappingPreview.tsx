import React, { useState } from 'react';
import { 
  Table, 
  TableHead, 
  TableRow, 
  TableHeader, 
  TableBody, 
  TableCell,
  Select,
  SelectItem,
  Button,
  Tag
} from '@carbon/react';
import { 
  TemplateMapping, 
  EnviziField
} from '../types/webhook';

interface MappingPreviewProps {
  mappings: TemplateMapping[];
  availableFields: string[];
  templateFields: EnviziField[];
  rawData: any[];
  onMappingChange: (newMappings: TemplateMapping[]) => void;
  onApply: () => void;
}

export function MappingPreview({ 
  mappings, 
  availableFields,
  templateFields,
  rawData,
  onMappingChange,
  onApply 
}: MappingPreviewProps) {
  const [editedMappings, setEditedMappings] = useState(mappings);

  const handleFieldChange = (index: number, sourcePath: string) => {
    const newMappings = [...editedMappings];
    newMappings[index] = {
      ...newMappings[index],
      sourcePath,
      confidence: 1 // User-selected mapping has full confidence
    };
    setEditedMappings(newMappings);
    onMappingChange(newMappings);
  };

  const getConfidenceTag = (confidence: number) => {
    if (confidence >= 0.8) return <Tag type="green">High</Tag>;
    if (confidence >= 0.6) return <Tag type="cyan">Medium</Tag>;
    return <Tag type="red">Low</Tag>;
  };

  return (
    <div className="mapping-preview">
      <h3>Field Mapping Preview</h3>
      <p>Review and adjust the suggested field mappings below</p>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Template Field</TableHeader>
            <TableHeader>Webhook Field</TableHeader>
            <TableHeader>Sample Data</TableHeader>
            <TableHeader>Confidence</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {templateFields.map(field => {
            const mapping = mappings.find(m => m.enviziField === field.name);
            const webhookValue = mapping ? rawData[0]?.[mapping.sourcePath] : null;
            
            return (
              <TableRow key={field.name}>
                <TableCell>{field.name}</TableCell>
                <TableCell>
                  <Select
                    id={`field-select-${field.name}`}
                    value={mapping?.sourcePath || ''}
                    onChange={e => handleFieldChange(mappings.findIndex(m => m.enviziField === field.name), e.target.value)}
                  >
                    {availableFields.map(f => (
                      <SelectItem key={f} value={f} text={f} />
                    ))}
                  </Select>
                </TableCell>
                <TableCell>{webhookValue || '-'}</TableCell>
                <TableCell>
                  {mapping?.confidence && getConfidenceTag(mapping.confidence)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="mapping-actions">
        <Button onClick={onApply}>
          Apply Mappings
        </Button>
      </div>
    </div>
  );
} 