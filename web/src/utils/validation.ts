import { TemplateMapping, ENVIZI_TEMPLATES } from '../types/webhook';
import { EnviziTemplateType, EnviziTemplate } from '../types/webhook';

// Add this helper function
function isValidDate(value: any): boolean {
  if (!value) return false;
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

export function validateTransformedData(
  data: any[], 
  mappings: TemplateMapping[],
  templateType: EnviziTemplateType
) {
  const errors: string[] = [];
  const template = ENVIZI_TEMPLATES[templateType];
  
  // Add data structure validation
  if (!Array.isArray(data)) {
    errors.push('Invalid data format: expected array');
    return errors;
  }
  
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

export function validateEnviziData(data: any[], template: EnviziTemplate) {
  const errors: string[] = [];
  
  data.forEach((record, index) => {
    template.fields.forEach(field => {
      if (field.required && !record[field.name]) {
        errors.push(`Row ${index + 1}: Missing required field ${field.name}`);
      }
      
      const value = record[field.name];
      if (value) {
        switch (field.type) {
          case 'date':
            if (!isValidDate(value)) {
              errors.push(`Row ${index + 1}: Invalid date format for ${field.name}`);
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Row ${index + 1}: Invalid number for ${field.name}`);
            }
            break;
        }
      }
    });
  });
  
  return errors;
} 