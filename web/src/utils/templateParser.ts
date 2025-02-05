import { EnviziFieldType } from '../types/webhook';

export function determineFieldType(dataType: string | undefined): EnviziFieldType {
  if (!dataType) return 'string'; // Default to string if no type provided
  
  const type = dataType.toLowerCase();
  
  if (type.includes('date')) return 'date';
  if (type.includes('number') || type.includes('decimal')) return 'number';
  return 'string';
}

export function extractValidation(validationStr: string | undefined) {
  if (!validationStr) return undefined;
  
  const validation: Record<string, any> = {};
  
  try {
    if (validationStr.includes('min:')) {
      validation.min = parseInt(validationStr.match(/min:(\d+)/)?.[1] || '0');
    }
    
    if (validationStr.includes('max:')) {
      validation.max = parseInt(validationStr.match(/max:(\d+)/)?.[1] || '0');
    }
    
    if (validationStr.includes('pattern:')) {
      validation.pattern = validationStr.match(/pattern:([^;]+)/)?.[1];
    }
    
    return Object.keys(validation).length > 0 ? validation : undefined;
  } catch (error) {
    console.warn('Failed to parse validation:', error);
    return undefined;
  }
} 