import { Select, FormGroup, Button, TextInput } from '@carbon/react';
import { useState, useMemo, useEffect } from 'react';
import { TemplateMapping, ENVIZI_TEMPLATES } from '../types/webhook';
import { EnviziTemplateType } from '../types/webhook';
import { WebhookService } from '../services/WebhookService';

interface FieldMapperProps {
  apiData: any;
  onChange: (mappings: TemplateMapping[]) => void;
  onTransform: () => void;
  onApplyMapping: (mappings: TemplateMapping[]) => void;
  initialMappings?: TemplateMapping[];
  templateType: EnviziTemplateType;
}

export function WebhookFieldMapper({ apiData, onChange, onTransform, onApplyMapping, initialMappings, templateType }: FieldMapperProps) {
  const [templateMappings, setTemplateMappings] = useState<TemplateMapping[]>(initialMappings || []);
  
  useEffect(() => {
    if (initialMappings) {
      setTemplateMappings(initialMappings);
    }
  }, [initialMappings]);

  // Extract available paths including array notation
  const availablePaths = useMemo(() => {
    if (!apiData?.records?.[0]) return [];
    
    const paths: string[] = [];
    const extractPaths = (obj: any, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        
        if (Array.isArray(value)) {
          paths.push(`${path}[*]`); // Add array template notation
          if (value[0]) extractPaths(value[0], `${path}[*]`);
        } else if (typeof value === 'object' && value !== null) {
          extractPaths(value, path);
        } else {
          paths.push(path);
        }
      });
    };
    
    extractPaths(apiData);
    return paths;
  }, [apiData]);

  // Complete template columns based on Envizi requirements
  const templateColumns = [
    "Organization",
    "Location",
    "Account Style Caption",
    "Account Number",
    "Account Name",
    "Start Date",
    "End Date",
    "Usage Amount",
    "Usage Unit",
    "Cost Amount",
    "Cost Unit",
    "Supplier",
    "Reference",
    "Notes"
  ];

  const handleFieldChange = (enviziField: string, sourcePath: string) => {
    const newMapping: TemplateMapping = {
      enviziField,
      sourcePath,
      isArray: sourcePath.includes('[*]'),
      transformation: { type: 'direct' }
    };

    const updatedMappings = [
      ...templateMappings.filter(m => m.enviziField !== enviziField),
      newMapping
    ];
    
    setTemplateMappings(updatedMappings);
    onChange(updatedMappings);
  };

  const handleTransformationChange = (enviziField: string, type: 'direct' | 'math' | 'date' | 'text') => {
    const updatedMappings = templateMappings.map(mapping => {
      if (mapping.enviziField === enviziField) {
        return {
          ...mapping,
          transformation: { ...mapping.transformation, type }
        };
      }
      return mapping;
    });

    setTemplateMappings(updatedMappings);
    onChange(updatedMappings);
  };

  const template = ENVIZI_TEMPLATES[templateType];

  const webhookService = new WebhookService('/api');

  const previewTransformation = (value: any, transformation: TemplateMapping['transformation']) => {
    if (!value || !transformation) return value;
    
    try {
      return webhookService.applyTransformation(value, transformation);
    } catch {
      return 'Invalid transformation';
    }
  };

  return (
    <div>
      <h3>Map API Fields to Template</h3>
      {template.fields.map((field) => {
        const currentMapping = templateMappings.find(m => m.enviziField === field.name);
        
        return (
          <FormGroup 
            legendText="" 
            key={field.name}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <Select
                id={`field-${field.name}`}
                labelText={`${field.name}${field.required ? ' *' : ''}`}
                value={currentMapping?.sourcePath || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
              >
                <option value="">Select a field...</option>
                {availablePaths.map((path) => (
                  <option key={path} value={path}>{path}</option>
                ))}
              </Select>

              {currentMapping && (
                <Select
                  id={`transform-${field.name}`}
                  labelText="Transform"
                  value={currentMapping.transformation?.type || 'direct'}
                  onChange={(e) => handleTransformationChange(field.name, e.target.value as any)}
                >
                  <option value="direct">Direct</option>
                  <option value="date">Date</option>
                  <option value="math">Math</option>
                  <option value="text">Text</option>
                </Select>
              )}
            </div>
          </FormGroup>
        );
      })}
      <Button onClick={onTransform}>Apply Mappings</Button>
    </div>
  );
}

// Recursively extract field names from API response
function extractFields(obj: any, prefix = ''): string[] {
  let fields: string[] = [];
  
  for (const key in obj) {
    const value = obj[key];
    const fieldName = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      fields = [...fields, ...extractFields(value, fieldName)];
    } else {
      fields.push(fieldName);
    }
  }
  
  return fields;
} 