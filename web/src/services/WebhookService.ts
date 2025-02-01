import axios from 'axios';
import { WebhookConfig, TemplateMapping } from '../types/webhook';
import { validateTransformedData } from '../utils/validation';

export class WebhookService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    if (!baseUrl) {
      console.error('API URL not configured. Please check NEXT_PUBLIC_API_URL in .env');
      throw new Error('API URL not configured');
    }
    this.baseUrl = baseUrl;
    console.log('API URL:', baseUrl);
  }

  async executeWebhook(config: WebhookConfig): Promise<{
    success: boolean;
    data: any;
    testMode?: boolean;
    originalData: any;
    validationErrors?: string[];
  }> {
    try {
      console.log('API URL:', this.baseUrl);
      console.log('Config:', config);
      
      // 1. Get raw data from API
      const response = await axios({
        method: config.method,
        url: config.endpoint,
        headers: config.headers || {},
      });

      // 2. Send to backend for transformation
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
        `${this.baseUrl}/api/transform-webhook`, 
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
          validationErrors
        };
      }

      return {
        success: true,
        data: transformResponse.data.processed_data,
        testMode: config.isTestMode,
        originalData: response.data,
        validationErrors: []
      };
    } catch (error) {
      console.error('Webhook execution failed:', error);
      throw error;
    }
  }

  private async sendToEnvizi(data: any, enviziConfig?: WebhookConfig['envizi']) {
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

  private validateTransformation(value: any, transformation: TemplateMapping['transformation']) {
    if (!transformation) return true;
    
    switch (transformation.type) {
      case 'date':
        return !isNaN(Date.parse(value));
      case 'math':
        return !isNaN(Number(value));
      default:
        return true;
    }
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

  async transformData(config: WebhookConfig, originalData: any) {
    const transformedRecords = Array.isArray(originalData) ? originalData : [originalData];
    const errors: string[] = [];
    
    const processedData = transformedRecords.map((record, index) => {
      const result: Record<string, any> = {};
      
      config.mapping.forEach(mapping => {
        try {
          let value = this.resolveTemplatePath(record, mapping.sourcePath);
          
          if (mapping.transformation) {
            // Validate before transformation
            if (!this.validateTransformation(value, mapping.transformation)) {
              errors.push(`Record ${index + 1}: Invalid value for ${mapping.enviziField} transformation`);
            }
            value = this.applyTransformation(value, mapping.transformation);
          }
          
          result[mapping.enviziField] = value;
        } catch (error) {
          errors.push(`Record ${index + 1}: Error processing ${mapping.enviziField}`);
          result[mapping.enviziField] = '';
        }
      });
      
      return result;
    });

    // Validate transformed data
    const validationErrors = validateTransformedData(
      processedData, 
      config.mapping,
      config.envizi_template
    );

    return {
      success: errors.length === 0 && validationErrors.length === 0,
      data: processedData,
      testMode: config.isTestMode,
      originalData,
      validationErrors: [...errors, ...validationErrors]
    };
  }

  public applyTransformation(value: any, transformation: TemplateMapping['transformation']) {
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
      // Add date formatting based on format parameter
      return date.toISOString().split('T')[0]; // Default to YYYY-MM-DD
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
      return this.applyTransformation(value, mapping.transformation);
    });
  }

  private resolveTemplatePath(data: any, path: string): any {
    // Handle array notation [*]
    const normalizedPath = path.replace(/\[\*\]/g, '.0');
    return normalizedPath.split('.').reduce((obj, key) => obj?.[key], data);
  }
}