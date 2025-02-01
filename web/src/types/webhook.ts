export interface TemplateMapping {
  enviziField: string;
  sourcePath: string;
  isArray?: boolean;
  transformation?: {
    type: 'direct' | 'math' | 'date' | 'text';
    operation?: string;
    format?: string;
  }
}

export interface WebhookConfig {
  name: string;
  desc: string;
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
  mapping: {
    enviziField: string;
    sourcePath: string;
    isArray?: boolean;
    transformation?: {
      type: 'direct' | 'math' | 'date' | 'text';
      operation?: string;
      format?: string;
    };
  }[];
  envizi_template: EnviziTemplateType;
  data_template_type: string;
  isTestMode?: boolean;
  envizi?: {
    endpoint?: string;
    apiKey?: string;
    organizationId?: string;
  };
}

export type EnviziFieldType = 'string' | 'number' | 'date';

export const ENVIZI_TEMPLATES = {
  'POC': {
    fields: [
      { name: "Organization", required: true, type: 'string' as EnviziFieldType },
      { name: "Location", required: true, type: 'string' as EnviziFieldType },
      { name: "Account Style Caption", required: true, type: 'string' as EnviziFieldType },
      { name: "Start Date", required: true, type: 'date' as EnviziFieldType },
      { name: "End Date", required: true, type: 'date' as EnviziFieldType },
      { name: "Usage Amount", required: false, type: 'number' as EnviziFieldType },
      { name: "Cost Amount", required: false, type: 'number' as EnviziFieldType }
    ]
  }
} as const;

export type EnviziTemplateType = keyof typeof ENVIZI_TEMPLATES;

export function validateTransformedData(
  data: any[], 
  mappings: TemplateMapping[],
  templateType: EnviziTemplateType
): string[] {
  const errors: string[] = [];
  const template = ENVIZI_TEMPLATES[templateType];
  return errors;
}

export interface EnviziField {
  name: string;
  required: boolean;
  type: EnviziFieldType;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean;
  };
} 