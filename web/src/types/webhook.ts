export interface TemplateMapping {
  enviziField: string;
  sourcePath: string;
  required?: boolean;
  isArray?: boolean;
  manualValue?: string;
  transformation?: {
    type: 'direct' | 'math' | 'date' | 'text';
    operation?: string;
    format?: string;
  }
}

export interface WebhookConfig {
  id?: string;
  name: string;
  desc: string;
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
  data?: any;
  mapping: TemplateMapping[];
  envizi_template: EnviziTemplateType;
  isTestMode?: boolean;
  scheduler?: {
    enabled: boolean;
    interval: number;
    lastRun?: string;
    nextRun?: string;
  };
  envizi?: {
    apiKey: string;
    endpoint: string;
    organizationId: string;
  };
  data_template_type?: string;
}

export type EnviziFieldType = 'string' | 'number' | 'date';

export interface EnviziTemplate {
  name: string;
  fields: EnviziField[];
  version?: string;
  description?: string;
}

export interface EnviziTemplateStore {
  templates: Record<string, EnviziTemplate>;
  addTemplate: (template: EnviziTemplate) => void;
  getTemplate: (name: string) => EnviziTemplate | undefined;
}

export const ENVIZI_TEMPLATES: Record<string, EnviziTemplate> = {
  'POC': {
    name: 'POC',
    fields: [
      { name: "Organization", required: true, type: 'string' },
      { name: "Location", required: true, type: 'string' },
      { name: "Account Style Caption", required: true, type: 'string' },
      { name: "Start Date", required: true, type: 'date' },
      { name: "End Date", required: true, type: 'date' },
      { name: "Usage Amount", required: false, type: 'number' },
      { name: "Cost Amount", required: false, type: 'number' }
    ]
  }
};

export type EnviziTemplateType = 'POC' | string;

export function validateTransformedData(
  data: any[], 
  mappings: TemplateMapping[],
  templateType: EnviziTemplateType
): string[] {
  const errors: string[] = [];
  const template = ENVIZI_TEMPLATES[templateType];
  return errors;
}

export interface TemplateRow {
  'Field Name': string;
  'Data Type'?: string;
  'Required'?: string;
  'Validation'?: string;
}

export interface EnviziField {
  name: string;
  type: EnviziFieldType;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export const TRANSFORMATION_TEMPLATES = {
  date: {
    iso: (value: string) => new Date(value).toISOString(),
    ymd: (value: string) => value.split('T')[0]
  },
  number: {
    round: (value: number) => Math.round(value),
    fixed2: (value: number) => Number(value).toFixed(2)
  },
  text: {
    uppercase: (value: string) => value.toUpperCase(),
    trim: (value: string) => value.trim()
  }
};

export const templateStore: EnviziTemplateStore = {
  templates: { ...ENVIZI_TEMPLATES },
  
  addTemplate(template: EnviziTemplate) {
    this.templates[template.name] = template;
  },
  
  getTemplate(name: string) {
    return this.templates[name];
  }
};

export interface TestResult {
  success: boolean;
  originalData: any;
  records: any[];
  transformedData: any[];
  validationErrors: string[];
  data?: any[];
} 