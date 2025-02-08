import { 
  WebhookSetup, 
  ValidationResult, 
  ExecutionResult, 
  WebhookStatus,
  EnviziTemplate,
  TemplateMapping,
  WebhookError
} from '../types/webhook';
import { TemplateService } from './TemplateService';
import { MappingService } from './MappingService';
import axios from 'axios';

export class UnifiedWebhookService {
  private templateService: TemplateService;
  private mappingService: MappingService;

  constructor(private baseUrl: string = '') {
    this.templateService = new TemplateService(baseUrl);
    this.mappingService = new MappingService();
  }

  async setup(config: WebhookSetup): Promise<string> {
    try {
      // Validate basic configuration
      this.validateBasicConfig(config.basicConfig);

      // Handle template setup
      const template = await this.handleTemplateSetup(config.template);

      // Create webhook instance
      const response = await axios.post(`${this.baseUrl}/api/webhook/setup`, {
        ...config.basicConfig,
        template_name: template.name,
        envizi: config.envizi
      });

      return response.data.webhookId;
    } catch (error) {
      throw new WebhookError(
        error instanceof Error ? error.message : 'Setup failed',
        'config',
        'error',
        'Please check your configuration and try again'
      );
    }
  }

  async validate(webhookId: string): Promise<ValidationResult> {
    try {
      const [config, template] = await Promise.all([
        this.getWebhookConfig(webhookId),
        this.getWebhookTemplate(webhookId)
      ]);

      // Test webhook endpoint
      const testData = await this.testEndpoint(config.basicConfig.endpoint);

      // Validate data against template
      const mappings = await this.suggestMappings(testData, template);
      const validationResult = this.validateMappings(mappings, template);

      return validationResult;
    } catch (error) {
      throw new WebhookError(
        error instanceof Error ? error.message : 'Validation failed',
        'mapping',
        'error'
      );
    }
  }

  async execute(webhookId: string): Promise<ExecutionResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/webhook/execute/${webhookId}`);
      return response.data;
    } catch (error) {
      throw new WebhookError(
        error instanceof Error ? error.message : 'Execution failed',
        'execute',
        'error'
      );
    }
  }

  async monitor(webhookId: string): Promise<WebhookStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/webhook/status/${webhookId}`);
      return response.data;
    } catch (error) {
      throw new WebhookError(
        error instanceof Error ? error.message : 'Monitoring failed',
        'execute',
        'warning'
      );
    }
  }

  private validateBasicConfig(config: WebhookSetup['basicConfig']): void {
    const errors: string[] = [];
    if (!config.name) errors.push('Name is required');
    if (!config.endpoint) errors.push('Endpoint is required');
    if (!config.method) errors.push('Method is required');

    if (errors.length > 0) {
      throw new WebhookError(
        `Invalid configuration: ${errors.join(', ')}`,
        'config',
        'error'
      );
    }
  }

  private async handleTemplateSetup(template: WebhookSetup['template']): Promise<EnviziTemplate> {
    if (template.file) {
      return await this.templateService.uploadTemplate(template.file);
    } else if (template.name) {
      const existingTemplate = await this.templateService.getTemplate(template.name);
      if (!existingTemplate) {
        throw new WebhookError(
          `Template ${template.name} not found`,
          'config',
          'error'
        );
      }
      return existingTemplate;
    }
    throw new WebhookError(
      'Template file or name is required',
      'config',
      'error'
    );
  }

  private async suggestMappings(data: any[], template: EnviziTemplate): Promise<TemplateMapping[]> {
    return this.mappingService.suggestMappings(data[0], template);
  }

  private validateMappings(mappings: TemplateMapping[], template: EnviziTemplate): ValidationResult {
    const errors = [];
    const requiredFields = template.fields.filter(f => f.required);

    for (const field of requiredFields) {
      const mapping = mappings.find(m => m.enviziField === field.name);
      if (!mapping || (mapping.confidence !== undefined && mapping.confidence < 0.7)) {
        errors.push({
          field: field.name,
          message: `Required field ${field.name} has no confident mapping`,
          severity: 'error' as const,
          resolution: 'Please manually map this field'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async getWebhookConfig(webhookId: string): Promise<WebhookSetup> {
    const response = await axios.get(`${this.baseUrl}/api/webhook/config/${webhookId}`);
    return response.data;
  }

  private async getWebhookTemplate(webhookId: string): Promise<EnviziTemplate> {
    const response = await axios.get(`${this.baseUrl}/api/webhook/template/${webhookId}`);
    return response.data;
  }

  private async testEndpoint(endpoint: string): Promise<any[]> {
    const response = await axios.get(endpoint);
    return Array.isArray(response.data) ? response.data : [response.data];
  }
} 