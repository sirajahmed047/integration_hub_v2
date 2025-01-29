'use client';

import React, { useState, useEffect } from 'react';
import { WebhookService } from '../../services/WebhookService';
import WebhookConfig from '../../interfaces/WebhookConfig';
import {
  TextInput,
  Button,
  Grid,
  Column,
  Loading,
  TextArea
} from '@carbon/react';

export default function WebhookDetail() {
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const webhookService = new WebhookService(process.env.NEXT_PUBLIC_API_URL || '');

  useEffect(() => {
    // Load existing config if editing
    const queryParams = new URLSearchParams(window.location.search);
    const id = queryParams.get('id');
    if (id) {
      loadConfig(id);
    }
  }, []);

  const loadConfig = async (id: string) => {
    setLoading(true);
    try {
      // Load config from backend
      const response = await fetch(`/api/webhooks/${id}`);
      const data = await response.json();
      setConfig(data);
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
      await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
    } catch (error) {
      console.error('Failed to save webhook config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!config) return;
    
    setLoading(true);
    try {
      // For test mode
      const testConfig = { ...config, isTestMode: true };
      const result = await webhookService.executeWebhook(testConfig);
      setTestResult(result);
      console.log('Webhook test result:', result);
    } catch (error: any) {
      console.error('Webhook test failed:', error);
      setTestResult({ error: error?.message || 'Unknown error occurred' });
    } finally {
      setLoading(false);
    }
  };

  // Add separate handler for production execution
  const handleExecute = async () => {
    if (!config) return;
    
    setLoading(true);
    try {
      // Ensure test mode is disabled for production
      const prodConfig = { ...config, isTestMode: false };
      const result = await webhookService.executeWebhook(prodConfig);
      setTestResult(result);
      console.log('Webhook execution result:', result);
    } catch (error: any) {
      console.error('Webhook execution failed:', error);
      setTestResult({ error: error?.message || 'Unknown error occurred' });
    } finally {
      setLoading(false);
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
          value={config?.name || ''}
          onChange={e => setConfig(prev => ({...prev!, name: e.target.value}))}
        />

        <TextInput
          id="webhook-name"
          labelText="Endpoint"
          value={config?.endpoint || ''}
          onChange={e => setConfig(prev => ({...prev!, endpoint: e.target.value}))}
        />

        <TextInput 
          id="webhook-name"
          labelText="Envizi API Key"
          type="password"
          value={config?.envizi.apiKey || ''}
          onChange={e => setConfig(prev => ({
            ...prev!,
            envizi: {...prev!.envizi, apiKey: e.target.value}
          }))}
        />

        {/* Add more fields for mapping configuration */}

        <div style={{ marginTop: '1rem' }}>
          <Button onClick={handleSave}>Save</Button>
          <Button onClick={handleTest}>Test Webhook</Button>
          <Button 
            onClick={handleExecute}
            disabled={!config?.envizi.apiKey} // Disable if no API key
            style={{ marginLeft: '1rem' }}
          >
            Execute Webhook
          </Button>
        </div>
      </Column>
    </Grid>
  );
} 