export interface WebhookSetup {
  basicConfig: {
    name: string;
    endpoint: string;
    method: string;
    headers?: Record<string, string>;
  };
  template: {
    id?: string;
    file?: File;
    name?: string;
  };
  envizi?: {
    apiKey: string;
    endpoint: string;
    organizationId: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
    resolution?: string;
  }>;
}

export interface ExecutionResult {
  success: boolean;
  recordsProcessed: number;
  timestamp: Date;
  errors?: string[];
}

export interface WebhookStatus {
  status: 'active' | 'inactive' | 'error';
  lastExecution?: ExecutionResult;
  nextScheduledRun?: Date;
  metrics: {
    totalExecutions: number;
    successRate: number;
    averageProcessingTime: number;
  };
}

export interface TransformationType {
  type: 'direct' | 'math' | 'date' | 'text';
  operation?: string;
  format?: string;
}

export interface TemplateMapping {
  enviziField: string;
  sourcePath: string;
  required?: boolean;
  isArray?: boolean;
  manualValue?: string;
  transformation?: TransformationType;
  confidence?: number;
}

export interface WebhookAuth {
  enabled: boolean;
  type: 'bearer' | 'api_key';
  headerName?: string;
  key?: string;
}

export type ApiKeyHeaderName = 'x-api-key' | 'auth-token' | 'api-key' | 'apikey' | 'x-auth-token';

export const COMMON_API_KEY_HEADERS: ApiKeyHeaderName[] = [
  'x-api-key',
  'auth-token',
  'api-key',
  'apikey',
  'x-auth-token'
];

export interface WebhookConfig {
  id?: string;
  name: string;
  desc: string;
  endpoint: string;
  method: string;
  envizi_template: string;
  mapping: TemplateMapping[];
  auth?: WebhookAuth;
  scheduler: {
    enabled: boolean;
    interval: number;
    lastRun?: string;
    nextRun?: string;
  };
  uploadedFile?: File;
  headers?: Record<string, string>;
  data?: any;
  isTestMode?: boolean;
  envizi?: {
    apiKey: string;
    endpoint: string;
    organizationId: string;
  };
  body?: any;
}

export type EnviziFieldType = 'string' | 'number' | 'date';

export interface EnviziTemplate {
  name: string;
  fields: EnviziField[];
  version?: string;
  description?: string;
}

export interface EnviziTemplates {
  [key: string]: EnviziTemplate;
}

export interface EnviziTemplateStore {
  templates: Record<string, EnviziTemplate>;
  addTemplate: (template: EnviziTemplate) => void;
  getTemplate: (name: string) => EnviziTemplate | undefined;
}

export type EnviziTemplateType = string;

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

export interface TestResult {
  success: boolean;
  error?: string;
  originalData: any;
  records: any[];
  transformedData: any[];
  validationErrors: string[];
  mappings?: MappingResult[];
}

export interface WebhookResponse {
  success: boolean;
  originalData: any;
  records: any[];
  mappings: TemplateMapping[];
  transformedData: any[];
  validationErrors: string[];
}

interface MappingResult {
  sourceField: string;
  targetField: string;
  transformation: TransformationType;
  confidence: number;
  value: any;
}

export class WebhookError extends Error {
  constructor(
    message: string,
    public step: 'config' | 'mapping' | 'transform' | 'execute',
    public severity: 'error' | 'warning',
    public resolution?: string
  ) {
    super(message);
    this.name = 'WebhookError';
  }
} 