'use client';

import React, { useState, useEffect } from 'react';
import { WebhookService } from '../../services/WebhookService';
import { 
  WebhookConfig, 
  TemplateMapping, 
  EnviziTemplate,
  EnviziField,
  EnviziTemplateType
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
  InlineLoading
} from '@carbon/react';
import  ApiUtility from '../../components/ApiUtility/ApiUtility';
import { WebhookPreview } from '../../components/WebhookPreview';
import { WebhookTemplateUtility } from '../../utils/WebhookTemplateUtility';
import { WebhookError } from '../../components/WebhookError';
import { WebhookScheduler } from '../../components/WebhookScheduler';
import { WebhookStatusBadge } from '../../components/WebhookStatusBadge';
import { WebhookMetrics } from '../../components/WebhookMetrics';
import styles from './styles.module.css';
import { WebhookHistory } from '../../components/WebhookHistory';
import { TemplateUploader } from '../../components/TemplateUploader';
import { templateStore } from '../../types/webhook';
import { ValidationResults } from '../../components/ValidationResults';
import { toast } from 'react-hot-toast';

interface WebhookMetrics {
  totalExecutions: number;
  lastExecutionTime: string;
  lastRunStatus?: string;
  successfulExecutions: number;
  failedExecutions: number;
  totalRecordsProcessed: number;
  averageExecutionTime?: number;
}

interface TestResult {
  success: boolean;
  originalData: any;
  records: any[];
  transformedData: any[];
  validationErrors: string[];
}

interface Props {
  config: WebhookConfig | null;
  availableTemplates: string[];
  handleTemplateChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleTemplateUpload: (template: EnviziTemplate) => void;
  handleTemplatePreview: () => void;
}

interface DataPreviewProps {
  loading: boolean;
  testResult: TestResult | null;
  config: WebhookConfig | null;
}

interface WebhookState {
  testResult: {
    originalData: any;
    success: boolean;
    data: any[];
    validationErrors: string[];
  } | null;
  webhookRecords: any[];
  loading: boolean;
  error: any;
  status: 'inactive' | 'active' | 'error' | 'running' | 'success';
  mappings: TemplateMapping[];
  transformedData: any[] | null;
  validationErrors: string[];
}

