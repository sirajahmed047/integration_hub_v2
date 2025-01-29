import axios from 'axios';
import WebhookConfig from '../interfaces/WebhookConfig';
import EnvUtility from '../components/EnvUtility/EnvUtility';

export class WebhookService {
  private envUtility: EnvUtility;
  private enviziConfig: ReturnType<EnvUtility['getEnviziConfig']>;
  private webhookConfig: ReturnType<EnvUtility['getWebhookConfig']>;

  constructor() {
    this.envUtility = new EnvUtility();
    try {
      this.enviziConfig = this.envUtility.getEnviziConfig();
      this.webhookConfig = this.envUtility.getWebhookConfig();
    } catch (error) {
      console.error('Failed to initialize WebhookService:', error);
      throw error;
    }
  }

  async executeWebhook(config: WebhookConfig) {
    try {
      console.log('Executing webhook with config:', config);

      // Call external API with timeout
      const response = await axios({
        method: config.method,
        url: config.endpoint,
        headers: config.headers || {},
        timeout: this.webhookConfig.timeout
      });

      console.log('External API response:', response.data);

      // Transform data using mapping
      const transformedData = this.transformData(response.data, config.mapping);

      console.log('Transformed data:', transformedData);

      // Only send to Envizi if not in test mode
      if (!config.isTestMode) {
        if (!this.enviziConfig.apiKey || !this.enviziConfig.apiUrl || !this.enviziConfig.orgId) {
          throw new Error('Missing required Envizi configuration');
        }

        await this.sendToEnvizi(transformedData, {
          apiKey: this.enviziConfig.apiKey,
          endpoint: this.enviziConfig.apiUrl,
          organizationId: this.enviziConfig.orgId
        });
      }

      return {
        success: true,
        data: transformedData,
        testMode: config.isTestMode,
        originalData: response.data
      };
    } catch (error) {
      console.error('Webhook execution failed:', error);
      throw error;
    }
  }

  private transformData(sourceData: any, mapping: WebhookConfig['mapping']) {
    const result = {};
    
    for (const map of mapping) {
      let value = this.getNestedValue(sourceData, map.sourceField);
      
      if (map.transformation) {
        value = this.applyTransformation(value, map.transformation);
      }
      
      this.setNestedValue(result, map.targetField, value);
    }

    return result;
  }

  private async sendToEnvizi(data: any, enviziConfig: WebhookConfig['envizi']) {
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

  private getNestedValue(obj: any, path: string) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any) {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      current[key] = current[key] || {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private applyTransformation(value: any, transformation: string): any {
    // Add custom transformations here
    switch (transformation) {
      case 'toUpperCase':
        return String(value).toUpperCase();
      case 'toLowerCase':
        return String(value).toLowerCase();
      case 'toNumber':
        return Number(value);
      default:
        return value;
    }
  }
} 