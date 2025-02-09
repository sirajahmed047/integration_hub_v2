'use client';

import React, { useState, useEffect } from 'react';
import { WebhookService } from '../../services/WebhookService';
import { 
  WebhookConfig, 
  TemplateMapping, 
  EnviziTemplate,
  EnviziField,
  ApiKeyHeaderName,
  COMMON_API_KEY_HEADERS
} from '../../types/webhook';
import {
  TextInput,
  Button,
  Grid,
  Column,
  Loading,
  TextArea,
  Select,
  SelectItem,
  Toggle,
  NumberInput,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InlineLoading,
  DataTable,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from '@carbon/react';
import { toast } from 'react-hot-toast';
import { TemplateService } from '../../services/TemplateService';
import styles from './styles.module.css';

// Regular imports instead of dynamic imports to avoid type issues
import ApiUtility from '../../components/ApiUtility/ApiUtility';
import { WebhookPreview } from '../../components/WebhookPreview';
import { WebhookError } from '../../components/WebhookError';
import { WebhookScheduler } from '../../components/WebhookScheduler';
import { WebhookStatusBadge } from '../../components/WebhookStatusBadge';
import { WebhookMetrics } from '../../components/WebhookMetrics';
import { WebhookHistory } from '../../components/WebhookHistory';
import { TemplateUploader } from '../../components/TemplateUploader';
import { ValidationResults } from '../../components/ValidationResults';

interface WebhookMetrics {
  totalExecutions: number;
  lastExecutionTime: string;
  lastRunStatus?: string;
  successfulExecutions: number;
  failedExecutions: number;
  totalRecordsProcessed: number;
  averageExecutionTime?: number;
}

interface MappingSuggestion {
  sourceField: string;
  targetField: string;
  transformation?: any;
  confidence: number;
  value: any;
}

interface TestResult {
  success: boolean;
  originalData: any;
  records: any[];
  transformedData: any[];
  validationErrors: string[];
  mappings?: MappingSuggestion[];
}

interface TemplateField {
  name: string;
  required: boolean;
  type: string;
}

interface Template {
  name: string;
  fields: TemplateField[];
  version: string;
  description: string;
}

interface Props {
  config: WebhookConfig | null;
  availableTemplates: string[];
  handleTemplateChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleTemplateUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTemplatePreview: () => void;
}

interface DataPreviewProps {
  loading: boolean;
  testResult: TestResult | null;
  config: WebhookConfig | null;
}

interface WebhookState {
  testResult: TestResult | null;
  webhookRecords: any[];
  loading: boolean;
  error: any;
  status: 'inactive' | 'active' | 'error' | 'running' | 'success';
  mappings: TemplateMapping[];
  transformedData: any[] | null;
  validationErrors: string[];
}

interface ErrorState {
  type: 'api' | 'validation' | 'transformation' | 'template';
  message: string;
}

export default function WebhookDetail() {
  const [config, setConfig] = useState<WebhookConfig | null>({
    name: '',
    desc: '',
    endpoint: process.env.NEXT_PUBLIC_WEBHOOK_DEFAULT_ENDPOINT || '',
    method: 'GET',
    envizi_template: '',
    headers: {},
    envizi: {
      apiKey: '',
      endpoint: '',
      organizationId: ''
    },
    mapping: [],
    scheduler: {
      enabled: false,
      interval: 5
    }
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const webhookService = new WebhookService(process.env.NEXT_PUBLIC_API_URL || '');
  const templateService = new TemplateService(process.env.NEXT_PUBLIC_API_URL || '');
  const apiUtility = new ApiUtility();
  const [webhookRecords, setWebhookRecords] = useState<any[]>([]);
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [schedulerInterval, setSchedulerInterval] = useState(60); // 60 minutes default
  const [error, setError] = useState<ErrorState | null>(null);
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive' | 'error' | 'running' | 'success'>('inactive');
  const [historyEntries, setHistoryEntries] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState<string[]>([]);

  const [state, setState] = useState<WebhookState>({
    testResult: null,
    webhookRecords: [],
    loading: false,
    error: null,
    status: 'inactive',
    mappings: [],
    validationErrors: [],
    transformedData: null
  });

  const [loadingStates, setLoadingStates] = useState({
    testing: false,
    saving: false,
    transforming: false,
    executing: false
  });

  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const id = queryParams.get('id');
    if (id) {
      loadConfig(id);
    } else {
      // Set default values for new webhook
      setConfig({
        name: '',
        desc: '',
        endpoint: process.env.NEXT_PUBLIC_WEBHOOK_DEFAULT_ENDPOINT || '',
        method: 'GET',
        envizi_template: '',
        headers: {},
        envizi: {
          apiKey: '',
          endpoint: '',
          organizationId: ''
        },
        mapping: [], // Will be populated with TemplateMapping objects
        scheduler: {
          enabled: false,
          interval: 5
        }
      });
    }
  }, []);

  useEffect(() => {
    if (config?.id) {
      Promise.all([
        webhookService.getWebhookMetrics(config.id),
        webhookService.getWebhookStatus(config.id)
      ]).then(([metricsData, statusData]) => {
        setMetrics(metricsData);
        setStatus(statusData.status);
      });
    }
  }, [config?.id]);

  useEffect(() => {
    if (config?.id) {
      webhookService.getExecutionHistory(config.id)
        .then(history => setHistoryEntries(history));
    }
  }, [config?.id]);

  useEffect(() => {
    // Load available templates
    const loadTemplates = async () => {
      try {
        const templates = await templateService.getTemplates();
        setAvailableTemplates(templates.map(t => t.name));
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    loadTemplates();
  }, []);

  const loadConfig = async (id: string) => {
    setLoading(true);
    try {
      const [configResponse, schedulerResponse] = await Promise.all([
        fetch(`/api/webhook/detail?id=${id}`),
        webhookService.getSchedulerStatus(id)
      ]);
      
      if (!configResponse.ok) {
        throw new Error(`HTTP error! status: ${configResponse.status}`);
      }
      
      const configData = await configResponse.json();
      
      if (configData && configData.data) {
        // If no template is uploaded, we can't proceed with field mapping
        if (!configData.data.envizi_template) {
          setError({
            type: 'template',
            message: 'Please upload an Envizi template to proceed with field mapping'
          });
        }
        
        setConfig(configData.data);
        setMappings(configData.data.mapping || []);
        
        // Set scheduler state
        setSchedulerEnabled(schedulerResponse.enabled || false);
        setSchedulerInterval(schedulerResponse.interval || 60);
      }
    } catch (error) {
      console.error('Failed to load webhook config:', error);
      setError({
        type: 'api',
        message: 'Failed to load webhook configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setLoading(true);
    try {
      const webhookData = {
        ...config,
        mapping: mappings,
        envizi_template: config.envizi_template,  // Must be selected by user
        scheduler: config.scheduler
      };
      
      const response = await apiUtility.postRequest(
        '/api/webhook/save',
        () => setLoading(true),
        (error: Error) => {
          console.error('Save failed:', error);
          setLoading(false);
        },
        (resp: unknown) => {
          console.log('Save successful:', resp);
          setLoading(false);
          window.location.href = '/webhooks';
        },
        webhookData
      );
    } catch (error) {
      console.error('Failed to save webhook config:', error);
      setLoading(false);
    }
  };

  const extractRecordsFromResponse = (originalData: any): any[] => {
    // Direct check for records array in the response
    if (originalData && Array.isArray(originalData.records)) {
      return originalData.records;
    }
    
    // If it's already an array, return it
    if (Array.isArray(originalData)) {
      return originalData;
    }
    
    // If it's an object, look for arrays in its properties
    if (originalData && typeof originalData === 'object') {
      // Check for records property first
      if (originalData.records) {
        return originalData.records;
      }
      
      // Check for nested structures
      if (originalData.data?.records) {
        return originalData.data.records;
      }
      
      if (originalData.data?.webhook_execute_response?.records) {
        return originalData.data.webhook_execute_response.records;
      }
    }
    
    // If no records found, return empty array
    return [];
  };

  const testWebhook = async (config: WebhookConfig) => {
    const response = await WebhookService.executeWithRetry({
      ...config,
      isTestMode: true
    });
    
    if (!response || !response.data) {
      throw new Error('No data received from webhook endpoint');
    }
    
    return response.data;
  };

  const generateMappings = (records: any[], template: any): MappingSuggestion[] => {
    console.log('generateMappings input:', { records, template });
    
    if (!records.length || !template) {
      console.log('No records or template provided');
      return [];
    }
    
    const suggestions = webhookService.mappingService.suggestMappings(records[0], template)
      .map(mapping => {
        const suggestion = {
          sourceField: mapping.sourcePath,
          targetField: mapping.enviziField,
          transformation: mapping.transformation,
          confidence: mapping.confidence || 0,
          value: records[0]?.[mapping.sourcePath] || null
        };
        console.log('Generated mapping suggestion:', suggestion);
        return suggestion;
      });
    
    console.log('Final mapping suggestions:', suggestions);
    return suggestions;
  };

  const handleTest = async (config: WebhookConfig) => {
    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Test webhook and get response
      console.log('Testing webhook with config:', config);
      
      // Add authentication headers if enabled
      const headers: Record<string, string> = {};
      if (config.auth?.enabled && config.auth.key) {
        if (config.auth.type === 'bearer') {
          headers['Authorization'] = `Bearer ${config.auth.key}`;
        } else if (config.auth.type === 'api_key') {
          headers[config.auth.headerName || 'X-API-Key'] = config.auth.key;
        }
      }
      
      const webhookResponse = await WebhookService.executeWithRetry({
        ...config,
        headers: {
          ...config.headers,
          ...headers
        }
      });
      
      console.log('Webhook response:', webhookResponse);
      
      const records = extractRecordsFromResponse(webhookResponse);
      console.log('Extracted records:', records);
      
      if (!records || records.length === 0) {
        throw new Error('No records found in webhook response');
      }
      
      // Step 2: Fetch template
      console.log('Fetching template:', config.envizi_template);
      const templateResponse = await fetch(`/api/webhook/templates/${config.envizi_template}`);
      const templateData = await templateResponse.json();
      console.log('Template data:', templateData);
      
      if (!templateResponse.ok || !templateData.success) {
        throw new Error(templateData.error || 'Failed to fetch template');
      }
      
      const template = templateData.template;
      
      // Step 3: Generate mappings
      console.log('Generating mappings with template:', template);
      const mappings = generateMappings(records, template);
      console.log('Generated mappings:', mappings);
      
      // Step 4: Transform the data
      console.log('Starting data transformation');
      const transformedData = records.map(record => {
        const transformedRecord: Record<string, any> = {};
        template.fields.forEach((field: EnviziField) => {
          const mapping = mappings.find(m => m.targetField === field.name);
          console.log(`Processing field ${field.name}:`, {
            mapping,
            sourceValue: mapping ? record[mapping.sourceField] : undefined
          });
          if (mapping) {
            transformedRecord[field.name] = record[mapping.sourceField] || '';
          }
        });
        return transformedRecord;
      });
      console.log('Transformed data:', transformedData);
      
      // Set test result with transformed data
      setTestResult({
        success: true,
        originalData: webhookResponse,
        records: records,
        transformedData: transformedData,
        validationErrors: [],
        mappings: mappings
      });
      
      // Update the mappings state
      const updatedMappings = mappings.map(m => ({
        enviziField: m.targetField,
        sourcePath: m.sourceField,
        required: template.fields.find((f: TemplateField) => f.name === m.targetField)?.required || false,
        transformation: m.transformation
      }));
      console.log('Updated mappings:', updatedMappings);
      setMappings(updatedMappings);
      
    } catch (error) {
      console.error('Test failed:', error);
      setError({
        type: 'api',
        message: error instanceof Error ? error.message : 'Failed to test webhook'
      });
      setTestResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!config || !testResult?.transformedData) return;
    
    setLoading(true);
    try {
      // Final validation before sending to Envizi
      const response = await fetch('/api/webhook/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: testResult.transformedData,
          enviziConfig: config.envizi
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send data to Envizi');
      }
      
      const result = await response.json();
      if (result.success) {
        toast.success('Data sent to Envizi successfully');
      }
    } catch (error) {
      toast.error('Failed to send data to Envizi');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (newMappings: TemplateMapping[]) => {
    setMappings(newMappings);
    setConfig(prev => ({
      ...prev!,
      mapping: newMappings
    }));
  };

  const handleTransform = async () => {
    if (!config || !state.testResult?.originalData) return;
    
    setLoading(true);
    try {
      const transformedResult = await webhookService.transformData(
        state.testResult.originalData,
        state.mappings,
        config.envizi_template
      );

      setState(prev => ({
        ...prev,
        transformedData: transformedResult.transformedData || null,
        validationErrors: transformedResult.validationErrors
      }));
    } catch (error) {
      console.error('Transformation failed:', error);
      setError({
        type: 'transformation',
        message: error instanceof Error ? error.message : 'Transformation failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMapping = async (mappings: any[]) => {
    if (!state.testResult?.originalData) return;
    
    try {
      const dataToTransform = state.testResult.originalData?.data?.webhook_execute_response?.records;
      if (!dataToTransform) {
        console.error('No records found in webhook response');
        return;
      }

      const transformedResult = await webhookService.transformData(
        dataToTransform,           // records array
        config!.mapping,           // mappings
        config!.envizi_template    // template type
      );

      setState(prev => ({
        ...prev,
        testResult: {
          ...prev.testResult!,
          transformedData: transformedResult.transformedData || null,
          validationErrors: transformedResult.validationErrors
        }
      }));
    } catch (error) {
      console.error('Error transforming data:', error);
    }
  };

  const handleSchedulerToggle = async (enabled: boolean) => {
    setSchedulerEnabled(enabled);
    if (config) {
      const updatedConfig = {
        ...config,
        scheduler: {
          ...config.scheduler,
          enabled,
          interval: schedulerInterval
        }
      };
      setConfig(updatedConfig);
      
      try {
        await webhookService.updateScheduler(config.id!, enabled);
      } catch (error) {
        console.error('Failed to update scheduler:', error);
      }
    }
  };

  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/webhook/parse-template', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to parse template');
      }
      
      const result = await response.json();
      if (result.success) {
        // Update config with template fields and mappings
        setConfig(prev => ({
          ...prev!,
          uploadedFile: file,
          envizi_template: result.templateName,
          mapping: result.fields.map((field: any) => ({
            enviziField: field.name,
            sourcePath: field.name, // Default to same field name
            required: field.required,
            transformation: {
              type: 'direct'
            }
          }))
        }));

        // Set initial test result with sample data
        setTestResult({
          success: true,
          originalData: result.sampleData,
          records: result.sampleData,
          transformedData: [],
          validationErrors: []
        });

        toast.success('Template parsed successfully');
      } else {
        throw new Error(result.error || 'Failed to parse template');
      }
    } catch (error) {
      console.error('Template upload error:', error);
      toast.error('Failed to parse template');
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(prev => ({
      ...prev!,
      envizi_template: e.target.value
    }));
  };

  const handleTemplatePreview = () => {
    // Implementation of handleTemplatePreview
  };

  const ProgressIndicator = () => (
    <div className={styles.progress}>
      <InlineLoading
        description={getLoadingDescription()}
        status={error ? 'error' : loading ? 'active' : 'finished'}
      />
    </div>
  );

  const getLoadingDescription = () => {
    if (loadingStates.testing) return 'Testing webhook...';
    if (loadingStates.transforming) return 'Transforming data...';
    if (loadingStates.executing) return 'Executing webhook...';
    if (loadingStates.saving) return 'Saving changes...';
    return 'Loading...';
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className={styles.webhookDetail}>
      <h2>Webhook Configuration</h2>

      {/* Step 1: Basic Configuration */}
      <section className={styles.section}>
        <h3>Basic Configuration</h3>
        <TextInput
          id="webhook-name"
          labelText="Name"
          value={config?.name ?? ''}
          onChange={e => setConfig(prev => ({...prev!, name: e.target.value}))}
        />
        <TextInput
          id="webhook-desc"
          labelText="Description"
          value={config?.desc ?? ''}
          onChange={e => setConfig(prev => ({...prev!, desc: e.target.value}))}
        />
        <TextInput
          id="webhook-endpoint"
          labelText="Endpoint"
          placeholder="https://api.electricitymap.org/v3/carbon-intensity/latest?zone=IN"
          value={config?.endpoint ?? process.env.NEXT_PUBLIC_WEBHOOK_DEFAULT_ENDPOINT ?? ''}
          onChange={e => setConfig(prev => ({...prev!, endpoint: e.target.value}))}
        />
        
        {/* Authentication Section */}
        <div className={styles.authSection}>
          <Toggle
            id="auth-toggle"
            labelText="Enable Authentication"
            toggled={config?.auth?.enabled ?? false}
            onToggle={(enabled) => {
              setConfig(prev => ({
                ...prev!,
                auth: {
                  ...prev?.auth,
                  enabled: enabled,
                  type: prev?.auth?.type || 'api_key',
                  key: prev?.auth?.key || ''
                }
              }));
            }}
          />
          
          {config?.auth?.enabled && (
            <form 
              className={styles.authForm}
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <Select
                id="auth-type"
                labelText="Authentication Type"
                value={config?.auth?.type}
                onChange={(e) => {
                  setConfig(prev => ({
                    ...prev!,
                    auth: {
                      ...prev!.auth!,
                      type: e.target.value as 'bearer' | 'api_key',
                      headerName: e.target.value === 'api_key' ? 'auth-token' : undefined
                    }
                  }));
                }}
              >
                <SelectItem value="bearer" text="Bearer Token" />
                <SelectItem value="api_key" text="API Key" />
              </Select>

              {config?.auth?.type === 'api_key' && (
                <>
                  <Select
                    id="auth-header-type"
                    labelText="Header Name"
                    value={COMMON_API_KEY_HEADERS.includes(config.auth.headerName as ApiKeyHeaderName) ? config.auth.headerName : 'custom'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConfig(prev => ({
                        ...prev!,
                        auth: {
                          ...prev!.auth!,
                          headerName: value === 'custom' ? '' : value
                        }
                      }));
                    }}
                  >
                    {COMMON_API_KEY_HEADERS.map(header => (
                      <SelectItem key={header} value={header} text={header} />
                    ))}
                    <SelectItem value="custom" text="Custom Header Name" />
                  </Select>

                  {(!config.auth.headerName || config.auth.headerName === 'custom' || !COMMON_API_KEY_HEADERS.includes(config.auth.headerName as ApiKeyHeaderName)) && (
                    <TextInput
                      id="auth-header-name-custom"
                      labelText="Custom Header Name"
                      value={config.auth.headerName || ''}
                      placeholder="Enter custom header name"
                      onChange={(e) => {
                        setConfig(prev => ({
                          ...prev!,
                          auth: {
                            ...prev!.auth!,
                            headerName: e.target.value
                          }
                        }));
                      }}
                    />
                  )}
                </>
              )}

              <TextInput
                id="auth-key"
                labelText={config?.auth?.type === 'bearer' ? 'Bearer Token' : 'API Key'}
                type="password"
                autoComplete="current-password"
                value={config?.auth?.key ?? ''}
                placeholder="IEpdDjobJrYW0EbJsJua"
                onChange={(e) => {
                  setConfig(prev => ({
                    ...prev!,
                    auth: {
                      ...prev!.auth!,
                      key: e.target.value
                    }
                  }));
                }}
              />
            </form>
          )}
        </div>
      </section>

      {/* Step 2: Template Configuration */}
      <section className={styles.section}>
        <h3>Template Configuration</h3>
        <div className={styles.templateControls}>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleTemplateUpload}
          />
          {config?.envizi_template && (
            <Button 
              kind="ghost" 
              onClick={handleTemplatePreview}
            >
              Preview Template Structure
            </Button>
          )}
        </div>
      </section>

      {/* Step 3: Test and Preview */}
      <section className={styles.section}>
        <h3>Test and Preview</h3>
        <div className={styles.controls}>
          <Button onClick={() => handleTest(config!)}>
            Test Webhook
          </Button>
        </div>

        {loading && <Loading description="Loading preview..." />}
        
        {error && (
          <div className={styles.validationError}>
            {error.message}
          </div>
        )}

        {testResult && (
          <DataPreviewSection
            loading={loading}
            testResult={testResult}
            config={config}
          />
        )}
      </section>

      {/* Step 4: Execute to Envizi */}
      {state.transformedData && state.transformedData.length > 0 && (
        <section className={styles.section}>
          <h3>Execute to Envizi</h3>
          <Button 
            onClick={handleExecute}
            kind="primary"
          >
            Execute to Envizi
          </Button>
        </section>
      )}

      {/* Scheduler (Optional) */}
      <section className={styles.section}>
        <h3>Scheduler (Optional)</h3>
        <WebhookScheduler
          enabled={schedulerEnabled}
          interval={schedulerInterval}
          onToggle={handleSchedulerToggle}
          onIntervalChange={setSchedulerInterval}
          lastRun={config?.scheduler?.lastRun}
          nextRun={config?.scheduler?.nextRun}
        />
      </section>
    </div>
  );
}

const TemplateSection: React.FC<Props> = ({
  config,
  availableTemplates,
  handleTemplateChange,
  handleTemplateUpload,
  handleTemplatePreview
}) => (
  <div className={styles.templateSection}>
    <h3>Template Configuration</h3>
    <div className={styles.templateControls}>
      <Select
        id="template-select"
        labelText="Select Template"
        value={config?.envizi_template}
        onChange={handleTemplateChange}
      >
        {availableTemplates.map(template => (
          <SelectItem key={template} value={template} text={template} />
        ))}
      </Select>
      
      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={handleTemplateUpload}
      />
      
      <Button 
        kind="ghost" 
        onClick={handleTemplatePreview}
        disabled={!config?.envizi_template}
      >
        Preview Template Structure
      </Button>
    </div>
  </div>
);

const DataPreviewSection: React.FC<DataPreviewProps> = React.memo(({ loading, testResult, config }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [transformedData, setTransformedData] = useState<any[]>(testResult?.transformedData || []);

  useEffect(() => {
    if (!testResult?.records) return;
    
    const dataWithIds = testResult.records.map((record, index) => ({
      id: String(index),
      ...record
    }));
    setPreviewData(dataWithIds);
    setTransformedData(testResult.transformedData || []);
  }, [testResult?.records, testResult?.transformedData]);

  const handleTransformedDataChange = (newData: any[]) => {
    setTransformedData(newData);
  };

  const handleSendToEnvizi = async () => {
    try {
      const response = await fetch('/api/webhook/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: transformedData,
          enviziConfig: config?.envizi
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send data to Envizi');
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Data sent to Envizi successfully');
      } else {
        throw new Error(result.error || 'Failed to send data to Envizi');
      }
    } catch (error) {
      console.error('Error sending to Envizi:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send data to Envizi');
    }
  };

  if (loading) {
    return <Loading description="Loading preview..." />;
  }

  if (!previewData || previewData.length === 0) {
    return <EmptyStateMessage 
      title="No data to preview" 
      subtitle="Test the webhook to preview data" 
    />;
  }

  const headers = Object.keys(previewData[0])
    .filter(key => key !== 'id')
    .map(key => ({
      key,
      header: key
    }));

  return (
    <div className={styles.previewSection}>
      <Tabs>
        <TabList aria-label="Data Preview Tabs">
          <Tab>Raw Data</Tab>
          <Tab>Mapped Data</Tab>
          <Tab>Validation</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className={styles.tableContainer}>
              <Table>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader key={header.key}>{header.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((row) => (
                    <TableRow key={row.id}>
                      {headers.map((header) => (
                        <TableCell key={`${row.id}-${header.key}`}>
                          {row[header.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabPanel>
          <TabPanel>
            <div className={styles.mappedDataControls}>
              <Button
                onClick={handleSendToEnvizi}
                kind="primary"
                disabled={!transformedData || transformedData.length === 0}
              >
                Send to Envizi
              </Button>
            </div>
            <WebhookPreview 
              data={transformedData}
              mappings={config?.mapping || []}
              templateType={config?.envizi_template || ''}
              onDataChange={handleTransformedDataChange}
            />
          </TabPanel>
          <TabPanel>
            <ValidationResults 
              errors={testResult?.validationErrors || []}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
});

// Replace EmptyState usage with custom component
const EmptyStateMessage = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className={styles.emptyState}>
    <h4>{title}</h4>
    <p>{subtitle}</p>
  </div>
); 