export default function WebhookDetail() {
  const [config, setConfig] = useState<WebhookConfig | null>({
    name: '',
    desc: '',
    endpoint: process.env.NEXT_PUBLIC_WEBHOOK_DEFAULT_ENDPOINT || '',
    method: 'GET',
    envizi_template: 'POC',
    data_template_type: '1-single',
    headers: {},
    envizi: {
      apiKey: '',
      endpoint: '',
      organizationId: ''
    },
    mapping: [],
    scheduler: {
      enabled: false,
      interval: 60
    }
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [enviziTemplates] = useState<EnviziTemplateType[]>(['POC']);
  const webhookService = new WebhookService(process.env.NEXT_PUBLIC_API_URL || '');
  const apiUtility = new ApiUtility();
  const [webhookRecords, setWebhookRecords] = useState<any[]>([]);
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [schedulerInterval, setSchedulerInterval] = useState(60); // 60 minutes default
  const [error, setError] = useState<{
    type: 'api' | 'validation' | 'transformation';
    message: string;
  } | null>(null);
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive' | 'error' | 'running' | 'success'>('inactive');
  const [historyEntries, setHistoryEntries] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState<string[]>(
    Object.keys(templateStore.templates)
  );

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
        envizi_template: 'POC',
        data_template_type: '1-single',
        headers: {},
        envizi: {
          apiKey: '',
          endpoint: '',
          organizationId: ''
        },
        mapping: [], // Will be populated with TemplateMapping objects
        scheduler: {
          enabled: false,
          interval: 60
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
        // Initialize with template fields if none exist
        if (!configData.data.fields || configData.data.fields.length === 0) {
          configData.data.fields = WebhookTemplateUtility.createEmptyFields();
        }
        
        setConfig(configData.data);
        setMappings(configData.data.mapping || []);
        
        // Set scheduler state
        setSchedulerEnabled(schedulerResponse.enabled || false);
        setSchedulerInterval(schedulerResponse.interval || 60);
      }
    } catch (error) {
      console.error('Failed to load webhook config:', error);
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
        envizi_template: config.envizi_template || 'POC',  // Ensure this is set
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

  const handleTest = async () => {
    if (!config) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await webhookService.testWebhook(config);
      console.log('Test result:', result); // Debug log
      
      setTestResult(result);
      setWebhookRecords(result.records);
      
      // Show preview after successful test
      if (result.transformedData?.length > 0) {
        setShowPreview(true);
      }
    } catch (error: any) {
      setError({
        type: 'api',
        message: error.message || 'Failed to test webhook'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate before execution
      if (!config?.envizi?.endpoint || !config?.envizi?.apiKey) {
        throw new Error('Missing Envizi configuration');
      }

      // Execute webhook
      const result = await webhookService.executeWebhook({
        ...config!,
        isTestMode: false
      });

      // Transform data
      const transformedResult = await webhookService.transformData(
        config!,
        result.originalData
      );

      if (transformedResult.validationErrors.length > 0) {
        setError({
          type: 'validation',
          message: `Validation errors: ${transformedResult.validationErrors.join(', ')}`
        });
        return;
      }

      // Send to Envizi
      await webhookService.sendToEnvizi(
        transformedResult.data,
        config!.envizi
      );

      // Update status
      setStatus('success');
      setMetrics((prev: WebhookMetrics | null) => ({
        totalExecutions: (prev?.totalExecutions || 0) + 1,
        successfulExecutions: (prev?.successfulExecutions || 0) + 1,
        failedExecutions: prev?.failedExecutions || 0,
        totalRecordsProcessed: prev?.totalRecordsProcessed || 0,
        lastExecutionTime: new Date().toISOString(),
        lastRunStatus: 'success',
        averageExecutionTime: prev?.averageExecutionTime || 0
      }));

    } catch (error) {
      console.error('Execution failed:', error);
      setError({
        type: 'api',
        message: error instanceof Error ? error.message : 'Execution failed'
      });
      setStatus('error');
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
        {
          ...config,
          mapping: state.mappings
        },
        state.testResult.originalData
      );

      if (transformedResult.success) {
        setState(prev => ({
          ...prev,
          transformedData: transformedResult.data || null,
          validationErrors: transformedResult.validationErrors
        }));
      }
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
    console.log('Auto-applying mappings');
    
    if (!state.testResult?.originalData) {
        console.error('No data to transform');
        return;
    }
    
    // Transform the data automatically
    try {
        const dataToTransform = state.testResult.originalData?.data?.webhook_execute_response?.records;
        console.log('Data to transform:', dataToTransform);

        if (!dataToTransform) {
            console.error('No records found in webhook response');
            return;
        }

        // Auto-map the data based on field names
        const transformedResult = await webhookService.transformData(
            config!,
            dataToTransform
        );

        setState(prev => ({
            ...prev,
            testResult: {
                ...prev.testResult!,
                transformedData: transformedResult.data || null,
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

  const handleTemplateUpload = (template: EnviziTemplate) => {
    // Add template to store
    templateStore.addTemplate(template);
    
    // Update available templates
    setAvailableTemplates(Object.keys(templateStore.templates));
    
    // Optionally switch to new template
    setConfig(prev => ({
      ...prev!,
      envizi_template: template.name
    }));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(prev => ({
      ...prev!,
      envizi_template: e.target.value as EnviziTemplateType
    }));
  };

  const handleTemplatePreview = () => {
    // Implementation of handleTemplatePreview
  };

  const extractRecordsFromResponse = (originalData: any): any[] => {
    if (originalData && originalData.data && originalData.data.webhook_execute_response) {
      return originalData.data.webhook_execute_response.records || [];
    }
    return [];
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
          value={config?.endpoint ?? process.env.NEXT_PUBLIC_WEBHOOK_DEFAULT_ENDPOINT ?? ''}
          onChange={e => setConfig(prev => ({...prev!, endpoint: e.target.value}))}
        />
      </section>

      {/* Step 2: Template Configuration */}
      <section className={styles.section}>
        <h3>Template Configuration</h3>
        <div className={styles.templateControls}>
          <TemplateUploader 
            onTemplateLoad={handleTemplateUpload}
            currentTemplate={config?.envizi_template}
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
          <Button onClick={handleTest}>
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
      
      <TemplateUploader 
        onTemplateLoad={handleTemplateUpload}
        currentTemplate={config?.envizi_template}
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

const DataPreviewSection: React.FC<DataPreviewProps> = ({ loading, testResult, config }) => {
  const [previewData, setPreviewData] = useState(testResult?.transformedData || []);
  const [sending, setSending] = useState(false);
  const webhookService = new WebhookService();

  useEffect(() => {
    if (testResult?.transformedData) {
      setPreviewData(testResult.transformedData);
    }
  }, [testResult]);

  const handleMappedDataChange = (newData: any[]) => {
    setPreviewData(newData);
  };

  const handleSendToEnvizi = async () => {
    if (!config?.envizi || !previewData.length) return;
    
    setSending(true);
    try {
      await webhookService.sendToEnvizi(previewData, config.envizi);
      // Show success message
      toast.success('Data sent to Envizi successfully');
    } catch (error) {
      console.error('Failed to send to Envizi:', error);
      toast.error('Failed to send data to Envizi');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.previewSection}>
      <h3>Data Preview</h3>
      {loading ? (
        <Loading description="Loading preview..." />
      ) : (testResult?.records ?? []).length > 0 ? (
        <>
          <Tabs>
            <TabList aria-label="Data Preview Tabs">
              <Tab>Raw Data</Tab>
              <Tab>Mapped Data</Tab>
              <Tab>Validation</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <WebhookPreview
                  data={testResult!.originalData}
                  mappings={[]}
                  templateType={config?.envizi_template || 'POC'}
                />
              </TabPanel>
              <TabPanel>
                <WebhookPreview
                  data={previewData}
                  mappings={config?.mapping || []}
                  templateType={config?.envizi_template || 'POC'}
                  onDataChange={handleMappedDataChange}
                />
              </TabPanel>
              <TabPanel>
                <ValidationResults errors={testResult!.validationErrors} />
              </TabPanel>
            </TabPanels>
          </Tabs>
          {previewData.length > 0 && config?.envizi && (
            <Button
              className={styles.sendButton}
              onClick={handleSendToEnvizi}
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send to Envizi'}
            </Button>
          )}
        </>
      ) : (
        <EmptyStateMessage
          title="No data to preview"
          subtitle="Click 'Test Webhook' to fetch data"
        />
      )}
    </div>
  );
};

// Replace EmptyState usage with custom component
const EmptyStateMessage = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className={styles.emptyState}>
    <h4>{title}</h4>
    <p>{subtitle}</p>
  </div>
); 