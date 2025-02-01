'use client';

import React, { useState, useEffect } from 'react';
import { WebhookService } from '../../services/WebhookService';
import { WebhookConfig, TemplateMapping, EnviziTemplateType } from '../../types/webhook';
import {
  TextInput,
  Button,
  Grid,
  Column,
  Loading,
  TextArea,
  Select,
  SelectItem
} from '@carbon/react';
import { WebhookFieldMapper } from '@/components/WebhookFieldMapper';
import  ApiUtility from '../../components/ApiUtility/ApiUtility';
import { WebhookPreview } from '../../components/WebhookPreview';

export default function WebhookDetail() {
  const [config, setConfig] = useState<WebhookConfig | null>({
    name: '',
    desc: '',
    endpoint: process.env.NEXT_PUBLIC_WEBHOOK_DEFAULT_ENDPOINT || '',
    method: 'POST',
    envizi_template: 'POC',
    data_template_type: '1-single',
    headers: {},
    envizi: {
      apiKey: '',
      endpoint: '',
      organizationId: ''
    },
    mapping: []
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [enviziTemplates] = useState<EnviziTemplateType[]>(['POC']);
  const webhookService = new WebhookService(process.env.NEXT_PUBLIC_API_URL || '');
  const apiUtility = new ApiUtility();

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
        method: 'POST',
        envizi_template: 'POC',
        data_template_type: '1-single',
        headers: {},
        envizi: {
          apiKey: '',
          endpoint: '',
          organizationId: ''
        },
        mapping: [] // Will be populated with TemplateMapping objects
      });
    }
  }, []);

  const loadConfig = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/webhook/detail?id=${id}`);
      console.log('Loading webhook detail for ID:', id);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded webhook data:', data);
      
      if (data && data.data) {
        setConfig(data.data);
        setMappings(data.data.mapping || []);
      } else {
        console.error('Invalid webhook data format:', data);
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
        envizi_template: config.envizi_template || 'POC'  // Ensure this is set
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
    try {
      const result = await webhookService.executeWebhook({
        ...config!,
        isTestMode: true
      });

      setTestResult(result);
      
      // Show validation errors if any
      if (result.validationErrors && result.validationErrors.length > 0) {
        console.error('Validation errors:', result.validationErrors);
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  const handleExecute = async () => {
    try {
      // Execute webhook with Envizi integration
      const result = await webhookService.executeWebhook({
        ...config!,
        isTestMode: false
      });

      console.log('Execution complete:', result);
    } catch (error) {
      console.error('Execution failed:', error);
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
    if (!config || !testResult?.originalData) return;
    
    setLoading(true);
    try {
      const transformedResult = await webhookService.transformData(
        {
          ...config,
          mapping: mappings
        },
        testResult.originalData
      );

      if (transformedResult.success) {
        setTestResult((prev: typeof testResult) => ({
          ...prev!,
          transformedData: transformedResult.data,
          validationErrors: transformedResult.validationErrors
        }));
      }
    } catch (error) {
      console.error('Transformation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMapping = async (mappings: any[]) => {
    console.log('Applying mappings:', mappings);
    
    if (!testResult?.originalData) {
        console.error('No data to transform. Please click Test first to fetch data.');
        return;
    }
    
    // Update the config with new mappings
    const updatedConfig = {
        ...config!,
        mapping: mappings,
        fields: mappings
    };
    
    setConfig(updatedConfig);

    // Transform the data with new mappings
    try {
        const transformedResult = await webhookService.transformData(
            updatedConfig,
            testResult.originalData
        );
        
        // Ensure transformed data is always an array
        const transformedArray = Array.isArray(transformedResult.data) 
            ? transformedResult.data 
            : [transformedResult.data];
        
        console.log('Transformed data with mappings:', transformedArray);
        setTestResult({
            ...testResult,
            transformedData: transformedArray
        });
    } catch (error) {
        console.error('Transform failed:', error);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Grid>
      <Column lg={16} md={8} sm={4}>
        <h1>Webhook Configuration</h1>
        
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

        <Select
          id="webhook-template"
          labelText="Envizi Template"
          value={config?.envizi_template ?? 'POC'}
          onChange={e => setConfig(prev => ({
            ...prev!,
            envizi_template: e.target.value as EnviziTemplateType
          }))}
        >
          {enviziTemplates.map(template => (
            <SelectItem key={template} value={template} text={template} />
          ))}
        </Select>

        <TextInput
          id="webhook-endpoint"
          labelText="Endpoint"
          value={config?.endpoint ?? process.env.NEXT_PUBLIC_WEBHOOK_DEFAULT_ENDPOINT ?? ''}
          onChange={e => setConfig(prev => ({...prev!, endpoint: e.target.value}))}
        />

        {testResult?.originalData && (
          <WebhookFieldMapper
            apiData={testResult.originalData}
            onChange={handleMappingChange}
            onTransform={handleTransform}
            onApplyMapping={handleApplyMapping}
            initialMappings={config?.mapping}
            templateType={config?.envizi_template || 'POC'}
          />
        )}

        {testResult?.transformedData && (
          <WebhookPreview 
            data={testResult.transformedData}
            mappings={config?.mapping || []}
            templateType={config?.envizi_template || 'POC'}
          />
        )}

        {testResult?.validationErrors && testResult.validationErrors.length > 0 && (
          <div className="validation-errors">
            <h4>Validation Errors:</h4>
            <ul>
              {testResult.validationErrors.map((error: string, index: number) => (
                <li key={index} style={{ color: 'red' }}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="button-group">
          <Button onClick={handleTest}>
            Test Webhook
          </Button>
          
          <Button 
            onClick={handleExecute}
            disabled={!testResult?.transformedData}
          >
            Execute to Envizi
          </Button>
        </div>
      </Column>
    </Grid>
  );
} 