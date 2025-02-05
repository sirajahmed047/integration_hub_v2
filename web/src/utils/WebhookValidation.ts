import { WebhookConfig, TemplateMapping, ENVIZI_TEMPLATES } from '../types/webhook';

export class WebhookValidation {
  static validateConfig(config: WebhookConfig): string[] {
    const errors: string[] = [];

    // Basic validation
    if (!config.name?.trim()) {
      errors.push('Webhook name is required');
    }
    if (!config.endpoint?.trim()) {
      errors.push('Endpoint URL is required');
    }
    if (!config.envizi_template) {
      errors.push('Envizi template is required');
    }

    // Validate mappings
    const template = ENVIZI_TEMPLATES[config.envizi_template];
    if (template) {
      template.fields
        .filter(field => field.required)
        .forEach(field => {
          const hasMapping = config.mapping.some(
            m => m.enviziField === field.name && m.sourcePath
          );
          if (!hasMapping) {
            errors.push(`Required field "${field.name}" is not mapped`);
          }
        });
    }

    // Validate scheduler if enabled
    if (config.scheduler?.enabled) {
      if (!config.scheduler.interval || config.scheduler.interval < 5) {
        errors.push('Scheduler interval must be at least 5 minutes');
      }
    }

    return errors;
  }

  static validateTransformation(value: any, mapping: TemplateMapping): string[] {
    const errors: string[] = [];
    
    if (!mapping.transformation) return errors;

    switch (mapping.transformation.type) {
      case 'date':
        if (isNaN(Date.parse(String(value)))) {
          errors.push(`Invalid date format for field "${mapping.enviziField}"`);
        }
        break;
      
      case 'math':
        if (isNaN(Number(value))) {
          errors.push(`Invalid number format for field "${mapping.enviziField}"`);
        }
        break;
    }

    return errors;
  }
} 