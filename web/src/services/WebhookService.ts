import axios from 'axios';
import { 
  WebhookConfig, 
  TemplateMapping, 
  WebhookResponse,
  TestResult,
  EnviziTemplate,
  EnviziField
} from '../types/webhook';
import { ValidationService } from './ValidationService';
import { MappingService } from './MappingService';
import { TemplateService } from './TemplateService';

interface WebhookRecord {
  [key: string]: any;  // For dynamic field access
}

interface ParsedTemplate {
  name: string;
  fields: EnviziField[];
}

export class WebhookService {
  private validationService: ValidationService;
  public mappingService: MappingService;
  private templateService: TemplateService;

  constructor(private baseUrl: string = '') {
    this.validationService = new ValidationService();
    this.mappingService = new MappingService();
    this.templateService = new TemplateService(baseUrl);
  }

  async executeWebhook(config: WebhookConfig): Promise<WebhookResponse> {
    try {
      const configErrors = this.validationService.validateWebhookConfig(config);
      if (configErrors.length > 0) {
        throw new Error(`Invalid webhook configuration: ${configErrors.join(', ')}`);
      }

      const response = await WebhookService.executeWithRetry(config);
      const records = this.extractRecords(response);
      
      const template = await this.templateService.getTemplate(config.envizi_template);
      if (!template) {
        throw new Error(`Template ${config.envizi_template} not found`);
      }

      const mappings = config.mapping?.length > 0 
        ? config.mapping 
        : this.mappingService.suggestMappings(records[0], template);

      const transformedData = this.mappingService.transformData(records, mappings, template);
      const validationErrors = this.validationService.validateTransformedData(transformedData, template);

      return {
        success: true,
        originalData: response,
        records,
        mappings,
        transformedData,
        validationErrors
      };
    } catch (error) {
      console.error('Webhook execution failed:', error);
      throw error;
    }
  }

