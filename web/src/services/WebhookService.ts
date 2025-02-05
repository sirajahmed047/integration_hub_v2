import axios from 'axios';
import { 
  WebhookConfig, 
  TemplateMapping, 
  EnviziTemplate,
  EnviziField,
  TestResult 
} from '../types/webhook';
import { validateTransformedData } from '../utils/validation';
import { templateStore } from '../types/webhook';

interface WebhookRecord {
  [key: string]: any;  // For dynamic field access
}

export class WebhookService {
  private sampleData: any;

  constructor(private baseUrl: string = '') {
    this.sampleData = {}; // Initialize empty or with default data
  }

  async executeWebhook(config: WebhookConfig, retries = 3): Promise<{
    success: boolean;
    data: any;
    testMode?: boolean;
    originalData: any;
    records?: any[];
    validationErrors?: string[];
  }> {
    try {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log('Executing webhook with config:', config);
          
          // First get the data from the external API
          const response = await axios.post('/api/proxy', {
            url: config.endpoint,
            method: config.method || 'GET',
            headers: config.headers || {},
            data: config.data || {},
          });

          console.log('Webhook response:', response.data);

          // Prepare transform payload
          const transformPayload = {
            webhook_detail_data: {
              ...config,
              data_template_type: "1-single",
              envizi_template: "POC",
              fields: config.mapping
            },
            webhook_execute_response: response.data,
            locations: [],
            accounts: [],
            account_styles: [],
            template_columns: [
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
            ]
          };

          console.log('Transform Payload:', JSON.stringify(transformPayload, null, 2));
          
          const transformResponse = await axios.post(
            `/api/transform-webhook`, 
            transformPayload
          );

          // Only attempt Envizi API call if not in test mode and envizi config exists
          if (!config.isTestMode && config.envizi?.endpoint) {
            await this.sendToEnvizi(transformResponse.data.processed_data, config.envizi);
          }

          // Only validate if mappings exist
          if (config.mapping && config.mapping.length > 0) {
            const validationErrors = validateTransformedData(
              transformResponse.data.processed_data,
              config.mapping,
              config.envizi_template
            );
            return {
              success: validationErrors.length === 0,
              data: transformResponse.data.processed_data,
              testMode: config.isTestMode,
              originalData: response.data,
              records: response.data.records,
              validationErrors
            };
          }

          return {
            success: true,
            data: transformResponse.data.processed_data,
            testMode: config.isTestMode,
            originalData: response.data,
            records: response.data.records,
            validationErrors: []
          };
        } catch (error: any) {
          console.error(`Webhook execution attempt ${attempt} failed:`, error);
          if (error.response) {
            console.error('Error response:', error.response.data);
          }
          if (attempt === retries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      throw new Error('Max retries reached');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  public async sendToEnvizi(data: any, enviziConfig: WebhookConfig['envizi']) {
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
        `/api/webhook/save`,
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
      const response = await axios.get(`/api/webhook/list`);
      return response.data;
    } catch (error) {
      console.error('Get webhooks failed:', error);
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

  private transformRecord(record: WebhookRecord, template: EnviziTemplate): WebhookRecord {
    const transformed: WebhookRecord = {};
    
    // Map standard fields
    template.fields.forEach(field => {
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
    
    return transformed;
  }

  async transformData(config: WebhookConfig, data: any): Promise<TestResult> {
    const template = templateStore.getTemplate(config.envizi_template);
    if (!template) {
      throw new Error(`Template ${config.envizi_template} not found`);
    }

    // Extract records from the response
    const records: WebhookRecord[] = Array.isArray(data) ? data : [data];
    
    // Transform each record
    const transformedData = records.map((record: WebhookRecord) => 
      this.transformRecord(record, template)
    );
    
    console.log('Transformed Data:', transformedData);
    
    const validationErrors = validateTransformedData(
      transformedData,
      config.mapping,
      config.envizi_template
    );
    
    return {
      success: true,
      originalData: data,
      records: records,
      data: transformedData,
      transformedData: transformedData,
      validationErrors
    };
  }

  private extractRecords(data: any): any[] {
    // Handle different response structures
    if (data.data?.webhook_execute_response?.records) {
      return data.data.webhook_execute_response.records;
    }
    if (data.records) {
      return data.records;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [data];
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

  async updateScheduler(webhookId: string, enabled: boolean) {
    try {
      const response = await axios.post(`/api/webhook/scheduler`, {
        id: webhookId,
        enabled
      });
      return response.data;
    } catch (error) {
      console.error('Scheduler update failed:', error);
      throw error;
    }
  }

  async getSchedulerStatus(webhookId: string) {
    try {
      const response = await axios.get(
        `/api/webhook/scheduler/${webhookId}`
      );
      return response.data;
    } catch (error) {
      console.error('Get scheduler status failed:', error);
      throw error;
    }
  }

  async getExecutionHistory(webhookId: string) {
    try {
      const response = await axios.get(
        `/api/webhook/history/${webhookId}`
      );
      return response.data;
    } catch (error) {
      console.error('Get history failed:', error);
      throw error;
    }
  }

  async clearHistory(webhookId: string) {
    try {
      const response = await axios.post(
        `/api/webhook/history/${webhookId}/clear`
      );
      return response.data;
    } catch (error) {
      console.error('Clear history failed:', error);
      throw error;
    }
  }

  async getWebhookMetrics(webhookId: string) {
    try {
      const response = await axios.get(
        `/api/webhook/metrics/${webhookId}`
      );
      return response.data;
    } catch (error) {
      console.error('Get metrics failed:', error);
      throw error;
    }
  }

  async getWebhookStatus(webhookId: string) {
    try {
      const response = await axios.get(
        `/api/webhook/status/${webhookId}`
      );
      return response.data;
    } catch (error) {
      console.error('Get status failed:', error);
      throw error;
    }
  }

  private extractValueFromPath(data: any, path: string): any {
    const normalizedPath = path.replace(/\[\*\]/g, '.0');
    return normalizedPath.split('.').reduce((obj, key) => obj?.[key], data);
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

  async testWebhook(config: WebhookConfig): Promise<TestResult> {
    try {
      // 1. Get API response
      const response = await this.executeWebhook(config);
      
      // 2. Extract records - handle different response structures
      let records: any[] = [];
      if (response.originalData?.records) {
        records = response.originalData.records;
      } else if (Array.isArray(response.originalData)) {
        records = response.originalData;
      } else if (typeof response.originalData === 'object') {
        records = [response.originalData];
      }

      if (records.length === 0) {
        throw new Error('No records found in the API response');
      }

      // 3. Get template and validate
      const template = templateStore.getTemplate(config.envizi_template);
      if (!template) {
        throw new Error(`Template ${config.envizi_template} not found`);
      }

      // 4. Create intelligent field mappings
      const suggestedMappings = this.suggestMappings(records[0], template.fields);
      
      // 5. Transform the data using mappings
      const transformedData = records.slice(0, 5).map(record => {
        const transformed: Record<string, any> = {};
        template.fields.forEach(field => {
          const mapping = suggestedMappings.find(m => m.enviziField === field.name);
          if (mapping) {
            transformed[field.name] = this.getValueFromPath(record, mapping.sourcePath);
          } else {
            // For unmapped fields, provide empty string to allow manual entry
            transformed[field.name] = '';
          }
        });
        return transformed;
      });

      console.log('Transformed Data:', transformedData); // Debug log

      return {
        success: true,
        originalData: response.originalData,
        records,
        transformedData,
        validationErrors: []
      };
    } catch (error) {
      console.error('Test webhook failed:', error);
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
          transformation: { type: 'direct' }
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
}