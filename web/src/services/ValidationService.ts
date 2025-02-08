import { EnviziTemplate, EnviziField, TemplateMapping, WebhookConfig } from '../types/webhook';

export class ValidationService {
  validateWebhookConfig(config: WebhookConfig): string[] {
    const errors: string[] = [];
    
    if (!config.endpoint) errors.push('Webhook endpoint URL is required');
    if (!config.envizi_template) errors.push('Envizi template is required');
    if (!config.name) errors.push('Webhook name is required');
    
    // Validate Envizi configuration if provided
    if (config.envizi) {
      if (!config.envizi.endpoint) errors.push('Envizi endpoint is required');
      if (!config.envizi.organizationId) errors.push('Envizi organization ID is required');
    }

    return errors;
  }

  validateMapping(mapping: TemplateMapping, template: EnviziTemplate, data: any): string[] {
    const errors: string[] = [];
    const field = template.fields.find(f => f.name === mapping.enviziField);
    
    if (!field) {
      errors.push(`Field ${mapping.enviziField} not found in template`);
      return errors;
    }

    // Check required fields
    if (field.required && !mapping.sourcePath && !mapping.manualValue) {
      errors.push(`${field.name} is required but no source field or manual value is mapped`);
    }

    // Validate value if available
    const value = mapping.manualValue || this.extractValueFromPath(data, mapping.sourcePath);
    if (value !== undefined && value !== null) {
      errors.push(...this.validateFieldValue(value, field));
    }

    return errors;
  }

  validateTransformedData(data: any[], template: EnviziTemplate): string[] {
    const errors: string[] = [];
    
    data.forEach((record, index) => {
      template.fields.forEach(field => {
        const value = record[field.name];
        if (field.required && (value === undefined || value === null)) {
          errors.push(`Record ${index + 1}: ${field.name} is required but missing`);
        } else if (value !== undefined && value !== null) {
          const fieldErrors = this.validateFieldValue(value, field);
          fieldErrors.forEach(error => {
            errors.push(`Record ${index + 1}: ${error}`);
          });
        }
      });
    });

    return errors;
  }

  private validateFieldValue(value: any, field: EnviziField): string[] {
    const errors: string[] = [];
    
    switch (field.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`${field.name} must be a number`);
        } else if (field.validation) {
          const num = Number(value);
          if (field.validation.min !== undefined && num < field.validation.min) {
            errors.push(`${field.name} must be greater than or equal to ${field.validation.min}`);
          }
          if (field.validation.max !== undefined && num > field.validation.max) {
            errors.push(`${field.name} must be less than or equal to ${field.validation.max}`);
          }
        }
        break;
        
      case 'date':
        if (isNaN(Date.parse(String(value)))) {
          errors.push(`${field.name} must be a valid date`);
        }
        break;
        
      case 'string':
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(String(value))) {
            errors.push(`${field.name} does not match required pattern`);
          }
        }
        break;
    }

    return errors;
  }

  private extractValueFromPath(data: any, path?: string): any {
    if (!path) return undefined;
    return path.split('.').reduce((obj, key) => obj?.[key], data);
  }
} 