  private extractRecords(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      const possibleArrays = Object.values(data).filter(Array.isArray);
      if (possibleArrays.length > 0) {
        return possibleArrays[0];
      }
    }
    return [data];
  }

  async sendToEnvizi(data: any, enviziConfig: WebhookConfig['envizi']) {
    if (!enviziConfig?.endpoint || !enviziConfig?.organizationId) {
      throw new Error('Missing required Envizi configuration');
    }

    const headers = {
      'Authorization': `Bearer ${enviziConfig.apiKey}`,
      'Content-Type': 'application/json'
    };

    await axios.post(
      `${enviziConfig.endpoint}/organizations/${enviziConfig.organizationId}/data`,
      data,
      { headers }
    );
  }

  async saveWebhook(config: WebhookConfig) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/webhook/save`,
        config
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save webhook');
      }
      
      return response.data;
    } catch (error) {
      console.error('Save webhook failed:', error);
      throw error;
    }
  }

  async getWebhooks() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/webhook/list`);
      return response.data;
    } catch (error) {
      console.error('Get webhooks failed:', error);
      throw error;
    }
  }

  async getWebhookMetrics(webhookId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/webhook/metrics/${webhookId}`);
      return response.data;
    } catch (error) {
      console.error('Get webhook metrics failed:', error);
      throw error;
    }
  }

  async getWebhookStatus(webhookId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/webhook/status/${webhookId}`);
      return response.data;
    } catch (error) {
      console.error('Get webhook status failed:', error);
      throw error;
    }
  }

  async updateScheduler(webhookId: string, enabled: boolean, interval?: number) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/webhook/scheduler/${webhookId}`, {
        enabled,
        interval
      });
      return response.data;
    } catch (error) {
      console.error('Update scheduler failed:', error);
      throw error;
    }
  }

  async getSchedulerStatus(webhookId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/webhook/scheduler/${webhookId}`);
      return response.data;
    } catch (error) {
      console.error('Get scheduler status failed:', error);
      throw error;
    }
  }

  async getExecutionHistory(webhookId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/webhook/history/${webhookId}`);
      return response.data;
    } catch (error) {
      console.error('Get execution history failed:', error);
      throw error;
    }
  }

  private static buildHeaders(config: WebhookConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.auth?.enabled && config.auth?.key) {
      if (config.auth.type === 'bearer') {
        headers['Authorization'] = `Bearer ${config.auth.key}`;
      } else if (config.auth.type === 'api_key') {
        headers[config.auth.headerName || 'auth-token'] = config.auth.key;
      }
    }

    return headers;
  }

  public static async executeWithRetry(config: WebhookConfig, retries = 3): Promise<any> {
    try {
      const headers = WebhookService.buildHeaders(config);
      
      // Use proxy endpoint for external API calls
      const response = await axios({
        method: 'POST',
        url: `${process.env.NEXT_PUBLIC_API_URL || ''}/api/webhook/proxy`,
        data: {
          url: config.endpoint,
          method: config.method,
          headers,
          body: config.method !== 'GET' ? config.body : undefined
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Proxy request failed');
      }

      return response.data.data;
    } catch (error) {
      if (retries > 0 && axios.isAxiosError(error)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return WebhookService.executeWithRetry(config, retries - 1);
      }
      throw error;
    }
  }

  private validateTransformation(
    value: any, 
    transformation: TemplateMapping['transformation'], 
    fieldName: string,
    isRequired: boolean
  ): string[] {
    const errors: string[] = [];
    
    if (!value && isRequired) {
      errors.push(`${fieldName} is required`);
      return errors;
    }

    if (!transformation) return errors;
    
    switch (transformation.type) {
      case 'date':
        if (value && isNaN(Date.parse(value))) {
          errors.push(`${fieldName} must be a valid date`);
        }
        break;
      case 'math':
        if (value && isNaN(Number(value))) {
          errors.push(`${fieldName} must be a number`);
        }
        break;
    }
    
    return errors;
  }

  private validateTransformationFormat(value: any, transformation: TemplateMapping['transformation']) {
    if (!transformation?.format) return true;
    
    switch (transformation.type) {
      case 'date':
        try {
          const date = new Date(value);
          return !isNaN(date.getTime());
        } catch {
          return false;
        }
      case 'math':
        return typeof value === 'number' || !isNaN(Number(value));
      default:
        return true;
    }
  }

  private validateMapping(mapping: TemplateMapping, template: EnviziTemplate, data: any) {
    const field = template.fields.find((f: EnviziField) => f.name === mapping.enviziField);
    if (!field) return [];

    const errors: string[] = [];
    
    // Check required fields
    if (field.required && !mapping.sourcePath) {
      errors.push(`${field.name} is required but no source field is mapped`);
    }

    // Check type compatibility
    if (mapping.sourcePath) {
      const value = this.extractValueFromPath(data, mapping.sourcePath);
      switch (field.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${mapping.sourcePath} cannot be converted to number for ${field.name}`);
          }
          break;
        case 'date':
          if (isNaN(Date.parse(String(value)))) {
            errors.push(`${mapping.sourcePath} is not a valid date for ${field.name}`);
          }
          break;
      }
    }

    return errors;
  }

  private transformRecord(record: WebhookRecord, template: EnviziTemplate, mappings: TemplateMapping[]): WebhookRecord {
    const transformed: WebhookRecord = {};
    
    // Map standard fields
    template.fields.forEach((field: EnviziField) => {
      let value = '';
      
      // Try to find matching field using different strategies
      switch(field.name.toLowerCase()) {
        case 'organization':
          value = 'Default Organization'; // Or get from config
          break;
          
        case 'location':
          value = record.PriceArea || record.ConnectedArea || '';
          break;
          
        case 'account_number':
        case 'account reference':
          value = `${record.PriceArea || ''}-${record.ConnectedArea || ''}`;
          break;
          
        case 'start_date':
        case 'record_start':
          value = record.HourDK || record.HourUTC || '';
          break;
          
        case 'end_date':
        case 'record_end':
          value = record.HourDK || record.HourUTC || '';
          break;
          
        case 'usage_amount':
        case 'quantity':
          value = record.ShareMWh?.toString() || '';
          break;
          
        case 'usage_unit':
          value = 'MWh';
          break;
          
        case 'cost_amount':
        case 'total_cost':
          value = record.SharePPM?.toString() || '';
          break;
          
        case 'cost_unit':
          value = 'PPM';
          break;
          
        case 'supplier':
        case 'account_supplier':
          value = record.ConnectedArea || '';
          break;
          
        case 'reference':
        case 'record_reference':
          value = `${record.dataset || ''}-${record.HourDK || ''}`;
          break;
          
        default:
          // Try to find a matching field by name similarity
          const matchingKey = Object.keys(record).find(key => 
            key.toLowerCase().includes(field.name.toLowerCase()) ||
            field.name.toLowerCase().includes(key.toLowerCase())
          );
          value = matchingKey ? record[matchingKey] : '';
      }
      
      transformed[field.name] = value;
    });
    
    // Apply mappings
    mappings.forEach(mapping => {
      const sourceValue = this.extractValueFromPath(record, mapping.sourcePath);
      transformed[mapping.enviziField] = this.applyTransformation(sourceValue, mapping.transformation, mapping.enviziField);
    });
    
    return transformed;
  }

  private validateTransformedData(data: any[], template: EnviziTemplate): string[] {
    const errors: string[] = [];
    
    data.forEach((record, index) => {
      template.fields.forEach(field => {
        if (field.required && !record[field.name]) {
          errors.push(`Record ${index + 1}: Missing required field "${field.name}"`);
        }
        
        const value = record[field.name];
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

  public applyTransformation(
    value: any, 
    transformation: TemplateMapping['transformation'], 
    field: EnviziField | string
  ): any {
    if (!transformation || transformation.type === 'direct') {
      return value;
    }

    switch (transformation.type) {
      case 'date':
        return this.transformDate(value, transformation.format);
      case 'math':
        return this.transformMath(value, transformation.operation);
      case 'text':
        return this.transformText(value, transformation.operation);
      default:
        return value;
    }
  }

  private transformDate(value: string, format?: string): string {
    try {
      const date = new Date(value);
      switch (format) {
        case 'ISO':
          return date.toISOString();
        case 'YMD':
          return date.toISOString().split('T')[0];
        // Add more format options
        default:
          return date.toISOString();
      }
    } catch {
      return value;
    }
  }

  private transformMath(value: number | string, operation?: string): number {
    const num = Number(value);
    if (isNaN(num)) return 0;
    
    switch (operation) {
      case 'multiply':
        return num * 1; // Add multiplier as needed
      case 'divide':
        return num / 1; // Add divisor as needed
      default:
        return num;
    }
  }

  private transformText(value: any, operation?: string): string {
    const str = String(value);
    switch (operation) {
      case 'uppercase':
        return str.toUpperCase();
      case 'lowercase':
        return str.toLowerCase();
      default:
        return str;
    }
  }

  // Add template-specific methods
  processTemplateMapping(records: any[], mapping: TemplateMapping) {
    return records.map(record => {
      const value = this.resolveTemplatePath(record, mapping.sourcePath);
      return this.applyTransformation(value, mapping.transformation, 'string');
    });
  }

  private resolveTemplatePath(data: any, path: string): any {
    // Handle array notation [*]
    const normalizedPath = path.replace(/\[\*\]/g, '.0');
    return normalizedPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private extractValueFromPath(data: any, path: string): any {
    const normalizedPath = path.replace(/\[\*\]/g, '.0');
    return normalizedPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  public async testWebhook(config: WebhookConfig): Promise<TestResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/webhook/test`,
        {
          webhook_detail_data: config,
          template: await this.templateService.getTemplate(config.envizi_template)
        }
      );

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.data;
    } catch (error) {
      console.error('Test webhook error:', error);
      throw error;
    }
  }

  // Suggests mappings between API fields and template fields
  private suggestMappings(record: any, templateFields: EnviziField[]): TemplateMapping[] {
    const mappings: TemplateMapping[] = [];
    // Get all possible paths from API response
    const recordPaths = this.extractPaths(record);

    templateFields.forEach(field => {
      // Find best matching API field for each template field
      const matchingPath = this.findBestMatch(field.name, recordPaths);
      if (matchingPath) {
        mappings.push({
          enviziField: field.name,
          sourcePath: matchingPath,
          required: field.required,
          transformation: { type: 'direct' },
          confidence: this.calculateConfidence(field.name, matchingPath) // Confidence score
        });
      }
    });
    return mappings;
  }

  // Finds best matching API field for a template field
  private findBestMatch(fieldName: string, paths: string[]): string | undefined {
    const normalizedField = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try exact match first
    const exactMatch = paths.find(path => 
      path.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedField
    );
    if (exactMatch) return exactMatch;

    // Then try partial match
    return paths.find(path => {
      const normalizedPath = path.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedPath.includes(normalizedField) || 
             normalizedField.includes(normalizedPath);
    });
  }

  private extractPaths(obj: any, prefix = ''): string[] {
    if (!obj || typeof obj !== 'object') return [];
    
    return Object.entries(obj).reduce((paths: string[], [key, value]) => {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        return [...paths, currentPath, ...this.extractPaths(value, currentPath)];
      }
      return [...paths, currentPath];
    }, []);
  }

  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  private calculateConfidence(fieldName: string, matchingPath: string): number {
    // Implement confidence calculation logic based on the matching path
    // This is a placeholder and should be replaced with actual implementation
    return 0.8; // Placeholder confidence value
  }

  // Add transformData method to delegate to MappingService
  async transformData(data: any[], mappings: TemplateMapping[], templateName: string): Promise<WebhookResponse> {
    const template = await this.templateService.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    const transformedData = this.mappingService.transformData(data, mappings, template);
    const validationErrors = this.validationService.validateTransformedData(transformedData, template);
    
    return {
      success: true,
      originalData: data,
      records: data,
      mappings,
      transformedData,
      validationErrors
    };
  }
}