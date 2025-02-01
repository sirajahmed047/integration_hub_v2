import { TemplateMapping, ENVIZI_TEMPLATES } from '../types/webhook';
import { EnviziTemplateType } from '../types/webhook';

export function validateTransformedData(
  data: any[], 
  mappings: TemplateMapping[],
  templateType: EnviziTemplateType
) {
  const errors: string[] = [];
  const template = ENVIZI_TEMPLATES[templateType];
  
  data.forEach((record, index) => {
    template.fields.forEach(field => {
      const value = record[field.name];
      
      // Check required fields
      if (field.required && !value) {
        errors.push(`Record ${index + 1}: Missing required field "${field.name}"`);
        return;
      }
      
      // Type validation
      if (value) {
        switch (field.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Record ${index + 1}: "${field.name}" must be a number`);
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors.push(`Record ${index + 1}: "${field.name}" must be a valid date`);
            }
            break;
        }
      }
    });
  });
  
  return errors;
} 