import { EnviziTemplate, EnviziField, EnviziFieldType } from '../types/webhook';
import axios from 'axios';
import * as XLSX from 'xlsx';

export class TemplateService {
  private templates: Map<string, EnviziTemplate>;
  private apiBaseUrl: string;
  
  constructor(private baseUrl: string = '') {
    this.templates = new Map();
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  determineFieldType(fieldName: string, sampleValue?: any): EnviziFieldType {
    if (sampleValue !== undefined) {
      if (typeof sampleValue === 'number') return 'number';
      if (!isNaN(Date.parse(String(sampleValue)))) return 'date';
    }

    const name = fieldName.toLowerCase();
    if (name.includes('date') || name.includes('time')) return 'date';
    if (name.includes('amount') || name.includes('quantity') || name.includes('number')) return 'number';
    return 'string';
  }

  extractValidation(validationStr: string | undefined) {
    if (!validationStr) return undefined;
    
    try {
      const validation: Record<string, any> = {};
      
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

  async uploadTemplate(file: File): Promise<EnviziTemplate> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.apiBaseUrl}/api/webhook/parse-template`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload template');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to process template');
      }

      const template: EnviziTemplate = {
        name: result.templateName,
        fields: result.fields,
        version: '1.0',
        description: `Template parsed from ${file.name}`
      };

      // Store in memory for immediate use
      this.templates.set(template.name, template);

      return template;
    } catch (error) {
      console.error('Failed to process template:', error);
      if (error instanceof Error) {
        throw new Error(`Template processing failed: ${error.message}`);
      }
      throw error;
    }
  }

  async getTemplates(): Promise<EnviziTemplate[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/webhook/templates`);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error('Failed to get templates:', error);
      return [];
    }
  }

  async getTemplate(name: string): Promise<EnviziTemplate | undefined> {
    try {
      // Try memory cache first
      if (this.templates.has(name)) {
        return this.templates.get(name);
      }

      // Fetch from API
      const response = await fetch(`${this.apiBaseUrl}/api/webhook/templates/${encodeURIComponent(name)}`);
      if (!response.ok) {
        return undefined;
      }
      const data = await response.json();
      if (data.success && data.template) {
        this.templates.set(name, data.template);
        return data.template;
      }
      return undefined;
    } catch (error) {
      console.error(`Failed to get template ${name}:`, error);
      return undefined;
    }
  }

  private extractFields(headers: string[]): any[] {
    return headers.map(fieldName => ({
      name: fieldName,
      sampleValue: null,
      required: false
    }));
  }

  private processTemplate(data: any): EnviziTemplate {
    if (!data.fields || !Array.isArray(data.fields)) {
      throw new Error('Invalid template data: missing fields array');
    }

    return {
      name: data.templateName,
      fields: data.fields.map((field: any) => this.processField(field)),
      version: '1.0',
      description: `Template parsed from ${data.templateName}`
    };
  }

  private processField(field: any): EnviziField {
    return {
      name: field.name,
      type: this.determineFieldType(field.name, field.sampleValue),
      required: field.required || false,
      validation: this.extractValidation(field.validation)
    };
  }
} 